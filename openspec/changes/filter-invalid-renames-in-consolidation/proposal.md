## Why

In `allow-rename` mode, the suggestion engine pairs unclaimed existing lists with new AI-output categories and emits `rename-list` for each pairing—even when the unclaimed list has no semantic relationship to the target category. This produces misleading rename suggestions (e.g. "Photography" → "Machine Learning") that the user never asked for. A rename should only be shown when the AI analysis provides evidence that the existing list's current name is wrong—specifically, when analyzed repos that already live in that list were categorized under the new target name.

## What Changes

- **`rename-list` suggestion eligibility tightened**: before emitting a `rename-list` in the `allow-rename` block of `generateSuggestions`, the engine must verify that at least one analyzed repo whose category matches the target name is currently a member of the unclaimed list being renamed.
- When no such repo exists, the `create-list` suggestion is kept as-is and the unclaimed list is not consumed by the rename pairing.

## Capabilities

### New Capabilities

- `rename-eligibility-by-membership`: A guard that validates whether an existing list is a legitimate rename candidate for a given category, based on whether analyzed repos in that list were categorized under the target name.

### Modified Capabilities

- `rename-safety-unlisted`: The rename-safety spec currently restricts rename eligibility by `repoIds.length`. This change adds a second, orthogonal restriction: a rename is only valid when category-membership evidence exists. Both restrictions must be satisfied.

## Impact

- `src/engine/suggestionEngine.ts` — `generateSuggestions` allow-rename pairing block
- `src/__tests__/consolidator.test.ts` — tests for rename suggestion generation
