## Context

The TUI orchestrator (`src/index.tsx`) runs three async phases after repo fetching: analysis, consolidation, and suggestion generation. Only analysis has a dedicated `AppPhase` tag (`"analyzing"`). Consolidation (`consolidateCategories`) runs silently while the phase is still `"analyzing"` with `analyzed === total`, causing the spinner to appear stuck. The `StepIndicator` has no "Consolidate" step between Analyze and Review.

## Goals / Non-Goals

**Goals:**
- Add a `"consolidating"` app phase so the UI transitions cleanly after analysis ends.
- Expose a "Consolidate" step in `StepIndicator` so users can see pipeline progress.
- Render a minimal loading message during consolidation.

**Non-Goals:**
- Changing consolidation logic or the AI call itself.
- Adding a consolidation phase to the `--analyze-only` headless pipeline (it runs silently by design).
- Surfacing consolidation progress (it's a single async call with no incremental progress).

## Decisions

**D1 — Add `"consolidating"` to `AppPhase` (not reuse `"analyzing"`)**
Reusing `"analyzing"` with a different sub-state (e.g., a flag) would require touching every consumer that matches on `"analyzing"`. A new union member is cleaner and consistent with the existing phase-per-step pattern.

**D2 — Inline the loading message for `"consolidating"` in `App` rather than a new component**
Consolidation has no interactive elements and no progress counter — just a spinner message. A dedicated component would be premature. A simple `<Text>` block in `index.tsx` matches how `"applying"` is rendered.

**D3 — Insert "Consolidate" between "Analyze" and "Review" in `StepIndicator`**
This accurately reflects the pipeline order. The step is shown as active during `"consolidating"` and as done once `"review"` is reached.

**D4 — Add `"consolidating"` to `SHOW_STEPS_TAGS`**
The step indicator should remain visible during consolidation, consistent with all other processing phases.

## Risks / Trade-offs

- [Step numbering shifts] Adding a step renumbers all subsequent steps visually (e.g., "Review" becomes step 7 instead of 6). → Acceptable; users aren't keying off step numbers.
- [interrupt-confirm phase] The interrupt-confirm flow also leads to consolidation in the "save" and "continue" paths. These paths already run consolidation silently. For "continue", the main flow's `"consolidating"` phase will cover it naturally. The "save" path exits immediately after consolidation so no phase update is needed there. → No additional changes required.

## Migration Plan

No data migration needed. Changes are purely UI/state additions in the TUI layer. The headless `--analyze-only` path is unaffected.
