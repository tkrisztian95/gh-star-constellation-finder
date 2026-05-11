## 1. Reorder ReviewScreen layout

- [x] 1.1 In `src/components/ReviewScreen.tsx`, replace the existing `<Box justifyContent="space-between" marginBottom={1}>` header (counter + hint side-by-side) with a single-child `<Box marginBottom={1}>` containing only the "Suggestion N of M" counter
- [x] 1.2 Add a new `<Box marginTop={1}>` row immediately after the bordered cyan suggestion panel and before the quit-confirm prompt, rendering the keybinding hint text (`[a/Enter] Accept [Ctrl+A] Accept all [s] Skip [r] Reject [q] Quit`) with the same color/style as today
- [x] 1.3 Confirm the quit-confirm prompt still renders last (after the new hint row) when `showQuitConfirm` is true

## 2. Verify quality gates

- [x] 2.1 Run `bun run typecheck` — must be clean
- [x] 2.2 Run `bun run lint` — must be clean
- [x] 2.3 Run `bun run format:check` — must be clean (or `bun run format` to fix)
- [x] 2.4 Run `bun run test` — existing `reviewScreen.test.ts` SHALL still pass without modification (it covers pure `derive*` helpers, not layout)

## 3. Manual smoke test

- [ ] 3.1 Run the TUI (`bun start` or equivalent) end-to-end to the review phase and confirm: counter is above the panel, hint row is below the panel, pressing `a`/Enter/Ctrl+A/`s`/`r`/`q` behaves as before, and the quit-confirm `[y/N]` line still appears at the very bottom when `q` is pressed
