## 1. Engine: update rename-eligibility threshold

- [x] 1.1 In `src/engine/suggestionEngine.ts`, change the pre-claim filter from `repoIds.length > 0` to `repoIds.length > 1` so single-repo lists remain eligible for renaming in `unlisted-only` scope

## 2. StrategyScreen: accept scopeMode prop

- [x] 2.1 Add `scopeMode?: ScopeMode` prop to `StrategyScreen` in `src/components/StrategyScreen.tsx` (import `ScopeMode` from `../components/ScopeScreen.js`)
- [x] 2.2 Render a dimmed contextual note under option 3 when `scopeMode === "unlisted-only"`, explaining that only empty or single-repo lists are eligible for renaming because contained repos are not analysed

## 3. Wire scopeMode into StrategyScreen render

- [x] 3.1 In `src/index.tsx`, pass `scopeMode` to `<StrategyScreen>` at the `pick-strategy` phase render site

## 4. Tests

- [x] 4.1 In `src/__tests__/suggestionEngine.test.ts`, add a test asserting that a list with exactly 1 repo is rename-eligible in `unlisted-only` scope (`allow-rename` strategy emits a `rename-list` suggestion for it)
- [x] 4.2 Add a test asserting that a list with 2+ repos is NOT rename-eligible in `unlisted-only` scope (no `rename-list` suggestion)
- [x] 4.3 Add a test asserting that a list with 2+ repos IS rename-eligible in `all` scope (no pre-claim restriction)
