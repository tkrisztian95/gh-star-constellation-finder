## 1. ReviewScreen keybinding

- [x] 1.1 In [src/components/ReviewScreen.tsx](../../../src/components/ReviewScreen.tsx) `useInput` handler, add a branch matching `key.ctrl && input.toLowerCase() === "a"`. Below the `showQuitConfirm` early-return guard and above the existing `a` / Enter branch.
- [x] 1.2 In that branch, build a new `decisions` map by iterating `i = index .. suggestions.length - 1` and setting `next.set(i, "accepted")` only if `next.has(i)` is false, so prior `skipped` / `rejected` decisions earlier in the queue are preserved.
- [x] 1.3 Call `onComplete(next)` to advance directly to the Summary screen — do not advance `index` and do not show any extra confirmation prompt.
- [x] 1.4 Update the help row inline string at the top of the ReviewScreen panel to read `[a/Enter] Accept [Ctrl+A] Accept all [s] Skip [r] Reject [q] Quit`.

## 2. Tests

- [ ] 2.1 In [src/__tests__/reviewScreen.test.ts](../../../src/__tests__/reviewScreen.test.ts), add a test that simulates: accept #1, skip #2, reject #3, then `Ctrl+A` while on #4 of a 10-suggestion queue. Assert `onComplete` is called with a decisions map of size 10 where #1 = `accepted`, #2 = `skipped`, #3 = `rejected`, and #4–#9 = `accepted`.
- [ ] 2.2 Add a test that simulates `Ctrl+A` on the very first suggestion with no prior decisions. Assert `onComplete` is called with every index set to `accepted`.
- [ ] 2.3 Add a test that simulates pressing `q` to open the quit-confirm sub-prompt, then `Ctrl+A`. Assert no `onComplete` call happens and decisions remain empty (i.e. the early-return guard works).

## 3. Quality gates

- [ ] 3.1 `bun run typecheck` is clean.
- [ ] 3.2 `bun run lint` is clean.
- [ ] 3.3 `bun run format:check` is clean (run `bun run format` if not).
- [ ] 3.4 `bun run test` passes — including the new reviewScreen cases.
- [ ] 3.5 Manual TUI smoke test (owner-driven; document the steps in the PR description): run the app interactively against a real GitHub account, reach the ReviewScreen with ≥3 suggestions, press `s` on one, `r` on another, `Ctrl+A` on a third; confirm the Summary screen shows the expected counts and the `[y/N] apply` prompt still gates the mutation.
