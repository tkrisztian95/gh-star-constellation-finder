## 1. Dependency

- [x] 1.1 Add `ink-text-input` to package.json dependencies and install

## 2. Shared JSON Builder

- [x] 2.1 Extract `buildSessionJson()` helper in `src/index.tsx` (or `src/output.ts`) that accepts `{ runId, summary, suggestions, errors, decisions?, mutationResults? }` and returns the JSON string
- [x] 2.2 Replace inline JSON construction in `runAnalyzeOnly` to use `buildSessionJson()`

## 3. New TUI Phase and Component

- [x] 3.1 Add `{ tag: "save-prompt"; suggestions: Suggestion[]; decisions: Map<number, ReviewDecision>; mutationResults?: MutationResult[] }` to the `AppPhase` union in `src/index.tsx`
- [x] 3.2 Create `src/components/SavePromptScreen.tsx` using `ink-text-input`; renders a file-path input with a "Save session results? (Enter to skip)" label
- [x] 3.3 Wire `SavePromptScreen` into the `App` component's render switch for the `save-prompt` phase
- [x] 3.4 Add `onSavePromptSubmit: (path: string) => void` prop to `AppProps` and `App`

## 4. Orchestration

- [x] 4.1 Add `savePromptResolve` / `savePromptPromise` bridge (same pattern as other phase bridges) in `main()`
- [x] 4.2 After `setPhase({ tag: "done", ... })` and the 500 ms render delay, transition to `save-prompt` phase instead of unmounting
- [x] 4.3 After the user declines to apply (the `"No changes applied"` branch), transition to `save-prompt` phase instead of the `info` phase + exit
- [x] 4.4 In the `save-prompt` resolve handler: if path is empty, unmount and exit; otherwise call `buildSessionJson()` and write the file; catch errors and display them via a brief `info` phase before exiting

## 5. Decisions Serialization

- [x] 5.1 Convert the `Map<number, ReviewDecision>` decisions to the `{ suggestionIndex, decision }[]` array format expected by the spec before passing to `buildSessionJson()`
- [x] 5.2 Ensure `mutationResults` is passed only when changes were applied (leave it `undefined` when the user declined)

## 6. Verification

- [ ] 6.1 Run the app interactively with a small `--limit`, complete the review, save the results, and confirm the JSON contains `runId`, `suggestions`, `decisions`, and (when applied) `mutationResults`
- [ ] 6.2 Verify that pressing Enter at the save prompt exits cleanly without writing any file
- [ ] 6.3 Verify that `--analyze-only` output is unchanged (no `decisions` or `mutationResults` keys)
