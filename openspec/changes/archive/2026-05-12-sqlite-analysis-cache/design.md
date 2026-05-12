## Context

The current cache (shipped in #9, archived as `2026-05-12-cache-analysis-results`) persists analysis results as a single JSON object on disk. The file is loaded once at startup into a `Map<string, Entry>` and every `saveEntry()` re-serializes the whole map and writes it via tmp + rename. A small `writeQueue` Promise chain serializes the writes so the file never tears.

This works at current scale but is structurally wrong:

- Each save is O(n) in the entry count. For a 2000-star user that means rewriting ~600 KB on every save instead of inserting one row.
- The `writeQueue` mutex exists only to compensate for the lack of atomic per-row writes. SQLite handles that for us.
- There is no schema marker, so any future format change is a hard break.
- We cannot query the cache (e.g. "how many entries per category", "evict everything older than N days") without parsing the whole JSON.

`bun:sqlite` is built into Bun, has no native compile step, and exposes a synchronous API that's well suited to a single-process CLI cache.

## Goals / Non-Goals

**Goals:**

- Replace the JSON-file storage layer with a SQLite database while keeping the `AnalysisCache` interface unchanged.
- Eliminate the whole-file rewrite per save.
- Keep behavior identical: same key (`repoId + SHA-256(readme)`), same `--no-cache` flag, same graceful recovery on a corrupt store.
- Introduce a schema-version marker so future migrations have a hook.

**Non-Goals:**

- Adding new query surface (category counts, eviction policy, stats). Those become trivial once the data is in SQLite, but they are separate enhancements.
- Migrating the existing `.cache/analysis.json` content into the new store. The cache is reproducible and pre-1.0; a one-time re-analysis is acceptable.
- Bumping cache scope (per-user `~/.cache/`, multi-project sharing, remote sync). The single-process, project-local model is preserved.

## Decisions

### Backend: `bun:sqlite`

Built into the runtime, zero new dependencies, no native rebuild. The synchronous API is appropriate here — the cache is on the analyze hot path, the data is small, and the alternative async drivers (`better-sqlite3`, `sqlite3`) add npm deps and native build complexity for no behavioral gain.

**Alternatives considered:**

- `better-sqlite3` — also synchronous, also good, but Bun ships its own. Avoid the dep.
- `cacache` (npm's content-addressable cache) — designed for large blobs, awkward fit for small JSON entries.
- `keyv` — uniform key-value layer over multiple backends, useful only if we expected to swap backends later. We do not.

### File location: `.cache/analysis.db`

Same directory as the old JSON file, just a different filename. `.cache/` is already in `.gitignore` so no rule changes. Keeping the path stable means users who already had `.cache/` ignored locally don't have to do anything.

The old `.cache/analysis.json` is NOT deleted by this change — it just stops being read. Users can clean it up manually. (Auto-deleting user data is a separate decision we don't need to make here.)

### Schema

A single table plus a SQLite-builtin schema-version pragma:

```sql
CREATE TABLE IF NOT EXISTS entries (
  key            TEXT PRIMARY KEY,    -- "<repoId>:<sha256(readme)>"
  category       TEXT NOT NULL,
  killer_feature TEXT NOT NULL,
  data_quality   TEXT,                -- "full" | "sparse" | "truncated" | NULL
  updated_at     INTEGER NOT NULL     -- unix epoch ms, set by the writer
) WITHOUT ROWID;

PRAGMA user_version = 1;
```

`WITHOUT ROWID` because the primary key already covers every column and we always look up by it.

`updated_at` is not surfaced through the `AnalysisCache` interface; it exists so future eviction policies have something to sort by without a schema change.

`PRAGMA user_version = 1` marks the schema. Future schema migrations bump the integer and run conditional `ALTER TABLE` at `loadCache()` time.

### Connection settings

- `journal_mode = WAL` — crash-safe writes, better concurrent-read story (single writer / many readers, which matches our usage exactly).
- `synchronous = NORMAL` — WAL's default; durable enough for a cache. We are not a financial ledger; if power-cuts during a save lose the last entry, the next run regenerates it.
- `foreign_keys = OFF` (default) — single table, no FKs.

### API: `AnalysisCache` interface unchanged

Module exports stay:

- `DEFAULT_CACHE_PATH` (now `.cache/analysis.db`)
- `cacheKey(repoId, readme)` — unchanged
- `loadCache(filePath?)` — opens the DB, runs the `CREATE TABLE IF NOT EXISTS` + `PRAGMA` statements, loads `size` via `SELECT COUNT(*)`. The returned `AnalysisCache` keeps a long-lived `Database` handle plus two prepared statements (`SELECT` and `INSERT OR REPLACE`).
- `cache.get(repoId, readme)` — `selectStmt.get(key)` and maps the row back to `AnalysisResult`.
- `cache.saveEntry(repoId, readme, result)` — `upsertStmt.run(...)`. No `writeQueue` Promise chain — SQLite is the mutex.
- `cache.size` — backed by `SELECT COUNT(*)`. Cached after `loadCache()` and incremented in `saveEntry()` when the row is new (`UPSERT` does not tell us this directly; the simplest approach is to query `changes()` on the connection after each write, or re-count on demand).

The `Promise<void>` return on `saveEntry` is preserved even though `bun:sqlite` is synchronous, to avoid touching call sites and to leave room for future I/O work (e.g. flushing the WAL on shutdown).

### Corrupt store recovery

`bun:sqlite` raises errors with codes like `SQLITE_NOTADB` or `SQLITE_CORRUPT` when the file is not a valid SQLite database. On any error opening or reading the file:

1. Log a `warn` via the shared logger with the path and the error message.
2. Close the broken handle.
3. Rename the file to `<path>.broken.<timestamp>` so the user can inspect or delete it.
4. Reopen at the same path and run the `CREATE TABLE` setup, yielding an empty cache.

This mirrors the existing "warn and continue with empty cache" behavior, with the small refinement that the broken file is preserved instead of overwritten on the next save.

### Concurrency

The current code uses `Promise.all` for concurrent analysis and serializes cache writes via a `writeQueue` mutex. With SQLite + WAL:

- All connections from the same process serialize writes at the SQLite layer. There is no torn write.
- The single shared `Database` handle is fine — `bun:sqlite` is safe to use from the same process across awaited continuations.
- Therefore the `writeQueue` is removed.

## Risks / Trade-offs

- **Bun-only.** `bun:sqlite` is not available under Node. The repo is already Bun-only per `CLAUDE.md` (`bun run`, `bun install`, no `npm`/`node` runtime), so this codifies an existing constraint rather than introducing one.
- **Synchronous I/O on the hot path.** `bun:sqlite` calls are sync. In practice each `INSERT OR REPLACE` of a ~200-byte row is far faster than the AI call it follows, so the latency cost is negligible. If we ever need to keep the event loop free for UI rendering during a burst of writes, we can batch saves in a transaction or move them off to a `queueMicrotask`.
- **Lost data on a crash mid-write.** WAL mode bounds the loss to the in-flight transaction. Acceptable for a regeneratable cache.
- **Old `.cache/analysis.json` lingers.** Pre-1.0 + cheap to regenerate, but the file will sit there until the user deletes it. Mentioned in the proposal under "Breaking changes" so it shows up in the archive log.

## Migration Plan

1. Land the spec delta and the storage rewrite in one PR; existing call sites do not change.
2. First run after the merge: `loadCache()` finds no `.cache/analysis.db`, creates it, the AI analyzes every repo, and the new DB is populated. Subsequent runs hit the cache.
3. The orphan `.cache/analysis.json` file is harmless; users can `rm` it whenever.
4. No automated data migration. If somebody wants one later, the existing `loadCache()` could fall back to reading `.cache/analysis.json` once and replaying the entries into SQLite — but that is out of scope here.
