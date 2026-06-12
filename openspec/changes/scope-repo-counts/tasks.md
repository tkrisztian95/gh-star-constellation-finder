## 1. Thread counts through the pick-scope phase

- [ ] 1.1 Extend the `pick-scope` variant in `src/state/phases.ts` to `{ tag: "pick-scope"; totalCount: number; unlistedCount: number }`.
- [ ] 1.2 In `src/orchestration/main.tsx`, compute `totalCount = repos.length` and `unlistedCount = repos.filter((r) => r.listIds.length === 0).length`, and pass both into `setPhase({ tag: "pick-scope", totalCount, unlistedCount })`.
- [ ] 1.3 Reuse the same unlisted predicate for the existing `filteredRepos` line to avoid divergence (no behavior change).

## 2. Render counts in ScopeScreen

- [ ] 2.1 Add `totalCount` and `unlistedCount` to `ScopeScreenProps` and accept them in `ScopeScreen` (`src/components/ScopeScreen.tsx`).
- [ ] 2.2 Render the total count next to "All starred repos" and the unlisted count next to "Unlisted repos only" using dim Ink `Text` styling (no emoji).
- [ ] 2.3 Pass `phase.totalCount` / `phase.unlistedCount` from `AppRoot.tsx:112` into `<ScopeScreen />`.

## 3. Tests & quality gates

- [ ] 3.1 Extend the scope-screen test to assert both counts render for the given props (including the `unlistedCount === 0` case).
- [ ] 3.2 Run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` — all clean.
- [ ] 3.3 Verify headless `--analyze-only` is unaffected (ScopeScreen never rendered there).
