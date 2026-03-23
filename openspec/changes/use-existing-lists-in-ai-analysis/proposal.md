## Why

The AI analyzer generates category names without knowing what GitHub Lists the user already has, causing it to invent new names that are semantically equivalent to existing ones (e.g. "Rust CLI Tools" vs "Rust Command Line"). Additionally, when many repos are analyzed in one session, the per-repo analysis naturally produces a long tail of near-duplicate new list names (e.g. "Rust CLI Tools", "Go CLI Utilities", "Python CLI Scripts") that would each become a separate new list — defeating the goal of organised, reusable lists.

## What Changes

- Pass the user's existing GitHub List names to the AI analyzer as part of the prompt context so it prefers matching them
- Update the system prompt to instruct the AI to prefer an existing list name when the repo fits
- Update `RepoInput` to include optional `existingListNames` field
- After per-repo analysis completes, run a single second-pass AI call that receives all proposed *new* category names and returns a consolidated/generalised remapping — reducing list proliferation before suggestions are generated
- Apply the remapping to `analyzedRepos` before passing to the suggestion engine
- The suggestion engine logic remains unchanged — it already handles exact-name matching

## Capabilities

### New Capabilities

- `ai-list-name-awareness`: AI analyzer receives existing list names and prefers them over inventing new category names when a repo fits an existing list
- `category-consolidation`: After per-repo analysis, a second AI pass consolidates proposed new list names into fewer, more general names to reduce list proliferation

### Modified Capabilities

- (none)

## Impact

- `src/ai/types.ts`: `RepoInput` gains optional `existingListNames: string[]`; new `ConsolidationResult` type added
- `src/ai/prompts.ts`: `buildSystemPrompt(existingListNames)` function; new `buildConsolidationPrompt(proposedNames)` function
- `src/ai/` (new or updated): `consolidateCategories` function that makes a single AI call and returns a `Map<string, string>` remapping
- `src/index.tsx`: pass `existingListNames` into per-repo analysis; run consolidation pass after analysis, remap categories before suggestion generation
- No changes to suggestion engine or GitHub mutation logic
