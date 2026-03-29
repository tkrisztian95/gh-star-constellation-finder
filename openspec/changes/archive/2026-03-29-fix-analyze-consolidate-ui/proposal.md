## Why

After all repos finish analysis, a `consolidateCategories` AI call runs before moving to the Review screen — but the UI stays frozen on the last "analyzing" frame with the spinner still active, and the step indicator skips straight from Analyze to Review with no consolidation step shown. Users see the analysis counter hit 100% but the app appears stuck.

## What Changes

- Add a `"consolidating"` app phase that is set immediately after analysis completes and before `consolidateCategories` runs.
- Add a "Consolidate" step to `StepIndicator` between Analyze and Review.
- Render a loading/progress UI for the `"consolidating"` phase so users know the app is working.
- Include `"consolidating"` in the `SHOW_STEPS_TAGS` set so the step indicator is visible during this phase.
- Merge the "Scope" and "Strategy" entries in `StepIndicator` into a single "Setup" step (both `"pick-scope"` and `"pick-strategy"` map to it), reducing step indicator clutter.

## Capabilities

### New Capabilities
- `consolidate-phase-ui`: A visible "Consolidating" phase in the TUI that bridges the gap between analysis completing and the Review screen appearing, with a step indicator entry and a loading message.

### Modified Capabilities
- `analyze-only-output`: No requirement changes — the headless pipeline already handles consolidation silently and is unaffected.

## Impact

- `src/index.tsx`: Add `"consolidating"` to `AppPhase`, add `SHOW_STEPS_TAGS` entry, set phase before consolidation call.
- `src/components/StepIndicator.tsx`: Insert "Consolidate" step between Analyze and Review; merge "Scope" and "Strategy" into a single "Setup" step.
- `src/components/LoadingScreen.tsx` (or inline in `index.tsx`): Render a simple message for the `"consolidating"` phase.
