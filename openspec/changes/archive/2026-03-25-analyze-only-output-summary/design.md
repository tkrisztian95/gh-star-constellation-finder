## Context

The `--analyze-only` JSON output currently contains `runId` and `suggestions` only. Consumers (humans reviewing the file, future tooling) need a quick header summarising what happened: how many repos were found vs analysed, how long it took, which model was used, and which GitHub account it ran against. Failed analyses are silently absorbed into the suggestions pipeline today; they should be surfaced in a top-level `errors` array.

`runAnalyzeOnly()` already has access to everything needed:
- `allRepos` (all starred repos, pre-limit) → `starredCount`
- `repos` (post-limit slice sent for analysis) → `analyzedCount`
- `analyzer` (`Analyzer` instance) → model identifier
- `analyzedRepos` filtered for `category === "analysis-failed"` → `errors`
- wall-clock `Date.now()` delta → `durationMs`

GitHub `login` is available from `AuthResult` but not currently forwarded into `runAnalyzeOnly`; it needs to be threaded through.

## Goals / Non-Goals

**Goals:**
- Add a `summary` top-level key: `{ starredCount, analyzedCount, suggestionCount, durationMs, model, githubUser }`
- Add an `errors` top-level key: array of `{ repo, owner }` for analysis-failed repos
- Surface `githubUser` (GitHub login) in the summary
- Surface the AI model identifier in the summary

**Non-Goals:**
- Changing the shape of `suggestions` entries
- Persisting errors to a separate file
- Adding retry logic for failed analyses
- Exposing per-repo timing

## Decisions

### Add `modelId` property to the `Analyzer` interface

**Decision:** Extend `Analyzer` in `src/ai/types.ts` with an optional `modelId?: string` property, populated by each concrete analyzer.

**Rationale:** The model name is an implementation detail of each backend (`"gpt-4o-mini"` for OpenAI, `process.env.OLLAMA_MODEL ?? "llama3"` for Ollama). Having each analyzer declare its own `modelId` is more accurate than re-deriving it from `cliArgs.backend` in the orchestration layer. The property is optional so that any existing mock analyzers (tests) do not need to change.

**Alternative considered:** Derive model from `cliArgs.backend` in `runAnalyzeOnly` — simpler but fragile if the model name ever changes inside the analyzer without updating the orchestrator.

### Thread `login` through `runAnalyzeOnly`

**Decision:** Add a `login: string` parameter to `runAnalyzeOnly`, and destructure `login` from the `authenticate()` result in `main()`.

**Rationale:** `login` is already fetched during auth and costs nothing to thread through. The function signature stays minimal.

### Errors array shape: `{ repo, owner }`

**Decision:** Each error entry is `{ repo: string, owner: string }` — the minimal identifiers needed to look up the repo. No `reason` field, because `AnalysisResult.killerFeature` is empty on failures and adds no value.

**Alternative considered:** Include `killerFeature` as `reason` — rejected because it's always `""` for parse failures and would be misleading.

### Duration measured inside `runAnalyzeOnly`

**Decision:** Record `Date.now()` at the entry of `runAnalyzeOnly` and compute the delta just before serialising the output.

**Rationale:** This captures the full pipeline duration including fetch, analysis, consolidation, and suggestion generation — the number most useful to a user tuning performance.

## Risks / Trade-offs

- **`modelId` interface change**: Any test mock `Analyzer` that doesn't set `modelId` will produce `undefined` in the output. Acceptable — `modelId` is optional and the output field will show `null`.
- **`starredCount` vs `analyzedCount`**: When `--limit` is used, these differ. The distinction is useful but may surprise users who expect them to be equal; the field names make the difference explicit.

### Enable Langfuse tracing in `--analyze-only` mode

**Decision:** Initialize `createLangfuseClient()` inside `runAnalyzeOnly`, create a trace with `createRunTrace`, and pass it to `createAnalyzer`. Flush with `flushTracing` before writing the JSON output. If the Langfuse session ID differs from `runId`, include `langfuseSessionId` in `summary`.

**Rationale:** The TUI flow already supports Langfuse; `--analyze-only` should have parity. Tracing is a no-op when credentials are absent, so there is no behaviour change for users without Langfuse configured.

**Alternative considered:** Always reuse `runId` as the Langfuse session ID to guarantee they match — rejected because the TUI flow uses separate IDs, and forcing equality would hide the Langfuse session in tracing dashboards when `runId` does not appear there.

## Migration Plan

1. Extend `Analyzer` interface with `modelId?: string`
2. Set `modelId` in `createOpenAIAnalyzer` and `createOllamaAnalyzer`
3. Add `login` param to `runAnalyzeOnly`, thread from `main()`
4. Initialize Langfuse tracing inside `runAnalyzeOnly`, flush before output
5. Record start time, compute `errors`, build `summary`, update JSON serialisation
6. Update `analyze-only-output` spec to reflect new output shape
