## Why

Users currently have no visibility into how long a run takes. The analyzing TUI shows only a spinner, no completion screen mentions duration, and the session JSON carries no timing data. Even worse, when a run feels slow there is no way to tell *which* phase is the culprit — fetching READMEs from GitHub, the per-repo LLM analysis loop, the consolidation step, suggestion generation, or applying mutations on GitHub. PostHog's `analysis_completed` event already records a `durationMs` for the analysis phase, but it is opaque to the end user and lumps everything into one number.

## What Changes

- Capture wall-clock duration for every measurable phase of a run: fetching stars and lists, fetching READMEs, analysis, consolidation, suggestion generation, and applying mutations.
- Capture per-repo analysis latency (including failures and archived fast-paths) so the slowest repo or a hang on a specific one is diagnosable.
- During the analyzing TUI phase, render a live elapsed timer next to the progress counter.
- On the post-run completion path, surface the total analysis duration (human-readable, e.g. `2m 14s`) and a short per-phase breakdown.
- Persist `phaseTimings` and `analysisTimings` on the session JSON `summary` so saved runs are diff-able and shareable.
- User-interactive phases (confirm, scope, strategy picker, review) are explicitly **not** measured — user think-time is not useful as a performance signal.

## Capabilities

### New Capabilities

- `run-phase-metrics`: Capturing and exposing wall-clock timing for each non-interactive phase of a run and per-repo analyzer latency.

### Modified Capabilities

- `tui-review`: The analyzing-phase loading screen MUST render a live elapsed timer; completion screens MUST display the total analysis duration and per-phase breakdown.
- `analyze-only-output`: The session JSON MUST include `summary.phaseTimings` and a top-level `analysisTimings` array.

## Impact

- `src/orchestration/main.tsx` — wraps the fetch-stars-and-lists `Promise.all` and the `fetchAllReadmes` call with timing; accumulates a `PhaseTimings` object that is threaded through subsequent phases.
- `src/orchestration/analysis.ts` — `runAnalysis` returns `analysisDurationMs` and `analysisTimings`; `handleInterrupt` save path receives and serializes the partial `PhaseTimings`.
- `src/orchestration/review.ts` — instruments `consolidateCategories` and `generateSuggestions` calls, augments `ReviewPhaseResult` with `consolidationMs` and `suggestionsMs`.
- `src/orchestration/apply.ts` — instruments the GitHub mutation loop, includes `applyMs` in the saved session JSON when applicable.
- `src/cli/modes.ts` (`runAnalyzeOnly`) — collects all non-interactive phase timings and serializes them.
- `src/state/phases.ts` — `analyzing` phase carries `startedAt: number`; `summary`/`save-prompt`/`done` carry `phaseTimings: PhaseTimings`.
- `src/components/LoadingScreen.tsx` — live elapsed-time display during `analyzing`.
- `src/components/SummaryScreen.tsx`, `SavePromptScreen.tsx`, plus the done screen — render formatted total + per-phase breakdown.
- `src/session/json.ts` — `SessionJsonInput.summary` accepts `phaseTimings`; output gains a top-level `analysisTimings` array.
- New `src/util/duration.ts` — single formatting helper used by both TUI and JSON.
- No new dependencies. PostHog `durationMs` semantics on `analysis_completed` are unchanged (additive only).
