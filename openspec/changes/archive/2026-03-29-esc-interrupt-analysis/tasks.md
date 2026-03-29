## 1. Analysis Loop — Interruptible Queue

- [x] 1.1 Add `interrupted` flag and `onAnalysisInterrupt` callback to the orchestration closure in `src/index.tsx`
- [x] 1.2 Replace the `Promise.all` fan-out in the interactive analysis loop with a semaphore-based serial queue (`for…of` + concurrency counter) that checks `interrupted` before dispatching each repo
- [x] 1.3 After the loop, check if `interrupted` is true and transition to the `interrupt-confirm` phase instead of continuing to consolidation

## 2. AppPhase — New interrupt-confirm Phase

- [x] 2.1 Add `{ tag: "interrupt-confirm"; analyzedCount: number; totalCount: number }` to the `AppPhase` union type in `src/index.tsx`
- [x] 2.2 Add `onInterruptChoice` callback type (`(choice: "continue" | "save" | "exit") => void`) to the app prop interfaces
- [x] 2.3 Wire up `interrupt-confirm` phase rendering in the `App` component JSX and in `SHOW_STEPS_TAGS`

## 3. InterruptConfirmScreen Component

- [x] 3.1 Create `src/components/InterruptConfirmScreen.tsx` with props: `analyzedCount`, `totalCount`, `onChoice`
- [x] 3.2 Render the analyzed/total counts and the three options (continue / save / exit) using Ink's `useInput` for selection; when `analyzedCount === 0` show only the exit option
- [x] 3.3 Display ESC-interrupt context: "Analysis stopped. X of Y repos analyzed."

## 4. LoadingScreen — ESC Hint

- [x] 4.1 Add optional `onInterrupt` callback prop to `LoadingScreen`
- [x] 4.2 Use Ink's `useInput` inside `LoadingScreen` to detect ESC and call `onInterrupt` when `phase === "analyzing"` and `onInterrupt` is provided
- [x] 4.3 Render a dimmed hint line `"Press ESC to stop and continue with analyzed repos"` when `phase === "analyzing"`

## 5. Orchestration — Interrupt Choice Handling

- [x] 5.1 Handle `"continue"` choice: proceed to `consolidateCategories` → `generateSuggestions` → `review` phase using the partial `analyzedRepos` array (existing flow, no changes needed)
- [x] 5.2 Handle `"save"` choice: build session JSON from partial `analyzedRepos` and `suggestions` (run consolidation + generateSuggestions first), transition to `save-prompt` phase, write file on submit, then exit
- [x] 5.3 Handle `"exit"` choice: unmount and call `process.exit(0)`
- [x] 5.4 Guard: if `analyzedCount === 0` and choice is `"continue"`, show info message "No repos were analyzed — nothing to organize" and exit

## 6. Tests

- [x] 6.1 Unit test `InterruptConfirmScreen`: verify three options render when `analyzedCount > 0`, only exit when `analyzedCount = 0`
- [x] 6.2 Unit test `LoadingScreen`: verify ESC hint present when `phase="analyzing"`, absent when `phase="fetching"`
