## Why

The `consolidateCategories` step receives only category name strings, so when it merges proposed names it has no visibility into how many repos sit behind each name or what topics those repos carry. This produces structurally sound but distributionally unbalanced lists — one merged category may end up with 40 repos while another has 3 — because the AI is merging labels, not populations.

## What Changes

- A new "distribution-aware pre-consolidation" prompt is introduced that receives the analyzed repos (name, description, language, topics — no README) grouped by proposed category, and produces a compact distribution summary: per-category repo count and representative topic signals.
- The distribution summary is threaded into the existing consolidation prompt so the AI can weigh merge decisions against actual population sizes and topic overlap, not just name similarity.
- `consolidateCategories` (and its callers in `review.ts`, `analysis.ts`, `cli/modes.ts`) is updated to accept the analyzed repos alongside the proposed names so the new pass can run.

## Capabilities

### New Capabilities

- `consolidation-distribution-context`: A pre-consolidation AI pass that summarises repo counts and topic signals per proposed category, feeding that context into the consolidation prompt to enable distribution-aware merging.

### Modified Capabilities

- `consolidate-phase-ui`: The consolidation phase may show a richer status message while the new distribution pass runs (two sub-steps instead of one).

## Impact

- `src/ai/prompts.ts` — new `buildDistributionSummaryPrompt` function; updated `buildConsolidationPrompt` to accept an optional distribution context string.
- `src/orchestration/consolidationCoordinator.ts` — new pass 0 before the existing language-qualifier pass; updated `consolidateCategories` signature to accept `analyzedRepos`.
- `src/orchestration/review.ts`, `src/orchestration/analysis.ts`, `src/cli/modes.ts` — pass `analyzedRepos` through to `consolidateCategories`.
- No breaking changes to the public CLI interface or suggestion output shape.
