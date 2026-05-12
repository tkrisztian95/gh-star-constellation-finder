Tracks #32

## Why

Three consecutive consolidation-phase failures (#26 ctx overrun, #28 empty content under `format:"json"`, #30 `num_predict` cap consumed by thinking tokens) all shared one root cause: the pass-2 consolidation call grows linearly with the number of newly proposed categories, and at scale (60–100 names) the single LLM call exceeds whatever knob is currently dominant — context window, predict budget, or model patience. Each prior fix bought time against one specific knob; the structural problem — "one big call" — remained. Chunking caps each call's prompt and output regardless of input size, removing the entire failure class instead of tuning around it.

## What Changes

- Replace pass-2 of `consolidateCategories` (`src/orchestration/consolidationCoordinator.ts`) with a chunked map-reduce:
  - **Map**: split `deduplicatedNames` into batches of ~25 and run `buildConsolidationPrompt` against each batch in parallel via `provider.complete`. Each batch sees the same `effectiveExistingLists` and the same `effectiveMaxLists` budget so existing-list and "Other" bucket invariants hold per chunk.
  - **Reduce**: collect the union of canonical names produced by the chunks; if their count exceeds `effectiveMaxLists`, run one final small "merge canonicals" call against the existing-list budget. If it fits, skip the reducer.
- Failure isolation: a chunk that fails to parse falls back to identity for its names only; other chunks still benefit.
- Langfuse instrumentation: each chunk is its own `generation` span under the existing `consolidation-phase` span; reducer span is a peer named `consolidate-categories-reduce`.
- File logging: log chunk count, sizes, and per-chunk outcome at info level; per-chunk parse failures keep the existing `logger.warn("consolidation JSON parse failed", …)` shape.

Not breaking — no session JSON or cache file changes. User-visible delta: consolidation wall-clock drops with parallelism, and partial chunk failures degrade gracefully instead of all-or-nothing.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `category-consolidation`: the requirement "consolidation runs after per-repo analysis SHALL run **a single** consolidation AI call" must change — consolidation MAY use multiple AI calls (mapped chunks + optional reducer) provided the externally observable consolidation remapping behaviour is preserved. New requirements: per-chunk failure isolation, and the global budget cap enforced by an optional reducer step.

## Impact

- `src/orchestration/consolidationCoordinator.ts`: pass-2 IIFE replaced by a chunk-and-reduce helper. Outer try/catch and the pass-1 + compose machinery stay.
- `src/ai/consolidatorDelegator.ts`: new helper for chunking + reducing canonical-name unions; `buildConsolidationResult` reused per chunk.
- `src/ai/prompts.ts`: possibly a small new prompt for the reducer call (input: union of canonical names + existing lists + global budget; output: same `{key: value}` remap shape). Reuses the existing prompt shape so `parseRemapping` works unchanged.
- `src/ai/tracing.ts`: no new tracing primitives; existing `createPhaseSpan` / generation spans are sufficient.
- `src/__tests__/consolidator.test.ts`: new tests for chunked happy path, chunk-failure isolation, reducer-skipped (within budget), and reducer-applied (over budget).
- `src/__tests__/prompts.test.ts`: tests for the reducer prompt if added.
- Headless `--analyze-only` parity: same engine path; no flag or output schema changes.
- No new dependencies. No env vars. No CLI flags.
