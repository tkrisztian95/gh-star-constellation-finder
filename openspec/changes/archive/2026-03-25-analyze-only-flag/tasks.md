## 1. CLI Flag Parsing

- [x] 1.1 Add `analyzeOnly: boolean` field to `CliArgs` interface in `src/index.tsx`
- [x] 1.2 Parse `--analyze-only` flag in `parseArgs()` and set `result.analyzeOnly = true`

## 2. Headless Pipeline Function

- [x] 2.1 Add `runAnalyzeOnly()` async helper in `src/index.tsx` that accepts `CliArgs`, `token`, and `graphqlWithAuth`
- [x] 2.2 Inside `runAnalyzeOnly()`: fetch starred repos and user lists via `fetchStarredRepos` / `fetchUserLists`
- [x] 2.3 Apply `--limit` slice if present
- [x] 2.4 Fetch READMEs via `fetchAllReadmes` respecting `--concurrency`
- [x] 2.5 Run AI analysis loop (same logic as interactive mode, using `--backend` if provided)
- [x] 2.6 Run `consolidateCategories` with strategy `"allow-rename"` and apply remapping
- [x] 2.7 Call `generateSessionId()` (already imported from `src/ai/tracing.ts`) and store as `runId`
- [x] 2.8 Run `generateSuggestions` and collect `analyzedRepos` + `suggestions`
- [x] 2.9 Print `JSON.stringify({ runId, analyzedRepos, suggestions }, null, 2)` to stdout and return

## 3. Main Entry Point Branching

- [x] 3.1 In `main()`, after `parseArgs()`, add early branch: if `cliArgs.analyzeOnly`, call `runAnalyzeOnly()` and `process.exit(0)` — skip all TUI setup

## 4. Verification

- [x] 4.1 Run `bun run dev -- --analyze-only --limit 5` and confirm stdout is valid JSON with `runId`, `analyzedRepos`, and `suggestions` keys
- [x] 4.2 Confirm running without `--analyze-only` still launches the interactive TUI unchanged
- [x] 4.3 Confirm `--analyze-only --backend ollama --limit 3` resolves without errors (or expected backend error if Ollama not running)
