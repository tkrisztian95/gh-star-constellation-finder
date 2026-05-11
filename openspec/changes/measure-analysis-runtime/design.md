## Context

`runAnalysis` in [src/orchestration/analysis.ts](../../../src/orchestration/analysis.ts) already captures `analysisStartTime` and PostHog already receives a `durationMs` property on the `analysis_completed` event. None of this is visible to the user:

- The analyzing `LoadingScreen` shows a spinner and progress count but no clock.
- The `summary`/`done` screens never mention how long the run took.
- The session JSON (built by `buildSessionJson` and consumed by both `--analyze-only` output and interrupt-save) contains no timing fields.
- Per-repo analyzer latency is observable only via Langfuse spans, which most users never see.

The analysis loop already has a clean wrap point — every repo enters the IIFE in [analysis.ts:72-122](../../../src/orchestration/analysis.ts#L72-L122) which is the natural place to record per-repo timing.

## Goals / Non-Goals

**Goals:**

- A wall-clock timer is visible during the analyzing TUI phase, ticking once per second.
- The total analysis duration is rendered on the completion path (summary/save-prompt/done screens).
- The session JSON's `summary` carries `analysisDurationMs`; a new `analysisTimings` array carries `{ owner, name, durationMs, status }` per analyzed repo.
- Per-repo timing is captured for both successful analyses and failures (so the slowest repo or a hang on a specific repo is diagnosable).

**Non-Goals:**

- Sub-phase breakdown (fetch stars, fetch READMEs, consolidate, generate suggestions) — explicitly out of scope; only the analysis phase is measured here.
- Persisting historical timings across runs or any benchmarking/comparison UI.
- Changing the existing `analysis_completed` PostHog event shape. `durationMs` continues to mean "from `analysisStartTime` to now," which already aligns with the new `analysisDurationMs`.
- Showing per-repo timings inside the TUI. They land only in the session JSON.

## Decisions

**Per-repo timing is recorded inside the IIFE in `runAnalysis`, not via a decorator on the analyzer.** The IIFE already owns the lifecycle of one repo's analysis and handles the archived-vs-active branch. Timing wraps the whole IIFE body (including `computeDataQuality` and `dataQuality` assignment) so the recorded duration matches what a user perceives as "time spent on this repo." Archived repos still get an entry (with a near-zero duration and `status: "skipped-archived"`), which keeps the array length equal to `analyzedRepos.length` and avoids index drift for downstream consumers.

Alternative considered: wrap `analyzer.analyze()` itself. Rejected because (a) it would not capture the archived-repo fast path and (b) it would mean threading timing data out of every provider implementation.

**`startedAt: number` is added to the `analyzing` phase variant.** The screen renders the elapsed timer from `Date.now() - startedAt` using a 1-second `setInterval`, matching the existing spinner refresh pattern. The orchestrator sets `startedAt` once (to `analysisStartTime`) and never updates it on subsequent `setPhase` calls; this avoids the timer "jumping" when progress updates land.

Alternative considered: pass `startedAt` through a separate prop on `LoadingScreen`. Rejected because the phase is the source of truth for screen state — adding a sibling prop creates two paths for the same value.

**Per-repo timings are serialized as a top-level `analysisTimings` array, not nested under `summary`.** They are potentially long (one entry per starred repo) and structurally different from the scalar summary stats. Top-level placement matches how `suggestions` and `errors` are already top-level despite being conceptually "part of the run summary."

**Duration formatting uses a tiny inline helper, not a dependency.** Format: `2m 14s` for ≥ 60s, `14s` for ≥ 1s, `850ms` otherwise. Placed in [src/session/json.ts](../../../src/session/json.ts) or a new `src/util/duration.ts` if reused by TUI; the TUI live timer uses the same helper so the on-screen format is identical to what later lands in JSON.

**Tracking failure timing.** A repo whose `analyzer.analyze()` throws still has its duration recorded in a `finally` block, with `status: "failed"`. Aborted repos (when `interruptedRef.value` flips during the call) are recorded with `status: "aborted"` and excluded from `analyzedRepos` as today.

## Risks / Trade-offs

- [Clock drift on long runs causing the live timer to look stuck] → The timer is recomputed from `Date.now() - startedAt` every tick, not incremented; no drift accumulates. The `setInterval` is cleared on unmount.
- [Adding `analysisTimings` to session JSON inflates payload size for users with many stars] → For 2000 stars × ~80 bytes/entry that is ~160 KB, which is acceptable for a one-time save. If this becomes a concern, a future change can gate it behind a flag; not in scope here.
- [Existing `--analyze-only` consumers may break on the new top-level key] → New keys are additive; existing parsers that read `runId`/`summary`/`suggestions`/`errors` continue to work. The `summary.analysisDurationMs` field is also additive.
- [Per-repo timing recorded inside the IIFE includes `setPhase` calls and other bookkeeping] → Intentional: that overhead is in the user's wall-clock experience and is dominated by the LLM call. Documented in the spec so reviewers don't conflate this with pure LLM latency.

## Migration Plan

Single change, no migration. The added phase field, JSON keys, and TUI display are additive. Rollback is just reverting the commit; PostHog data continues to flow unchanged because no analytics events are modified.
