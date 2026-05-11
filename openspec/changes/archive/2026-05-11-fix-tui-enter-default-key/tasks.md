## 1. Fix Enter-key detection in TUI screens

- [x] 1.1 Update `src/components/ScopeScreen.tsx` to take `(input, key)` in `useInput` and use `key.return` instead of `input === ""` for default-option selection
- [x] 1.2 Update `src/components/StrategyScreen.tsx` the same way — `key.return` replaces `input === ""` for the `"keep-existing"` default
- [x] 1.3 Update `src/components/ConfirmScreen.tsx` so the `[y/N]`-style default fires on `key.return`
- [x] 1.4 Update `src/components/InterruptConfirmScreen.tsx` so both `analysisInProgress` branches default-select on `key.return` (continue / exit respectively)
- [x] 1.5 Update `src/components/SummaryScreen.tsx` so the `[y/N]` confirm defaults on `key.return`
- [x] 1.6 Grep `src/components/` for any remaining `input === ""` to confirm zero occurrences after the edits (also fixed `QuitConfirmPrompt` inside `ReviewScreen.tsx`, same bug class — `[y/N]` prompt was using `input === ""`)

## 2. Tests

- [x] 2.1 Add Bun tests in `src/__tests__/` that exercise each affected screen by rendering it with `ink-testing-library` (or equivalent) and asserting that pressing Enter invokes the default callback (chose the "equivalent" path: per-screen pure resolver helpers exported for testing, matching the existing `resolveInterruptChoice` precedent — avoids adding `ink-testing-library` as a dev dep for a 5-line-per-screen fix)
- [x] 2.2 Verify numeric/letter shortcut paths (`1`/`2`/`3`/`y`/`n`) still dispatch correctly on each screen

## 3. Quality gates

- [x] 3.1 `bun run typecheck` is clean
- [x] 3.2 `bun run lint` is clean
- [x] 3.3 `bun run format:check` is clean
- [x] 3.4 `bun run test` passes, including new tests (note: `bun run test` only runs the first glob match — pre-existing script bug, affects CI too. New tests verified by running `bun run src/__tests__/tuiDefaultKey.test.ts` and `bun run src/__tests__/interruptAnalysis.test.ts` directly. Worth filing a follow-up issue for the test-runner script — out of scope here.)
- [x] 3.5 Manual smoke test in a real terminal: launch the TUI, press Enter on the scope prompt, confirm scope=1 is selected and the flow advances (verified by repo owner)
