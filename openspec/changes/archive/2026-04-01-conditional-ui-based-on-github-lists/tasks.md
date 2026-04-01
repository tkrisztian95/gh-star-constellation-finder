## 1. State / Phase Types

- [x] 1.1 Add `listCount: number` field to the `confirm` phase type in `src/state/phases.ts`
- [x] 1.2 Add `hasLists: boolean` field to the `pick-strategy` phase type in `src/state/phases.ts`

## 2. Orchestration Logic

- [x] 2.1 Pass `listCount: lists.length` when calling `setPhase({ tag: "confirm", ... })` in `src/orchestration/main.tsx`
- [x] 2.2 Wrap the `pick-scope` phase transition with `if (lists.length > 0)` guard; auto-set `scopeMode = "all"` when skipped in `src/orchestration/main.tsx`
- [x] 2.3 Pass `hasLists: lists.length > 0` when calling `setPhase({ tag: "pick-strategy", ... })` in `src/orchestration/main.tsx`
- [x] 2.4 Wrap the `pick-strategy` phase transition with `if (lists.length > 0)` guard; auto-set `strategy = "keep-existing"` when skipped in `src/orchestration/main.tsx`

## 3. UI Components

- [x] 3.1 Update `ConfirmScreen` props interface to accept `listCount: number` and render it alongside the repo count
- [x] 3.2 Update the `fetching-initial` loading message in `LoadingScreen` to say "Fetching starred repositories and lists..." (covers the case where `phase === "fetching"` and `total === 0`)
- [x] 3.3 Add `hasLists?: boolean` prop to `StrategyScreen`; conditionally hide "Re-create all" and "Allow rename" options and remove their key bindings when `hasLists === false`
- [x] 3.4 Pass `listCount={phase.listCount}` to `ConfirmScreen` in `AppRoot`
- [x] 3.5 Pass `hasLists={phase.hasLists}` to `StrategyScreen` in `AppRoot`

## 4. Tests

- [x] 4.1 Update `ConfirmScreen` unit test (if any) to pass `listCount` prop
- [x] 4.2 Update `StrategyScreen` unit test (if any) to cover `hasLists = false` rendering
- [x] 4.3 Update orchestration/phase-transition tests (if any) to assert scope and strategy bypass when `lists` is empty
