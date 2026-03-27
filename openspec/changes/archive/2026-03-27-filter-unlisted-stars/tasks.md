## 1. Scope Prompt UI

- [x] 1.1 Create a `ScopeScreen` Ink component that prompts the user to choose between "All starred repos" and "Unlisted repos only"
- [x] 1.2 Wire `ScopeScreen` into the startup flow in `index.tsx`, between the fetch step and the analysis step (similar to how `StrategyScreen` is wired)
- [x] 1.3 Resolve a `scopeMode` value (`"all"` | `"unlisted-only"`) from the prompt and pass it forward in the orchestration flow

## 2. Filter Logic

- [x] 2.1 After `listIds` is populated on each repo in `index.tsx`, apply the filter: if `scopeMode === "unlisted-only"`, keep only repos where `listIds.length === 0`
- [x] 2.2 Add an early-exit guard: if the filtered set is empty, display a message ("All your starred repos are already organized — nothing to do!") and exit cleanly

## 3. UI Indicators

- [x] 3.1 Update `LoadingScreen` to accept and display an optional `filterLabel` prop; pass `"Unlisted repos only"` when filter is active
- [x] 3.2 Update `SummaryScreen` to show a scope note (e.g., "Scope: unlisted repos only") when the filter was active during the run
