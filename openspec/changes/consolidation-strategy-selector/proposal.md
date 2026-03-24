## Why

Currently the app always runs in "additive" mode — it preserves every existing GitHub list and only proposes new ones. Users who want a clean re-organisation have no way to trigger a full redistribution without manually deleting all their lists first. Offering an explicit strategy choice before consolidation runs gives users control over how aggressively the AI should reorganise their stars.

## What Changes

- A strategy-selection prompt is presented to the user after analysis completes but **before** consolidation begins.
- Three strategies are available:
  - **Keep existing** (default): Current behaviour — preserve all existing lists, move repos and create new lists as needed.
  - **Re-create all**: Delete every existing list, then distribute all starred repos into freshly AI-generated lists. Lists may share names with deleted ones.
  - **Allow rename**: Prefer keeping existing lists; rename them when the AI suggests a clearly better name; create new lists only when necessary.
- The consolidation prompt and budget-enforcement logic are made strategy-aware:
  - `keep-existing`: `existingListNames` passed normally; budget = 32 − existing count.
  - `recreate`: `existingListNames` treated as `[]` for the AI; full 32-list budget available; pre-apply step deletes all existing lists.
  - `allow-rename`: `existingListNames` passed to AI; AI may map an existing name to a new name (rename), in addition to merging; suggestion engine emits `rename-list` suggestions.
- The mutator gains a `delete-list` operation (needed for `recreate`) and optionally a `rename-list` operation (needed for `allow-rename`).
- The `SummaryScreen` displays the chosen strategy so users can confirm before changes are applied.

## Capabilities

### New Capabilities

- `consolidation-strategy`: Pre-consolidation strategy selector prompt and strategy-aware consolidation/suggestion pipeline.

### Modified Capabilities

- `ai-analysis`: No requirement changes — AI analysis itself is unaffected; only consolidation inputs change.

## Impact

- `src/index.tsx`: New strategy prompt inserted between analysis and consolidation phases.
- `src/ai/consolidator.ts`: Strategy parameter threaded through consolidation calls.
- `src/ai/prompts.ts`: Consolidation prompt updated to reflect strategy (especially rename hints).
- `src/engine/suggestionEngine.ts`: Strategy-aware suggestion generation (rename-list suggestion type for `allow-rename`).
- `src/github/mutator.ts`: New `delete-list` GraphQL mutation for `recreate`; new `rename-list` mutation for `allow-rename`.
- `src/graphql/mutations.ts`: `DeleteUserList` and `UpdateUserList` (rename) mutations added.
- `src/types.ts`: `Suggestion` union extended with `rename-list` and `delete-list` types; `ConsolidationStrategy` type added.
- `src/components/SummaryScreen.tsx`: Strategy badge added to summary view.
