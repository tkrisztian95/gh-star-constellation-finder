## Context

The analysis phase in `src/index.tsx` currently uses `Promise.all` to fan out AI analysis requests across all filtered repos with a fixed concurrency of 5. There is no mechanism to stop this loop early. The Ink TUI renders a `LoadingScreen` component during this phase, but no keypress handling is wired up for `analyzing`.

The existing pattern for user interaction during other phases (e.g., `ReviewScreen`) uses Ink's `useInput` hook. Post-analysis flow (consolidation → review → summary → apply) already handles partial `analyzedRepos` arrays — it just needs them to be non-empty.

## Goals / Non-Goals

**Goals:**
- Allow ESC to interrupt the analysis phase at any point
- In-flight AI calls at the moment of ESC complete normally (no cancellation of in-progress HTTP requests)
- No new analysis requests are started after ESC is pressed
- A prompt gives the user the choice to continue with partial results or exit
- If the user chooses to continue, the post-analysis workflow (consolidation, review, summary, apply) proceeds exactly as today using only the already-analyzed repos

**Non-Goals:**
- Cancelling in-flight HTTP requests (too complex, minimal benefit)
- Resuming a previously interrupted session from disk
- Exposing the interrupt in the `--analyze-only` headless mode

## Decisions

### D1: Serial queue instead of `Promise.all` for the interactive analysis loop

**Decision:** Replace the `Promise.all(filteredRepos.map(...))` analysis loop with a serial queue that checks an `interrupted` flag before dispatching each repo.

**Why:** `Promise.all` fires all promises simultaneously (up to the semaphore limit). There is no safe way to prevent additional dispatches once the promises are created. A serial queue — a simple `for…of` loop with an `aborted` boolean check — lets us stop dispatching new work immediately when ESC is pressed. In-flight requests finish naturally.

**Alternative considered:** A semaphore/p-limit approach where we call `abort()` on each pending slot. Rejected because it requires cancelling in-flight fetch requests (AbortController plumbing throughout the AI layer) for a marginal UX improvement.

**Note:** The headless `runAnalyzeOnly` path keeps `Promise.all` unchanged — no interrupt is needed there.

### D2: `interrupted` flag owned by the orchestration closure, signalled via Ink `useInput`

**Decision:** A mutable `let interrupted = false` flag lives in the `main()` orchestration closure. An `onAnalysisInterrupt` callback is threaded into `LoadingScreen` (and wired up in `ReactiveApp`), where `useInput` sets it when ESC is pressed during `analyzing`.

**Why:** This follows the same pattern already used for `onConfirm`, `onScopeSelect`, etc. — a callback bridge from Ink event handlers back to the async orchestration loop. No new state management machinery needed.

**Alternative considered:** Using a `Promise` that resolves on ESC and racing it with the analysis loop via `Promise.race`. Rejected because the serial loop approach is simpler and doesn't require restructuring the loop into a promise.

### D3: New `interrupt-confirm` phase with a dedicated component

**Decision:** Add `{ tag: "interrupt-confirm"; analyzedCount: number; totalCount: number }` to `AppPhase` and a new `InterruptConfirmScreen` component with yes/no selection.

**Why:** Reusing `ConfirmScreen` would require awkward prop overloading. A dedicated component keeps the confirm screens independent and clearly named. The component follows the same yes/no pattern as `ConfirmScreen`.

## Risks / Trade-offs

- **Race: ESC pressed while last batch finishes** → `interrupted` flag is checked before each dispatch; the last in-flight batch completes and its results are included. This is correct — we never lose already-completed work.
- **Zero repos analyzed when ESC pressed immediately** → The `interrupt-confirm` prompt is still shown. If user selects yes with 0 analyzed repos, the flow reaches consolidation/review with an empty list. Guard: if `analyzedRepos.length === 0`, show an info message ("No repos analyzed yet") and exit instead of entering the confirm prompt.
- **Serial loop is slower than `Promise.all` for normal (non-interrupted) runs** → Concurrency is preserved: the serial queue dispatches up to `concurrency` concurrent requests using a semaphore (same effective throughput as before). Only the dispatch mechanism changes, not the parallelism.

## Open Questions

- Should the ESC hint in `LoadingScreen` be suppressed during the `fetching` phase (where ESC has no effect)? Current plan: only show it during `analyzing`.
