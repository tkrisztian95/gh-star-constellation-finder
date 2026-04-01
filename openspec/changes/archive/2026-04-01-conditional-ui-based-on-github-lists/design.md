## Context

The app's setup flow currently has three sequential prompts before analysis begins: confirm, scope selection, and strategy selection. The scope prompt asks whether to analyze all starred repos or only unlisted ones; the strategy prompt asks how consolidation should treat existing lists (keep/recreate/rename). Both prompts assume the user has at least one existing GitHub list—if they have none, both choices in the scope selector and two of the three choices in the strategy selector are behaviorally identical to the default. Presenting them creates user confusion and wastes interaction steps.

Additionally, the initial loading phase and confirm screen don't surface list data. Users see their starred repo count but have no indication of how many lists they already have, which is relevant context for choosing a strategy.

## Goals / Non-Goals

**Goals:**
- Auto-bypass `pick-scope` when `lists.length === 0` (auto-select `"all"`).
- Auto-bypass `pick-strategy` when `lists.length === 0` (auto-select `"keep-existing"`).
- Display list count on the confirm screen alongside repo count.
- Indicate on the `fetching-initial` loading screen that lists are also being fetched.

**Non-Goals:**
- Changing the strategy screen layout or ordering when lists exist.
- Adding any new network calls or caching for list data.
- Modifying the `runAnalyzeOnly` CLI path.

## Decisions

### 1. Skip screens in the orchestration layer, not the UI components

The conditional skip logic belongs in `src/orchestration/main.tsx`, not in the screen components themselves. `main.tsx` already owns the flow (`setPhase` calls and promise awaits), so inserting `if (lists.length === 0) { /* use defaults */ }` guards before the `setPhase({ tag: "pick-scope" })` and `setPhase({ tag: "pick-strategy", ... })` calls is the least invasive option. The screen components remain presentable in isolation (e.g., for tests).

Alternative considered: hide options inside `ScopeScreen` / `StrategyScreen` and auto-submit. Rejected because it bleeds orchestration logic into display components and makes it impossible to distinguish "user chose the only option" from "screen was bypassed".

### 2. Extend `confirm` phase with `listCount`, not a separate phase

The list count is a lightweight addition to the data already in the `confirm` phase object. Adding a `listCount: number` field to the `confirm` phase type and passing it through `AppRoot` → `ConfirmScreen` avoids introducing any new phases or data-fetching paths.

### 3. Thread `hasLists` into `pick-strategy` phase (defensive render)

Even though the screen will be bypassed in `main.tsx` when there are no lists, the `pick-strategy` phase should carry a `hasLists: boolean` flag so `StrategyScreen` can render defensively. This guards against any future path that might reach the screen (e.g., tests, preview modes) without needing a code audit.

### 4. Update `fetching-initial` loading screen message only

The `fetching-initial` phase has no data payload. The simplest fix is to update the static string in `LoadingScreen` from "Fetching starred repositories..." to "Fetching starred repositories and lists..." for the `fetching` phase when `total === 0` (which is the `fetching-initial` state). No new phase data is needed.

## Risks / Trade-offs

- **Risk: future strategies depend on list state** — If a new strategy option is added that also requires existing lists, the `hasLists` guard in `StrategyScreen` must be updated. Mitigation: the flag is explicit and named, not an implicit count check, making it searchable.
- **Risk: `lists.length === 0` is different from "lists not yet fetched"** — The fetch is always completed before `confirm` is shown, so `lists.length` is always accurate at that point. No ambiguity.
