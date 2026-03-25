## Why

The `--analyze-only` JSON output currently contains only `runId`, `suggestions`, and previously `analyzedRepos`, but gives no quick summary of how the run went. Consumers of the file (humans, scripts) must count array entries or trawl through data to find failures or understand run scope.

## What Changes

- Add a top-level `summary` object to the `--analyze-only` JSON output containing:
  - `starredCount` — total number of starred repos fetched
  - `analyzedCount` — number of repos that completed AI analysis
  - `suggestionCount` — number of suggestions generated
  - `durationMs` — wall-clock duration of the full analysis run in milliseconds
  - `model` — AI model identifier used for analysis (backend + model name)
  - `githubUser` — GitHub username of the authenticated user
  - `langfuseSessionId` — Langfuse session ID, included only when Langfuse is configured and the session ID differs from `runId`
- Add a top-level `errors` array containing structured entries for any repos where analysis failed (category `"analysis-failed"`)
- Enable Langfuse tracing in `--analyze-only` mode (currently disabled — analyzer is created with `null` trace)

## Capabilities

### New Capabilities

- `analyze-only-output-summary`: Top-level `summary` object and `errors` array in `--analyze-only` JSON output

### Modified Capabilities

- `analyze-only-output`: The JSON output shape gains two new top-level keys (`summary`, `errors`); existing keys (`runId`, `suggestions`) are unchanged

## Impact

- `src/index.tsx` — `analyzeOnly()` function builds and serialises the new fields
- `openspec/specs/analyze-only-output/spec.md` — requirements updated to reflect new output shape
