## Why

The current Langfuse integration only uses `generation` observations for AI model calls and a single top-level `trace` with basic run metadata. This gives minimal visibility into the full execution pipeline — phases like analysis, consolidation, review, and error events are invisible in the Langfuse UI, and the run-level metadata lacks useful context for debugging and cost tracking.

## What Changes

- Introduce `span` observations wrapping the major pipeline phases: analysis batch, consolidation, and review
- Introduce `event` observations for discrete milestones: run start, ESC interrupt, phase transitions
- Enrich the top-level trace metadata with: total repo count, filtered repo count, list names, model ID, concurrency setting, and OS/runtime info
- Add structured metadata to each `generation` observation: repo full name, owner, category result, token usage already captured but not annotated with model cost info
- Add `agent` observation wrapping the full constellation-run to make the orchestration flow visible as a decision-making unit
- Preserve existing behaviour: tracing errors must never affect analysis; no-op when credentials absent

## Capabilities

### New Capabilities

- `langfuse-span-phases`: Span observations wrapping analysis, consolidation, and review phases with start/end timing and phase-level metadata
- `langfuse-event-milestones`: Event observations for discrete run milestones (run-start, interrupt, phase-complete)
- `langfuse-enriched-metadata`: Enriched metadata on the root trace and on each generation — model ID, repo full name, filtered/total counts, list names, concurrency

### Modified Capabilities

- `prompt-tracing`: Generation observations gain richer metadata (repo full name, assigned category, model cost hint); root trace metadata is extended with new fields

## Impact

- `src/ai/tracing.ts`: New helper functions for span/event/agent creation; `createRunTrace` metadata type extended
- `src/orchestration/main.tsx`: Pass enriched metadata fields to `createRunTrace`; wrap phases with agent/span helpers
- `src/orchestration/analysis.ts`: Wrap analysis batch in a span; pass span as parent to per-repo generations
- `src/orchestration/consolidationCoordinator.ts`: Wrap consolidation in a span
- `src/orchestration/review.ts`: Wrap review phase in a span; emit event on completion
- `src/ai/openaiProvider.ts` / `src/ai/ollamaProvider.ts`: Accept optional parent span; pass enriched metadata (repo name, category) to generation end
- No new dependencies — all new types are part of the existing `langfuse` SDK
