## Why

After consolidation, some categories may end up assigned to only one starred repo. Creating a GitHub list for a single repo adds noise and dilutes the value of the list organisation — a list needs at least two members to be meaningful.

## What Changes

- After consolidation remaps categories, detect any new-list candidate that would contain exactly one repo.
- Call the AI with the orphan repo's metadata and the list of available target lists (existing GitHub lists + other pending new lists with ≥2 members) to pick the best match.
- Re-route the repo's suggestion to the AI-chosen list instead of creating a singleton new list.
- If the AI returns no suitable match, fall back to dropping the suggestion and leaving the repo unassigned.
- Surface a warning in the summary screen for each repo that was re-routed or dropped.

## Capabilities

### New Capabilities

- `single-repo-list-rerouting`: Post-consolidation guard that detects new-list suggestions with only one member, uses AI to find the best available target list, and re-routes or drops the suggestion accordingly.

### Modified Capabilities

<!-- No existing spec-level requirements change. -->

## Impact

- `src/engine/suggestionEngine.ts` — re-routing step runs after suggestions are built, before they are returned.
- `src/ai/consolidator.ts` — new exported `rerouteOrphanRepos` function that calls the AI.
- `src/ai/prompts.ts` — new `buildReroutingPrompt` function.
- `src/components/SummaryScreen.tsx` — displays re-routing and drop warnings alongside existing merge warnings.
