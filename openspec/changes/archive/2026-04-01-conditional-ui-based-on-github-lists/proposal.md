## Why

When a user has no GitHub lists, the scope selector ("unlisted repos only" vs. "all repos") and two of the three consolidation strategy options ("Re-create all" and "Allow rename") become meaningless—there is nothing to filter, nothing to delete, and nothing to rename. Showing those choices clutters the setup flow with options that have no effect. Additionally, the initial loading screen and confirm screen don't surface list data, leaving users without context on how many lists they have when deciding how to proceed.

## What Changes

- **Skip scope selector when user has no lists**: If `lists.length === 0`, the `pick-scope` step is bypassed entirely and `scopeMode` is automatically set to `"all"`.
- **Hide "Re-create all" and "Allow rename" strategy options when user has no lists**: If `lists.length === 0`, only "Keep existing" is available in the strategy screen. Because there is only one option, the screen is skipped and `strategy` is automatically set to `"keep-existing"`.
- **Show list-fetching progress on the initial loading screen**: The `fetching-initial` loading screen currently says only "Fetching starred repositories...". It should indicate that lists are also being fetched.
- **Show list count alongside repo count on the confirm screen**: The confirm screen currently shows only the starred repo count. It should also show how many lists the user already has so they can make an informed decision.

## Capabilities

### New Capabilities

- `no-lists-setup-bypass`: Automatic skipping of scope and strategy selection screens when the user has zero GitHub lists, with auto-selection of sensible defaults.

### Modified Capabilities

- `unlisted-repos-filter`: The scope selection requirement changes — when no lists exist the prompt SHALL be skipped entirely rather than presented.

## Impact

- `src/orchestration/main.tsx`: Conditional logic added around `pick-scope` and `pick-strategy` phase transitions based on `lists.length`.
- `src/state/phases.ts`: `confirm` phase extended with `listCount` field; `pick-strategy` phase extended with `hasLists` field.
- `src/components/ConfirmScreen.tsx`: List count added to the repo-found display line.
- `src/components/LoadingScreen.tsx`: Fetching message updated to mention lists when in the initial fetch phase.
- `src/components/StrategyScreen.tsx`: When `hasLists` is `false`, only option 1 (keep-existing) is rendered and auto-selected.
- `src/components/AppRoot.tsx`: Pass `listCount` to `ConfirmScreen`; pass `hasLists` to `StrategyScreen`.
