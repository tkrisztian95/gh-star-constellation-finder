## Context

The application is a CLI that fetches GitHub starred repos, analyses each one with an LLM, consolidates results into lists, and presents a review UI. It already has a Langfuse integration in `src/ai/tracing.ts` that creates a single root `trace` and records one `generation` per LLM call. The SDK (`langfuse` npm package) supports all standard observation types: `trace`, `span`, `event`, `generation`, and the semantic decorators (`agent`, `tool`, `chain`, `retriever`, etc.).

Currently only `generation` observations are used. The orchestration phases (analysis batch, consolidation, review) are invisible in Langfuse, the root trace metadata is sparse, and generation observations carry no context about the repo or result.

## Goals / Non-Goals

**Goals:**
- Add `span` observations wrapping the three main pipeline phases (analysis, consolidation, review) so Langfuse shows timing and phase-level metadata
- Add an `agent` observation at the root to reflect that the run is an LLM-driven decision process
- Add `event` observations for discrete milestones: run-start, ESC interrupt
- Enrich root trace metadata: model ID, filtered count, list names, concurrency
- Enrich each `generation` with repo full name and the assigned category from the result
- Keep all changes additive and non-breaking: tracing errors are swallowed, null trace short-circuits cleanly

**Non-Goals:**
- Adding the `tool`, `chain`, `retriever`, `evaluator`, `embedding`, or `guardrail` observation types — none map to this application's current code
- Capturing cost data beyond token counts (Langfuse derives cost from model name + token counts automatically)
- Changing the number of LLM calls or the prompt content
- Altering any non-tracing runtime behaviour

## Decisions

### D1: Introduce a `createPhaseSpan` helper in `tracing.ts` rather than inlining SDK calls at call sites

**Rationale:** The span lifecycle (start on entry, end on exit/error) repeats across three phases. A helper keeps the null-safe guard in one place and prevents duplicated try/catch boilerplate in orchestration code.

**Alternative considered:** Inline `trace.span(...)` at each call site. Rejected: every call site would need its own null check and error swallowing, making orchestration files noisier.

### D2: Wrap the full run in a single `agent` span as child of the root trace

**Rationale:** The run is semantically an agent: it uses an LLM to decide list assignments, then acts (mutates GitHub lists). Using the `agent` type in Langfuse makes this explicit and enables agent-level grouping in the UI.

**Alternative considered:** Keep only the root `trace` with no top-level agent span. Rejected: Langfuse's agent view only activates when an `agent` observation is present; without it, the run looks like a flat sequence of generations.

### D3: Thread parent spans through to providers via an optional `parentObservation` parameter

**Rationale:** Generations currently use the root `trace` as parent. After this change, a `generation` inside the analysis phase should be a child of the analysis-phase `span`, giving Langfuse correct nesting. This requires providers to accept either a `LangfuseTrace` or a `LangfuseSpan` as parent.

**Alternative considered:** Keep trace as the flat parent for all generations. Rejected: flat structure loses the phase grouping benefit and makes the timeline hard to read in Langfuse.

### D4: Enrich generation metadata at `endGenerationSafe` time rather than at creation time

**Rationale:** The category result is only known after the LLM responds. Updating the generation at end time (which the SDK supports via `update`) is cleaner than buffering the result elsewhere.

**Alternative considered:** Pass metadata only at creation. Rejected: the assigned category is not yet known when the generation starts.

## Risks / Trade-offs

- **SDK type widening for parent observation** — `LangfuseTrace` and `LangfuseSpan` are both valid parents for a `generation`, but they are different types. The current code uses `LangfuseTrace` everywhere. A union type or a common interface must be introduced in `tracing.ts`. → Mitigation: use `ReturnType<LangfuseTrace["span"]> | LangfuseTrace` as the parent union; both expose `.generation()` and `.span()` in the Langfuse SDK.

- **Increased Langfuse API calls** — Each span and event is an additional SDK call. For a 500-repo run this adds ~6 extra observations (3 phase spans + 1 agent + 2 events). Negligible. → No mitigation needed.

- **Span leak on uncaught throw** — If a phase throws unexpectedly without calling `endSpan`, the span remains open in Langfuse. → Mitigation: `createPhaseSpan` returns a disposer that is always called in a `finally` block at the call site.

## Migration Plan

1. Extend `tracing.ts` with new types and helpers (`createPhaseSpan`, `createMilestoneEvent`, `LangfuseParent` union type)
2. Update `createRunTrace` metadata type and call site in `main.tsx`
3. Update `analysis.ts` to wrap the batch in a span and pass it as parent to providers
4. Update `consolidationCoordinator.ts` similarly
5. Update `review.ts` similarly
6. Update provider `analyze()` and `complete()` signatures to accept `LangfuseParent`
7. Update `endGenerationSafe` to optionally accept a `metadata` patch for category enrichment

No rollback needed — all changes are additive. Removing Langfuse credentials disables all tracing as before.

## Open Questions

- Should the ESC-interrupt event be a child of the analysis span (it fires mid-analysis) or a direct child of the agent span? Lean towards agent span since the interrupt decision is at the orchestration level.
- The `agent` observation type is available in the Langfuse SDK — confirm it is exposed as `trace.agent(...)` or if it requires a `type` field on `span`. Resolve during implementation by checking SDK types.
