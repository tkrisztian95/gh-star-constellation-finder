Tracks #19

## Why

The analysis cache shipped in #9 as a single JSON file at `.cache/analysis.json`. Every `saveEntry()` serializes the entire in-memory map and rewrites the whole file (tmp + rename). That is O(n) on the number of cached entries per save, and the on-disk format gives us no atomic per-row updates, no schema versioning, and no way to query the cache.

Swapping the storage layer to **`bun:sqlite`** (built into Bun, zero new dependencies) keeps the public `AnalysisCache` interface unchanged while making every write a single prepared `INSERT OR REPLACE`, giving us atomic transactions, WAL-mode crash safety, and a real schema we can evolve.

## What Changes

- Replace the JSON file at `.cache/analysis.json` with a SQLite database at `.cache/analysis.db`, accessed via `bun:sqlite` (no new npm dependencies).
- Keep the `AnalysisCache` interface (`get`, `saveEntry`, `size`) unchanged — call sites in `src/orchestration/analysis.ts` and `src/cli/modes.ts` do not move.
- Each `saveEntry()` becomes a single `INSERT OR REPLACE` against an `entries` table, replacing the whole-file rewrite. The internal `writeQueue` mutex is removed because SQLite serializes writes itself.
- Use WAL journal mode and a `PRAGMA user_version` schema marker so future schema migrations are possible.
- On a corrupt or unreadable database, rename the file to `.cache/analysis.db.broken` and open a fresh empty store, mirroring the existing "warn and continue" behavior.

## Breaking changes

- **Existing `.cache/analysis.json` is abandoned.** The new code path never reads or migrates it. First run after the swap re-populates `.cache/analysis.db` from scratch (one full re-analysis). This is acceptable because the cache is reproducible and the project is pre-1.0. The proposal does *not* delete the old file — users can remove `.cache/analysis.json` manually, and `.cache/` is gitignored either way.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `analysis-cache`: storage backend swaps from JSON file to SQLite (`.cache/analysis.db`), accessed via `bun:sqlite`. Behavior (content-addressed by repoId + SHA-256 of README, `--no-cache` bypass, graceful recovery from corruption) is preserved; only the underlying file format and write strategy change.

## Impact

- `src/cache/analysisCache.ts`: rewrite the implementation around `bun:sqlite`. Module surface (`loadCache`, `cacheKey`, `AnalysisCache`, `DEFAULT_CACHE_PATH`) stays the same; the default path moves to `.cache/analysis.db`.
- `src/__tests__/analysisCache.test.ts`: replace the JSON-file assertions (Test 1 reads the file with `JSON.parse`, Test 3 writes garbage JSON) with SQLite-level assertions (rows in the `entries` table, corrupt-DB recovery via rename). Behavioral tests (cache hit short-circuits analyzer, `--no-cache` forces re-analysis, content-based invalidation) stay structurally identical.
- `.gitignore`: no change — `.cache/` already covers the new file.
- `package.json`: no new dependencies; `bun:sqlite` is part of the Bun runtime.
- README / docs: no mention of `.cache/analysis.json` exists outside the archived change folder, so no doc updates are needed in the main tree.
