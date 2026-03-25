## Why

GitHub enforces a hard limit of 32 lists per account. The AI consolidation step currently has no awareness of this constraint — it may propose new list names that, combined with existing lists, would exceed the cap, causing `create-list` mutations to fail at runtime.

## What Changes

- Pass the count of existing lists and the count of distinct new lists about to be created into the consolidation step so the AI knows the total projected list count.
- Update the consolidation prompt to instruct the AI to merge or rename proposed categories so the final list count stays at or below 32.
- When the projected total still exceeds 32 after consolidation, surface a clear warning to the user listing which proposed categories were merged into more-generic buckets, and suggest manual review.
- Expose the existing list names to the consolidation prompt (they are already passed to the per-repo analysis prompt but **not** to `buildConsolidationPrompt`).

## Capabilities

### New Capabilities
- `github-list-limit-awareness`: Consolidation step is aware of existing lists, the 32-list cap, and actively avoids exceeding it by merging new proposed categories — with a user-visible suggestion when merging occurs.

### Modified Capabilities
- `ai-analysis`: The consolidation prompt now receives existing list names and the 32-list budget constraint.

## Impact

- `src/ai/prompts.ts` — `buildConsolidationPrompt` signature gains `existingListNames` and `maxLists` parameters.
- `src/ai/consolidator.ts` — callers of `buildConsolidationPrompt` must pass existing list names and cap.
- `src/engine/suggestionEngine.ts` or the orchestration layer — must compute projected list count and pass to consolidator.
- UI / TUI layer — must display the merge-suggestion warning when categories are collapsed.
