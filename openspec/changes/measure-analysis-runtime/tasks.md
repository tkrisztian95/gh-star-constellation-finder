## 1. Duration helper

- [ ] 1.1 Add `formatDuration(ms: number): string` in `src/util/duration.ts` implementing the `Xm Ys` / `Ys` / `Zms` rules from the spec
- [ ] 1.2 Add unit tests in `src/__tests__/duration.test.ts` covering `0`, `850`, `4200`, `60000`, `134000`

## 2. Per-repo timing in runAnalysis

- [ ] 2.1 Define `AnalysisTiming = { owner: string; name: string; durationMs: number; status: "ok" | "failed" | "skipped-archived" | "aborted" }` and export from `src/orchestration/analysis.ts`
- [ ] 2.2 Extend `AnalysisResult` with `analysisDurationMs: number` and `analysisTimings: AnalysisTiming[]`
- [ ] 2.3 Inside the IIFE in `runAnalysis`, capture `repoStart = Date.now()`, push a timing entry in a `try`/`catch`/`finally` chain so success/failure/abort/archived all record a row
- [ ] 2.4 Compute `analysisDurationMs = Date.now() - analysisStartTime` immediately before returning and include it (plus `analysisTimings`) in the returned object
- [ ] 2.5 Add a test in `src/__tests__/analysis.test.ts` (new or extend existing) that runs the analyzer against a fake provider and asserts `analysisTimings.length === filteredRepos.length` and each entry has the correct `status`

## 3. TUI live timer

- [ ] 3.1 In `src/state/phases.ts`, add `startedAt: number` to the `analyzing` phase variant
- [ ] 3.2 In `src/orchestration/analysis.ts`, include `startedAt: analysisStartTime` on every `setPhase({ tag: "analyzing", ... })` call
- [ ] 3.3 In `src/components/LoadingScreen.tsx`, accept `startedAt?: number`, add a 1s `setInterval` that drives a `now` state, and render `formatDuration(now - startedAt)` next to the progress count when `phase === "analyzing"` and `startedAt` is set
- [ ] 3.4 In `src/components/AppRoot.tsx`, pass `phase.startedAt` through to `LoadingScreen`
- [ ] 3.5 Manually verify the timer ticks and does not reset on per-repo progress updates

## 4. Completion-screen duration display

- [ ] 4.1 Thread `analysisDurationMs` from `runAnalysis` through `runReviewPhase` and `runApplyPhase` (signatures and call sites in `src/orchestration/main.tsx`, `review.ts`, `apply.ts`)
- [ ] 4.2 Extend the `summary`, `save-prompt`, and `done` phase variants in `src/state/phases.ts` with `analysisDurationMs: number`
- [ ] 4.3 Render `Analysis took <formatted>` in `SummaryScreen`, `SavePromptScreen`, and the post-apply done screen
- [ ] 4.4 Mirror the duration line into the interrupt-confirm save flow (`handleInterrupt` in `src/orchestration/analysis.ts`)

## 5. Session JSON

- [ ] 5.1 Extend `SessionJsonInput` in `src/session/json.ts` with optional `analysisTimings: AnalysisTiming[]` and ensure `summary` accepts `analysisDurationMs`
- [ ] 5.2 Have `buildSessionJson` write `analysisTimings` as a top-level key when provided (order: `runId`, `summary`, `suggestions`, `errors`, `analysisTimings`, then optional `decisions`/`mutationResults`)
- [ ] 5.3 At every existing call site (interrupt-save in `handleInterrupt`, `--analyze-only` builder, post-apply save), populate `summary.analysisDurationMs` and the new `analysisTimings`
- [ ] 5.4 Update or add an integration test that asserts `summary.analysisDurationMs` is present and `analysisTimings.length` matches the number of repos seen

## 6. Verification

- [ ] 6.1 Run `bun test` — all existing tests pass plus the new duration/analysis-timing tests
- [ ] 6.2 Run `bun run lint` and `bun run typecheck` (or the project equivalents) — clean
- [ ] 6.3 Manual TUI smoke test: small `--limit` interactive run shows live timer, summary shows total, JSON save contains both fields
- [ ] 6.4 Manual `--analyze-only --limit 5` run: parse stdout, confirm `summary.analysisDurationMs` and `analysisTimings.length === 5`
