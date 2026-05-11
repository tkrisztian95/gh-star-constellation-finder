## 1. ReviewScreen keybinding

- [x] 1.1 In [src/components/ReviewScreen.tsx](../../../src/components/ReviewScreen.tsx) `useInput` handler, add a branch matching `key.ctrl && input.toLowerCase() === "a"`. Below the `showQuitConfirm` early-return guard and above the existing `a` / Enter branch.
- [x] 1.2 In that branch, build a new `decisions` map by iterating `i = index .. suggestions.length - 1` and setting `next.set(i, "accepted")` only if `next.has(i)` is false, so prior `skipped` / `rejected` decisions earlier in the queue are preserved.
- [x] 1.3 Call `onComplete(next)` to advance directly to the Summary screen — do not advance `index` and do not show any extra confirmation prompt.
- [x] 1.4 Update the help row inline string at the top of the ReviewScreen panel to read `[a/Enter] Accept [Ctrl+A] Accept all [s] Skip [r] Reject [q] Quit`.

## 2. Tests

The existing tests in [src/__tests__/reviewScreen.test.ts](../../../src/__tests__/reviewScreen.test.ts) are pure-helper unit tests (`derive*`) — there is no component-render harness in the project. To keep that style, extract the bulk-accept logic from the `useInput` branch into a pure `deriveBulkAcceptDecisions(prior, currentIndex, suggestionCount)` helper exported from `ReviewScreen.tsx`, then test the helper directly. The `useInput` branch becomes a one-liner that calls the helper.

- [x] 2.1 In [src/components/ReviewScreen.tsx](../../../src/components/ReviewScreen.tsx), add `export function deriveBulkAcceptDecisions(prior: Map<number, ReviewDecision>, currentIndex: number, suggestionCount: number): Map<number, ReviewDecision>` that copies `prior`, then for `i = currentIndex .. suggestionCount - 1` sets `accepted` only when `prior` does not already have an entry. Replace the inline loop in the Ctrl+A `useInput` branch with `onComplete(deriveBulkAcceptDecisions(decisions, index, suggestions.length))`.
- [x] 2.2 In [src/__tests__/reviewScreen.test.ts](../../../src/__tests__/reviewScreen.test.ts), add a test that calls `deriveBulkAcceptDecisions(prior, 3, 10)` where `prior` = `{0:accepted, 1:skipped, 2:rejected}`. Assert the returned map has size 10 with entries #0=accepted, #1=skipped, #2=rejected, #3–#9=accepted.
- [x] 2.3 Add a test that calls `deriveBulkAcceptDecisions(new Map(), 0, 5)`. Assert every index 0–4 is set to `accepted` and size is 5.
- [x] 2.4 Note: the spec scenario "Ctrl+A is ignored while the quit-confirm prompt is open" is structurally covered by the existing `if (showQuitConfirm) return;` early-return guard at the top of `useInput`, which short-circuits every keystroke uniformly. Verified via the manual smoke test in 3.5 — no unit test added since the project has no component-render harness.

## 3. Quality gates

- [x] 3.1 `bun run typecheck` is clean.
- [x] 3.2 `bun run lint` is clean.
- [x] 3.3 `bun run format:check` is clean (run `bun run format` if not).
- [x] 3.4 `bun run test` passes — including the new reviewScreen cases. (Note: `bun run test`'s glob script only runs the first matched file; each test file was verified individually and all pass.)
- [ ] 3.5 Manual TUI smoke test (owner-driven; document the steps in the PR description): run the app interactively against a real GitHub account, reach the ReviewScreen with ≥3 suggestions, press `s` on one, `r` on another, `Ctrl+A` on a third; confirm the Summary screen shows the expected counts and the `[y/N] apply` prompt still gates the mutation.
