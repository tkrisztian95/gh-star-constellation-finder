## Why

Users currently have no visibility into how long the AI analysis phase takes — only an opaque spinner during the run, no completion-screen duration, and per-repo latency is invisible. Long runs (hundreds of stars on a slow model) feel indefinite, and there is no data in the saved session JSON for users to compare runs, diagnose slow backends, or identify outlier repos that blew up wall-clock time.

## What Changes

- Capture the analysis-phase wall-clock duration and the per-repo analyzer latency for every repo analyzed (including failures).
- During the analyzing TUI phase, render a live elapsed timer next to the progress counter.
- On the post-run completion path, surface the total analysis duration (formatted human-readably, e.g. `2m 14s`).
- Persist `analysisDurationMs` and a per-repo `analysisDurationsMs` array in the session JSON `summary` (for both `--analyze-only` output and interrupt/save flows).
- Per-repo timings are emitted as `{ owner, name, durationMs, status }` entries so users can spot the slowest analyses and the ones that failed.

## Capabilities

### New Capabilities

- `analysis-runtime-metrics`: Capturing and exposing wall-clock timing for the analysis phase as a whole and per repo.

### Modified Capabilities

- `tui-review`: The analyzing-phase loading screen MUST render a live elapsed timer.
- `analyze-only-output`: The session JSON `summary` MUST include `analysisDurationMs`; the output MUST include a top-level `analysisTimings` array with one entry per analyzed repo.

## Impact

- `src/orchestration/analysis.ts` — wraps each `analyzer.analyze()` call to record per-repo duration; returns per-repo timings from `runAnalysis`.
- `src/state/phases.ts` — `analyzing` phase variant gains `startedAt: number` so the screen can compute elapsed time.
- `src/components/LoadingScreen.tsx` — live elapsed-time display when `phase === "analyzing"`.
- `src/session/json.ts` — `SessionJsonInput` extended with optional per-repo timings; surfaced in serialized output.
- `src/orchestration/main.tsx`, `src/orchestration/review.ts`, `src/orchestration/apply.ts`, `src/cli/analyzeOnly.ts` (or equivalent analyze-only entry) — thread per-repo timings through to all session JSON build sites (interrupt-save, analyze-only, post-apply save).
- No new dependencies. No breaking changes to existing analytics events (`durationMs` continues to mean total since `analysisStartTime`).
