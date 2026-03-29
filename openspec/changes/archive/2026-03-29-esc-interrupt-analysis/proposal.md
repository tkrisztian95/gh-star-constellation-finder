## Why

Users with large numbers of starred repos face long wait times during the AI analysis phase with no way to bail out early. Pressing ESC should give users the option to proceed with whatever repos have already been analyzed, rather than forcing them to either wait for the full analysis or discard all progress.

## What Changes

- The `analyzing` phase now listens for ESC keypress and signals an interrupt to the analysis loop
- When ESC is pressed, in-flight analysis requests complete but no new ones are started
- A new `interrupt-confirm` phase prompts the user: "X of Y repos analyzed. Continue with partial results?" (yes / no)
When repos have been analyzed, the prompt offers three options:
- **Continue with partial results**: consolidation, review, summary, and apply proceed using only the analyzed repos
- **Save partial results to file**: the partial analysis JSON is written to a chosen path, then the app exits (available independently of whether user wants to continue)
- **Exit**: the app exits cleanly

When zero repos have been analyzed, only the exit option is shown.

## Capabilities

### New Capabilities

- `esc-interrupt-analysis`: Interrupt the analysis phase via ESC, confirm whether to continue with partial results, and resume the standard post-analysis workflow if confirmed

### Modified Capabilities

<!-- No existing specs change their requirements -->

## Impact

- `src/index.tsx`: analysis loop must become interruptible (abort flag + serial/controlled concurrency instead of unbounded `Promise.all`)
- `src/components/LoadingScreen.tsx`: add ESC hint text during the `analyzing` phase
- New component `src/components/InterruptConfirmScreen.tsx`: prompt the user after ESC interrupt
- `AppPhase` union: new `interrupt-confirm` phase tag
