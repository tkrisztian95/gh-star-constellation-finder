## 1. Storage Layer Rewrite

- [x] 1.0 Add `@types/bun` to devDependencies so `tsc --noEmit` can resolve the `bun:sqlite` module declaration (no runtime impact)
- [x] 1.1 Replace the JSON-backed body of `src/cache/analysisCache.ts` with a `bun:sqlite` implementation: open the DB, run `CREATE TABLE IF NOT EXISTS entries (key TEXT PRIMARY KEY, category TEXT NOT NULL, killer_feature TEXT NOT NULL, data_quality TEXT, updated_at INTEGER NOT NULL) WITHOUT ROWID;` and `PRAGMA user_version = 1; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`
- [x] 1.2 Update `DEFAULT_CACHE_PATH` from `.cache/analysis.json` to `.cache/analysis.db`; `cacheKey()` stays unchanged
- [x] 1.3 Implement `cache.get(repoId, readme)` using a prepared `SELECT category, killer_feature, data_quality FROM entries WHERE key = ?` statement; map the row (or `undefined`) to `AnalysisResult | null`
- [x] 1.4 Implement `cache.saveEntry(repoId, readme, result)` using a prepared `INSERT OR REPLACE INTO entries (key, category, killer_feature, data_quality, updated_at) VALUES (?, ?, ?, ?, ?)` statement; remove the `writeQueue` Promise chain since SQLite serializes writes
- [x] 1.5 Implement `cache.size` via a prepared `SELECT COUNT(*) FROM entries` statement queried on each access (correctness over micro-optimization; tests + diagnostics read it infrequently)
- [x] 1.6 On any error opening the DB or reading the schema, log a `warn` with the path + error, rename the file to `<path>.broken.<timestamp>`, and reopen with a fresh schema — yielding an empty in-memory cache without crashing

## 2. Call-site Verification

- [ ] 2.1 Confirm `src/orchestration/analysis.ts` and `src/cli/modes.ts` continue to compile and behave unchanged against the new implementation — the `AnalysisCache` interface is the only contract they depend on
- [ ] 2.2 Confirm `src/orchestration/main.tsx` `loadCache()` / `--no-cache` wiring needs no edits

## 3. Tests

- [ ] 3.1 Rewrite `src/__tests__/analysisCache.test.ts` Test 1 (file written with v1 schema) to open the SQLite file directly via `bun:sqlite`, assert the `entries` table exists, the `PRAGMA user_version` is `1`, and the row carries the expected `key`, `category`, `killer_feature`, `data_quality`, and a non-null `updated_at`
- [ ] 3.2 Rewrite Test 3 (corrupt-file recovery) to write garbage bytes to `<dir>/analysis.db`, call `loadCache()`, assert `size === 0`, assert the broken file was moved to `<dir>/analysis.db.broken.<timestamp>` (glob-match the suffix), and assert the cache is writable afterward
- [ ] 3.3 Keep Tests 2 (content-based invalidation), 4 (missing file), 5 (cache hit short-circuits analyzer), 6 (`--no-cache` forces re-analysis), 7 (fresh result persisted) structurally identical — only the on-disk path string changes
- [ ] 3.4 Add a new test: ten concurrent `saveEntry()` calls against the same cache instance all succeed, the final `size` is 10, and the reloaded cache reads back all ten entries — confirms the `writeQueue` removal is safe

## 4. Verification

- [ ] 4.1 `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` all clean
- [ ] 4.2 Manually delete `.cache/analysis.db`, run the tool once, confirm the DB is created with the expected rows (spot-check with `sqlite3 .cache/analysis.db 'SELECT count(*) FROM entries;'`)
- [ ] 4.3 Re-run without `--no-cache` and confirm no AI API calls are made
- [ ] 4.4 Re-run with `--no-cache` and confirm all repos are re-analyzed and the DB is updated
- [ ] 4.5 Corrupt `.cache/analysis.db` (e.g. `echo bad > .cache/analysis.db`) and confirm the tool starts cleanly with a warning, the broken file is preserved as `.cache/analysis.db.broken.<timestamp>`, and a fresh DB is created
