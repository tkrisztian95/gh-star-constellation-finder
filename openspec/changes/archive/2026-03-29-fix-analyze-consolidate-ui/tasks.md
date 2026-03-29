## 1. App Phase

- [x] 1.1 Add `{ tag: "consolidating" }` to the `AppPhase` union type in `src/index.tsx`
- [x] 1.2 Add `"consolidating"` to the `SHOW_STEPS_TAGS` set in `src/index.tsx`
- [x] 1.3 Set phase to `{ tag: "consolidating" }` immediately after the analysis loop completes and before `consolidateCategories` is called

## 2. Step Indicator

- [x] 2.1 Replace the separate "Scope" and "Strategy" entries in `STEPS` with a single `{ label: "Setup", tags: ["pick-scope", "pick-strategy"] }` entry in `src/components/StepIndicator.tsx`
- [x] 2.2 Insert `{ label: "Consolidate", tags: ["consolidating"] }` between the "Analyze" and "Review" entries in the `STEPS` array in `src/components/StepIndicator.tsx`

## 3. UI Rendering

- [x] 3.1 Add a render block in `App` for `phase.tag === "consolidating"` that shows a loading message (e.g., "Consolidating categories…")
