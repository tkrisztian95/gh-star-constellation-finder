## 1. Extend tracing helpers in `src/ai/tracing.ts`

- [x] 1.1 Add `LangfuseParent` union type (`LangfuseTrace | LangfuseSpan`) and export it
- [x] 1.2 Add `createPhaseSpan(parent: LangfuseParent | null, name: string, metadata?: object): LangfuseSpan | null` helper that swallows errors
- [x] 1.3 Add `endSpanSafe(span: LangfuseSpan | null | undefined, opts?: { output?: object; level?: string; statusMessage?: string }): void` helper
- [x] 1.4 Add `createMilestoneEvent(parent: LangfuseParent | null, name: string, metadata?: object): void` helper that swallows errors
- [x] 1.5 Add `createAgentObservation(trace: LangfuseTrace | null, name: string, metadata?: object): LangfuseSpan | null` helper (uses `span` with `agent` semantic type or SDK's `.agent()` if available)
- [x] 1.6 Extend `createRunTrace` metadata type to include `modelId`, `filteredRepoCount`, `totalRepoCount`, `listNames`, and `concurrency` fields

## 2. Update root trace setup in `src/orchestration/main.tsx`

- [x] 2.1 Pass `modelId`, `filteredRepoCount` (length of `filteredRepos`), `totalRepoCount` (length of `allRepos`), `listNames`, and `concurrency` into `createRunTrace` metadata
- [x] 2.2 Create the `constellation-agent` agent observation immediately after the trace is created; store as `agentObs`
- [x] 2.3 Emit `run-start` event on `agentObs` with backend and filteredRepoCount metadata
- [x] 2.4 Pass `agentObs` down to `runAnalysis`, `handleInterrupt`, and `runReviewPhase` in place of bare `trace`

## 3. Wrap analysis phase in `src/orchestration/analysis.ts`

- [x] 3.1 Replace `trace` param type with `LangfuseParent | null` in `runAnalysis` and `analyzeWithConcurrency` signatures
- [x] 3.2 Create `analysis-phase` span from parent at the start of `runAnalysis`, passing `repoCount` as input metadata
- [x] 3.3 End the `analysis-phase` span in a `finally` block with `successCount` as output metadata
- [x] 3.4 Pass the `analysis-phase` span (not the root trace) as parent to each per-repo `analyze()` call

## 4. Wrap consolidation phase in `src/orchestration/consolidationCoordinator.ts`

- [x] 4.1 Accept `LangfuseParent | null` in the coordinator's main function signature
- [x] 4.2 Create `consolidation-phase` span with strategy and list count in input metadata
- [x] 4.3 End the `consolidation-phase` span in a `finally` block with suggestion count in output metadata
- [x] 4.4 Pass the `consolidation-phase` span as parent to `complete()` calls inside the coordinator

## 5. Wrap review phase in `src/orchestration/review.ts`

- [x] 5.1 Accept `LangfuseParent | null` in `runReviewPhase` signature
- [x] 5.2 Create `review-phase` span with suggestion count in input metadata
- [x] 5.3 End the `review-phase` span after review with accepted/rejected counts in output metadata

## 6. Enrich generation observations in providers

- [x] 6.1 Update `AIProvider.analyze()` signature to accept `parent: LangfuseParent | null` instead of `LangfuseTrace`
- [x] 6.2 Update `AIProvider.complete()` signature to accept `parent: LangfuseParent | null`
- [x] 6.3 In `openaiProvider.ts` `analyze()`: add `repoFullName` (`${input.owner}/${input.name}`) to `endGenerationSafe` metadata
- [x] 6.4 In `openaiProvider.ts` `analyze()`: pass `assignedCategory` from parse result to `endGenerationSafe` metadata
- [x] 6.5 Mirror 6.3–6.4 in `ollamaProvider.ts` `analyze()`

## 7. ESC interrupt event

- [x] 7.1 Emit `run-interrupted` event on the agent observation when ESC is detected in `handleInterrupt`, with `analysedCount` and `totalCount` metadata

## 8. Update `endGenerationSafe` helper

- [x] 8.1 Extend `endGenerationSafe` in `openaiUtils.ts` / `ollamaUtils.ts` to accept an optional `metadata` object and pass it through to `generation.end()`
