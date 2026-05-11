## Context

A run today flows through these non-interactive phases in [src/orchestration/main.tsx](../../../src/orchestration/main.tsx) and downstream:

1. **fetchStarsLists** — `Promise.all([fetchStarredRepos, fetchUserLists])` ([main.tsx:70-73](../../../src/orchestration/main.tsx#L70-L73))
2. **fetchReadmes** — `fetchAllReadmes(...)` ([main.tsx:177-181](../../../src/orchestration/main.tsx#L177-L181))
3. **analysis** — `runAnalysis(...)` in [src/orchestration/analysis.ts](../../../src/orchestration/analysis.ts); per-repo IIFE at [analysis.ts:72-122](../../../src/orchestration/analysis.ts#L72-L122) is the natural per-repo wrap point
4. **consolidation** — `consolidateCategories(...)` in [src/orchestration/review.ts](../../../src/orchestration/review.ts)
5. **suggestions** — `generateSuggestions(...)` in [review.ts](../../../src/orchestration/review.ts)
6. **apply** — GitHub mutation loop in [src/orchestration/apply.ts](../../../src/orchestration/apply.ts)

PostHog already receives `durationMs = Date.now() - analysisStartTime` on `analysis_completed`. None of this timing reaches the user.

Phases 1–6 are bracketed by clean function calls; user-interactive screens (`confirm`, `pick-scope`, `pick-strategy`, `review`) sit between them and would pollute any "total" if naively summed. Each phase boundary is therefore measured independently.

## Goals / Non-Goals

**Goals:**

- One `PhaseTimings` object accumulates per-phase millisecond durations across the run and is the single source of truth that the TUI, session JSON, and any future analytics consumer read from.
- Per-repo analysis latency is captured for every repo that entered the loop (ok / failed / aborted / skipped-archived) and exposed in the saved JSON.
- A live elapsed timer renders during the `analyzing` phase. Completion screens render the total analysis duration plus a per-phase line breakdown.
- All current PostHog event shapes are unchanged.

**Non-Goals:**

- Measuring user-interactive phases (confirm, scope, strategy, review). User think-time is not a performance signal and skews aggregates.
- Cross-run comparison UI, historical trend storage, or any "benchmark mode."
- Sub-step timing inside a phase (e.g. consolidation has internal sub-steps signaled via `subStep`). Out of scope; only phase-level totals are measured here.
- Streaming live per-phase timings during fetching or consolidating screens. Only the analyzing phase gets a live timer.

## Decisions

**Single accumulator object, mutated forward through the pipeline.** A `PhaseTimings` interface is defined in `src/types.ts` (or a new `src/state/phaseTimings.ts`):

```ts
interface PhaseTimings {
  fetchStarsListsMs?: number;
  fetchReadmesMs?: number;
  analysisMs?: number;
  consolidationMs?: number;
  suggestionsMs?: number;
  applyMs?: number;
}
```

Fields are optional so that interrupted/aborted runs serialize a partial object (e.g. an interrupt during analysis omits `consolidationMs`+). The orchestrator owns the object and passes a reference into `runAnalysis`, `runReviewPhase`, `runApplyPhase`. Each phase function mutates exactly the field it owns.

Alternative considered: each phase function returns its own duration and the orchestrator assembles a record. Rejected — would force all phase signatures to grow a return field and every save-site (interrupt-save, no-changes-save, post-apply-save) to re-aggregate. A single mutable object is the minimum diff.

**Timing measured inside the phase function, not by the caller.** `runAnalysis` already captures `analysisStartTime` and is the obvious place to compute `analysisMs`. The same pattern applies to `runReviewPhase` (records `consolidationMs` around `consolidateCategories` and `suggestionsMs` around `generateSuggestions`) and `runApplyPhase` (records `applyMs` around the mutation loop). Fetch phases are measured at the call sites in `main.tsx` and `cli/modes.ts` because they are not wrapped in dedicated phase functions today and extracting them is out of scope.

**Per-repo timing is recorded inside the IIFE in `runAnalysis`.** The IIFE already owns one repo's lifecycle, including the archived fast-path branch. A `try` / `catch` / `finally` chain wraps the body so success, failure, abort, and archived repos all produce exactly one entry in `analysisTimings`. The recorded duration intentionally includes `computeDataQuality` and `setPhase` bookkeeping — that overhead is part of the user-perceived wall-clock cost of "this repo." This is called out in the spec so reviewers don't conflate the recorded value with pure LLM latency.

**`startedAt: number` on the `analyzing` phase variant drives the live timer.** The orchestrator sets `startedAt = analysisStartTime` on every `setPhase({ tag: "analyzing", ... })` call. The `LoadingScreen` adds a 1s `setInterval` that drives a `now` state and renders `formatDuration(now - startedAt)` next to the progress count. Recomputing from the start timestamp on every tick avoids drift. The interval is cleared on phase change.

Alternative considered: separate `startedAt` prop threaded to `LoadingScreen`. Rejected — the phase is the source of truth for screen state, and a sibling prop would create two paths for the same value.

**Per-phase JSON breakdown lives under `summary.phaseTimings`, but per-repo timings are a top-level `analysisTimings` array.** Phase timings are scalars and clearly belong to the "summary" object alongside `durationMs`. Per-repo timings are potentially large (one entry per starred repo, ~80 bytes × up to 2000 = ~160 KB) and structurally distinct, so they get their own top-level key — mirroring how `suggestions` and `errors` are already top-level despite being conceptually "part of the summary."

**Duration formatting uses a tiny inline helper in `src/util/duration.ts`.** Format: `Xm Ys` for ≥ 60s, `Ys` for ≥ 1s, `Zms` otherwise. Used by both the TUI live timer and the completion screen so the on-screen format is identical to the values shown later when re-opening the saved JSON.

**Tracking failure / abort timing in `runAnalysis`.** A repo whose `analyzer.analyze()` throws still has its duration recorded in `finally` with `status: "failed"`. A repo aborted mid-analyze records `status: "aborted"` and is excluded from `analyzedRepos` (unchanged behaviour). Archived repos record `status: "skipped-archived"` with a near-zero duration; this keeps the array length equal to the count of repos that *entered* the loop, which is exactly what a user would expect.

## Risks / Trade-offs

- [Clock drift / jitter on long analyses making the live timer look stuck] → Timer is recomputed from `Date.now() - startedAt` every tick, not incremented. Drift cannot accumulate. Interval is cleared on unmount.
- [Mutating `PhaseTimings` across phase functions makes the data flow non-obvious] → Documented in the design and the spec. A future refactor could return a frozen record per phase if the readability cost outweighs the simplicity, but with only six phases the indirection is acceptable.
- [`analysisTimings` inflates session JSON for users with many stars] → ~160 KB worst case for 2000 stars. Acceptable for a one-time save. If this becomes a problem, a future change can gate it behind a `--include-timings` flag; not in scope.
- [Existing `--analyze-only` consumers may break on new top-level keys] → All additions are additive. Parsers that read `runId` / `summary` / `suggestions` / `errors` continue to work. `summary.durationMs` and `summary.analysisDurationMs` continue to be present.
- [Apply phase timing only lands in the saved JSON when the user saves after apply] → Unchanged from today's behaviour for other apply-time stats. Documented in the spec — if the user does not save post-apply, `applyMs` simply isn't persisted.

## Migration Plan

Single change, no migration. Phase fields, the new top-level `analysisTimings` array, and TUI display are all additive. Rollback is reverting the commit; PostHog data flow is unchanged because no analytics event shapes are touched.
