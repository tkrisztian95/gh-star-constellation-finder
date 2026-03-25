## 1. Extend Analyzer interface with modelId

- [x] 1.1 Add optional `modelId?: string` property to the `Analyzer` interface in `src/ai/types.ts`
- [x] 1.2 Set `modelId: "openai/gpt-4o-mini"` on the object returned by `createOpenAIAnalyzer` in `src/ai/openaiAnalyzer.ts`
- [x] 1.3 Set `modelId: \`ollama/${model}\`` on the object returned by `createOllamaAnalyzer` in `src/ai/ollamaAnalyzer.ts`

## 2. Thread GitHub login into runAnalyzeOnly

- [x] 2.1 Destructure `login` from the `authenticate()` result in `main()` in `src/index.tsx`
- [x] 2.2 Add `login: string` parameter to the `runAnalyzeOnly` function signature and pass it from `main()`

## 3. Enable Langfuse tracing in analyze-only mode

- [x] 3.1 Initialize `createLangfuseClient()` at the start of `runAnalyzeOnly`
- [x] 3.2 Create a run trace with `createRunTrace` and a dedicated session ID (separate from `runId`)
- [x] 3.3 Pass the trace to `createAnalyzer` instead of `null`
- [x] 3.4 Call `await flushTracing(langfuse)` before serialising the JSON output

## 4. Build summary and errors

- [x] 4.1 Record `const startMs = Date.now()` at the entry of `runAnalyzeOnly`
- [x] 4.2 After suggestion generation, compute `errors` by filtering `analyzedRepos` for `analysis.category === "analysis-failed"`, mapping to `{ repo: entry.repo.name, owner: entry.repo.owner }`
- [x] 4.3 Build the `summary` object: `{ starredCount: allRepos.length, analyzedCount: repos.length, suggestionCount: suggestions.length, durationMs: Date.now() - startMs, model: analyzer.modelId ?? null, githubUser: login }`
- [x] 4.4 When Langfuse is active and the trace session ID differs from `runId`, add `langfuseSessionId` to `summary`
- [x] 4.5 Update the `JSON.stringify` call to output `{ runId, summary, suggestions, errors }`

## 5. Update spec

- [x] 5.1 Update `openspec/specs/analyze-only-output/spec.md` to reflect the new output shape (add `summary` and `errors` to the top-level keys requirement)
