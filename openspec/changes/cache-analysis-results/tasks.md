## 1. Cache Module

- [x] 1.1 Create `src/cache/analysisCache.ts` with `loadCache()`, `saveEntry()`, and cache key (repoId + SHA-256 of README) logic
- [x] 1.2 Implement `loadCache()` with try/catch that returns an empty map on missing or corrupt JSON, logging a warning on parse error
- [x] 1.3 Implement `saveEntry()` that updates the in-memory cache map and writes the full map to `.cache/analysis.json` atomically

## 2. CLI Integration

- [x] 2.1 Add `--no-cache` flag to `parseArgs()` (lives in `src/cli/args.ts`, not `src/index.tsx`)
- [x] 2.2 Load the cache at startup in `main()` (`src/orchestration/main.tsx`, before the analysis-loop branch) unless `--no-cache` is set
- [x] 2.3 Wrap each `analyzer.analyze()` call (interactive: `src/orchestration/analysis.ts`; headless: `src/cli/modes.ts`) to check the cache first; call `saveEntry()` after each new result

## 3. Repository Hygiene

- [x] 3.1 Add `.cache/` to `.gitignore`

## 4. Verification

- [ ] 4.1 Run the tool once to populate the cache and confirm `.cache/analysis.json` is created with the expected entries
- [ ] 4.2 Run again without `--no-cache` and confirm no AI API calls are made (zero new tokens billed / same results instantly)
- [ ] 4.3 Run with `--no-cache` and confirm all repos are re-analyzed and the cache file is updated
- [ ] 4.4 Corrupt `.cache/analysis.json` manually and confirm the tool starts cleanly with a warning
