## Context

The app has two execution modes: `--analyze-only` (headless, outputs JSON) and interactive (Ink TUI, applies GitHub mutations). The analyze-only path already writes a structured JSON file via `--output`. The interactive path collects rich data — AI analysis, user decisions per suggestion, and mutation results — but currently exits without offering to persist any of it.

The TUI is driven by an `AppPhase` discriminated union rendered by an `App` component. Phases transition sequentially; the final phases are `applying` → `done` (or early exits to `info`). Adding a save-prompt phase means inserting a new phase after `done` / "no changes" branches.

## Goals / Non-Goals

**Goals:**
- Prompt the user for a file path at the end of every interactive session
- Write a JSON file containing analysis, per-suggestion decisions, and (if applied) mutation results
- Reuse the existing analyze-only JSON schema; extend it with optional `decisions` and `mutationResults` keys
- Keep the prompt non-blocking: pressing Enter (empty input) skips saving

**Non-Goals:**
- Auto-saving without user confirmation
- Changing the `--analyze-only` output format in a breaking way
- Adding a `--save-output` CLI flag (that would bypass the interactive prompt)

## Decisions

**D1: New `save-prompt` TUI phase rather than post-unmount prompt**

The save prompt is inserted as a new `AppPhase` (`{ tag: "save-prompt"; ... }`) rendered by a new `SavePromptScreen` component, keeping all user interaction within the Ink lifecycle.

Alternative: write a plain `readline` prompt after `unmount()`. Rejected because it mixes two input systems (Ink + readline) and breaks the visual frame around the session.

**D2: Text input via `ink-text-input` package**

`SavePromptScreen` uses the community `ink-text-input` component (already a common dependency in Ink apps) for the path field.

Alternative: read a single keypress at a time and build a string manually. Rejected due to complexity; `ink-text-input` is the standard solution.

**D3: Shared JSON builder function**

Extract a `buildSessionJson(...)` helper in `index.tsx` (or a new `src/output.ts` module) that both `runAnalyzeOnly` and the interactive save path call. The function accepts optional `decisions` and `mutationResults` parameters; they are omitted from the output when `undefined`.

Alternative: duplicate the JSON construction. Rejected — both paths must stay in sync as the schema evolves.

**D4: Save happens after `done` AND after "no changes applied" exits**

Both terminal paths (applied successfully, and user declined/nothing to apply) offer the save prompt. The `decisions` and `mutationResults` fields are populated as far as they are available (e.g., `mutationResults` is absent if changes were never applied).

## Risks / Trade-offs

- **`ink-text-input` not yet installed** → Add as a dependency during implementation; it is MIT-licensed and widely used.
- **User types an invalid path** → Write fails with a Node `fs` error. Mitigation: catch the error, display it in the TUI, and re-prompt once; after second failure exit gracefully.
- **Large sessions produce large JSON** → Acceptable; the file is written once and the user opted in by providing a path.
- **Phase insertion breaks existing flow** → Risk is low because the `save-prompt` phase is appended after all existing terminal phases; no existing phase transitions change.
