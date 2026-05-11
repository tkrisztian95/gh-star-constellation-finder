## 1. Duration helper and shared types

- [ ] 1.1 Add `formatDuration(ms: number): string` in `src/util/duration.ts` implementing the `Xm Ys` / `Ys` / `Zms` rules from the spec
- [ ] 1.2 Add unit tests in `src/__tests__/duration.test.ts` covering `0`, `850`, `4200`, `60000`, `134000`
- [ ] 1.3 Define the `PhaseTimings` interface (six optional integer fields) in `src/types.ts` and export it
- [ ] 1.4 Define `AnalysisTiming = { owner; name; durationMs; status: "ok" | "failed" | "skipped-archived" | "aborted" }` in `src/orchestration/analysis.ts` and export it

## 2. runAnalysis instrumentation

- [ ] 2.1 Add `phaseTimings: PhaseTimings` to `RunAnalysisParams` (the orchestrator passes in a shared object)
- [ ] 2.2 Extend `AnalysisResult` with `analysisDurationMs: number` and `analysisTimings: AnalysisTiming[]`
- [ ] 2.3 Inside the IIFE in `runAnalysis`, capture `repoStart = Date.now()` and push a timing entry in a `try`/`catch`/`finally` chain so success/failure/abort/archived all record exactly one row
- [ ] 2.4 Compute `analysisDurationMs = Date.now() - analysisStartTime` immediately before returning; also write it into `phaseTimings.analysisMs`
- [ ] 2.5 Add a test in `src/__tests__/analysis.test.ts` (extend existing or create) using a fake provider that asserts `analysisTimings.length === filteredRepos.length`, statuses are correct, and `phaseTimings.analysisMs` is set

## 3. Orchestrator-level phase timing

- [ ] 3.1 In `main.tsx`, create the shared `phaseTimings: PhaseTimings = {}` near the top of the run
- [ ] 3.2 Wrap the `Promise.all([fetchStarredRepos, fetchUserLists])` call to record `phaseTimings.fetchStarsListsMs` in both success and rejection paths (use `try`/`finally`)
- [ ] 3.3 Wrap `fetchAllReadmes` to record `phaseTimings.fetchReadmesMs`
- [ ] 3.4 Pass `phaseTimings` into `runAnalysis`, `runReviewPhase`, and `runApplyPhase`
- [ ] 3.5 Mirror the same fetch-phase wrappers in `src/cli/modes.ts` (`runAnalyzeOnly`)

## 4. Review and apply phase timing

- [ ] 4.1 Extend `ReviewPhaseParams` with `phaseTimings: PhaseTimings`
- [ ] 4.2 Wrap `consolidateCategories` to record `phaseTimings.consolidationMs` (capture even when the call rejects)
- [ ] 4.3 Wrap `generateSuggestions` to record `phaseTimings.suggestionsMs`
- [ ] 4.4 Ensure the no-suggestions early-exit save-site in `runReviewPhase` receives a populated `phaseTimings` before writing JSON
- [ ] 4.5 Extend `ApplyPhaseParams` with `phaseTimings: PhaseTimings`
- [ ] 4.6 Wrap the mutation loop in `runApplyPhase` to record `phaseTimings.applyMs` (set in `finally` so partial applies still record)

## 5. TUI live timer and completion screens

- [ ] 5.1 In `src/state/phases.ts`, add `startedAt: number` to the `analyzing` phase variant and `phaseTimings: PhaseTimings` to `summary`, `save-prompt`, and `done` variants
- [ ] 5.2 In `src/orchestration/analysis.ts`, include `startedAt: analysisStartTime` on every `setPhase({ tag: "analyzing", ... })` call
- [ ] 5.3 In `src/components/LoadingScreen.tsx`, accept `startedAt?: number`, drive a 1s `setInterval`, and render `formatDuration(now - startedAt)` next to the progress count when `phase === "analyzing"` and `startedAt` is set
- [ ] 5.4 In `src/components/AppRoot.tsx`, pass `phase.startedAt` and the per-screen `phase.phaseTimings` through to the relevant screens
- [ ] 5.5 In `SummaryScreen`, `SavePromptScreen`, and the done screen, render the formatted total (`Analysis took <fmt>`) plus the per-phase breakdown line, omitting absent fields
- [ ] 5.6 Mirror the breakdown line into the interrupt-confirm save flow (`handleInterrupt` in `src/orchestration/analysis.ts`)
- [ ] 5.7 Manually verify the timer ticks, the breakdown renders correctly post-run, and the interrupt path shows only measured phases

## 6. Session JSON

- [ ] 6.1 Extend `SessionJsonInput.summary` to accept `phaseTimings: PhaseTimings` and `SessionJsonInput` to accept optional `analysisTimings: AnalysisTiming[]`
- [ ] 6.2 Update `buildSessionJson` so the output ordering is `runId`, `summary`, `suggestions`, `errors`, `analysisTimings`, then optional `decisions`/`mutationResults`
- [ ] 6.3 At every existing call site (`handleInterrupt` interrupt-save, `runReviewPhase` no-changes-save, `runApplyPhase` post-apply save, `runAnalyzeOnly`), populate `summary.phaseTimings` and `analysisTimings`
- [ ] 6.4 Add or update an integration test that asserts `summary.phaseTimings` and `analysisTimings.length` are present and consistent for both analyze-only and interrupt-save flows

## 7. Verification

- [ ] 7.1 Run `bun test` — all existing tests pass plus the new duration / phase-timing tests
- [ ] 7.2 Run `bun run lint` and `bun run typecheck` (or project equivalents) — clean
- [ ] 7.3 Manual TUI smoke test: small `--limit` interactive run shows live timer, summary shows total + breakdown, post-apply done screen shows applyMs, saved JSON contains both `phaseTimings` and `analysisTimings`
- [ ] 7.4 Manual `--analyze-only --limit 5` run: parse stdout, confirm `summary.phaseTimings` carries all five non-interactive phases and `analysisTimings.length === 5`
- [ ] 7.5 Manual interrupt: ESC mid-run → choose save → confirm saved JSON has `fetchStarsListsMs`, `fetchReadmesMs`, partial `analysisMs`, and no `consolidationMs`/`suggestionsMs`/`applyMs`
