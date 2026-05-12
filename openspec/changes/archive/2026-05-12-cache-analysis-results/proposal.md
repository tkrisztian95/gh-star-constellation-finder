Tracks #9

## Why

Every run of `gh-star-constellation-finder` makes one AI API call per starred repo, even for repos analyzed in a prior run. Caching analysis results locally eliminates redundant API calls and makes re-runs fast.

## What Changes

- After each repo is analyzed, its result is written to a local cache file keyed by repo ID and README content hash.
- On startup, cached results are loaded and any repo with a valid cache entry is skipped during the analysis phase.
- The cache is stored as a JSON file in a configurable local path (default: `.cache/analysis.json`).
- A `--no-cache` CLI flag bypasses the cache for a full fresh analysis.

## Capabilities

### New Capabilities

- `analysis-cache`: Local file-based cache for AI analysis results, keyed by repo ID + README content hash, with read/write lifecycle integrated into the analysis phase.

### Modified Capabilities

- (none)

## Impact

- `src/index.tsx`: orchestration loop reads cache before analysis, writes after each result
- `src/ai/index.ts` (analyzer interface): no interface changes needed; caching wraps the analyzer call
- New file: `src/cache/analysisCache.ts` — cache read/write/invalidation logic
- `.gitignore`: add `.cache/` directory
- `package.json`: no new dependencies (uses Node.js `fs` built-ins)
