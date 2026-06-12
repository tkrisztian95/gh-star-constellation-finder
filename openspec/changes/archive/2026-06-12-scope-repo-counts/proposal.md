Tracks #3

## Why

The scope selection screen offers "All starred repos" and "Unlisted repos only" without telling the user how many repos each option covers. The user must guess how much work each scope implies. Both counts are already known at render time (the full repo set is fetched before this screen shows), so surfacing them is a pure, low-risk UX improvement.

## What Changes

- Display the total starred repo count next to the "All starred repos" scope option.
- Display the unlisted repo count next to the "Unlisted repos only" scope option.
- Thread both counts from the orchestration layer (computed from the already-fetched `repos` array) through the `pick-scope` phase into `ScopeScreen` props.
- No behavioural change to scoping/filtering — display only. TUI-only; the analysis pipeline and headless `--analyze-only` path are untouched.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `unlisted-repos-filter`: the scope selection prompt SHALL display the repo count for each scope option (total for "all", unlisted-count for "unlisted only").

## Impact

- `src/components/ScopeScreen.tsx` — accept and render `totalCount` / `unlistedCount`.
- Phase state (`src/state/`) — the `pick-scope` phase carries the two counts.
- `src/orchestration/main.tsx` — compute counts from `repos` and pass them into `setPhase({ tag: "pick-scope", ... })`.
- `src/__tests__/` — extend scope-screen rendering assertions.
- No AI, GitHub-mutation, or session-format impact. Ships as a v0.3.1 patch.
