## Context

`gh-star-constellation-finder` analyzes each starred repo via an AI backend on every run. With hundreds of starred repos, this makes every run slow and expensive. Analysis results are deterministic given the same repo content, so caching is safe.

Current flow: fetch repos → fetch READMEs → call `analyzer.analyze(repo)` for each → generate suggestions.

## Goals / Non-Goals

**Goals:**
- Persist analysis results to a local JSON file after each successful analysis.
- Skip re-analysis for repos whose README content hasn't changed since the last run.
- Provide a `--no-cache` flag to force full re-analysis.
- Cache invalidation is content-based (README hash), not time-based.

**Non-Goals:**
- Shared or remote caching (this is a single-user CLI tool).
- Caching README fetch results (network calls, not AI calls).
- Cache compression or size management.
- Cache migration tooling for format changes.

## Decisions

### Cache key: `repoId + SHA-256(readme)`

Each cache entry is keyed by the GitHub repo node ID combined with a SHA-256 hash of the README text. This ensures stale entries are automatically ignored when README content changes, without any explicit TTL.

**Alternatives considered:**
- `repoId` only: would serve stale analysis after a README update.
- `repoId + updatedAt` timestamp: requires an extra API field and can miss content-only README refreshes.
- File-per-repo: cleaner isolation but creates hundreds of files; a single JSON map is simpler.

### Cache file location: `.cache/analysis.json`

Relative to the project working directory (i.e., where the CLI is run). Added to `.gitignore`.

**Alternatives considered:**
- `~/.gh-star-cache/`: user-level cache across projects; overkill for a single-repo tool.
- `os.tmpdir()`: cleared on reboot, defeating the purpose.

### Cache module: `src/cache/analysisCache.ts`

A thin wrapper around Node.js `fs/promises` with `loadCache()` / `saveEntry()` exports. The cache is loaded once at startup into memory and flushed after each new analysis result (append-write pattern), not only at the end of the run. This prevents losing results if the process is interrupted mid-run.

**Alternatives considered:**
- Write entire cache file at the end: simpler but loses all progress on early exit (e.g., user Ctrl-Cs after 200/500 repos).
- SQLite: durable and queryable, but adds a native dependency to a zero-dependency CLI.

### Integration point: `src/index.tsx` orchestration loop

The cache check and write are added in the `repos.map(async (repo) => { ... })` loop in `main()`, wrapping the `analyzer.analyze()` call. No changes to the analyzer interface or components.

## Risks / Trade-offs

- **Stale cache on model change**: If the AI backend or prompt changes, cached results from a prior model won't reflect the new analysis quality. Mitigation: `--no-cache` flag; document that cache should be cleared when changing backends.
- **Concurrent writes**: The current flow uses `Promise.all` for concurrent analysis. Writing cache entries concurrently from multiple async tasks could interleave file writes. Mitigation: queue writes through a single async mutex or write atomically per entry using `JSON.stringify` + `fs.writeFile` with the full in-memory map (safe because JS is single-threaded for the map update, only the file I/O is async).
- **Cache file corruption**: A crash mid-write could corrupt the JSON file. Mitigation: wrap `loadCache()` in a try/catch that falls back to an empty cache on parse error.

## Migration Plan

No migration needed. The cache file is created on first run. Existing users see a one-time full analysis on upgrade, then benefit from caching on subsequent runs.
