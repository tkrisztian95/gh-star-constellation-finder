## Context

The app currently runs a single fixed pipeline: fetch → analyse → consolidate → review → apply. Consolidation always treats all existing GitHub lists as immovable — the AI is told to map proposed categories onto names that either match existing lists or are new. There is no mechanism to start fresh or to rename lists.

The prompt is shown via readline before Ink (the TUI) starts, so the strategy selection can use the same readline pattern already in use for the "Proceed? [y/N]" confirmation. The Ink TUI starts only after the strategy is resolved.

## Goals / Non-Goals

**Goals:**
- Present a clear 3-option strategy menu to the user before consolidation.
- Thread the chosen strategy through consolidation, suggestion generation, and mutation application.
- Support `recreate` mode: delete all existing lists before applying new ones.
- Support `allow-rename` mode: emit `rename-list` suggestions so users can approve individual renames in the TUI.
- Keep `keep-existing` as a backward-compatible default with no behaviour change.

**Non-Goals:**
- Automatic / non-interactive strategy selection (no CLI flag for strategy — must be chosen interactively).
- Partial deletion (deleting only some lists) is not in scope; `recreate` deletes all or nothing.
- Undo / rollback of applied mutations.

## Decisions

### Decision 1 — Strategy type as a discriminated union string literal

`ConsolidationStrategy = 'keep-existing' | 'recreate' | 'allow-rename'`

Rationale: simple, serialisable, easy to pass through function signatures without adding object wrappers. Alternatives: a strategy object with flags — rejected as over-engineered for three fixed modes.

### Decision 2 — Strategy prompt before Ink renders

The readline-based `prompt()` helper is already used in `index.tsx` for the "Proceed?" confirmation. The strategy menu uses the same approach: display numbered options, read a single character, default to `keep-existing` on empty/invalid input.

Rationale: keeps the TUI clean (no modal inside Ink), matches existing UX pattern. Alternative: in-Ink selection screen — rejected because it would require new Ink input-handling code for a one-time pre-flight question.

### Decision 3 — `recreate` passes empty existing list names to AI consolidation

In `recreate` mode the consolidation call receives `existingListNames = []` and `maxLists = 32`. This gives the AI full freedom to name categories without inheriting legacy list names.

The actual deletion happens as a pre-apply step in `applyAcceptedSuggestions` (or a dedicated pre-apply function called from `main`) before any create/move operations.

Rationale: the AI shouldn't know about lists that are about to be deleted — passing empty names produces cleaner category names.

### Decision 4 — `allow-rename` emits `rename-list` suggestions via the suggestion engine

When strategy is `allow-rename`, the suggestion engine checks whether the AI-proposed category name differs from an existing list name (case-insensitive). If the AI maps repos to a new name that is close to (or supersedes) an existing list name, a `rename-list` suggestion is emitted instead of `create-list`.

The consolidation prompt gains a sentence instructing the AI that it may propose renamed list names (rather than only mapping to existing names or creating new ones).

Rationale: surfacing renames as discrete reviewable suggestions gives users explicit control over which renames happen. Alternative: rename silently during apply — rejected because users should approve destructive renames.

### Decision 5 — `delete-list` mutations run before creates in `recreate` mode

A new `deleteAllLists(lists, graphqlWithAuth)` helper is called from `main` in `recreate` mode, after user confirms the summary but before `applyAcceptedSuggestions`. This ensures no orphan lists remain.

Rationale: running deletes first avoids name conflicts when re-creating lists with the same names. Alternative: delete as part of the suggestion pipeline — rejected because delete-list suggestions mixed with create-list suggestions complicate the review flow.

## Risks / Trade-offs

- **Data loss risk (recreate mode)**: Deleting all lists is irreversible. → Mitigation: Summary screen prominently warns "This will DELETE all X existing lists" and requires explicit confirmation before apply.
- **Rename races (allow-rename)**: If a list is renamed and repos are being moved to the old name concurrently, GitHub API may return errors. → Mitigation: apply renames before moves in the mutation sequence.
- **AI non-compliance (allow-rename)**: The AI may not respect the rename hint in the prompt and return existing names unchanged. → Mitigation: acceptable fallback — behaves like `keep-existing` with no renames emitted.
- **Large list count slows delete step**: If user has many lists, delete calls are sequential. → Mitigation: parallelise delete mutations (same pattern as current parallel analysis).

## Migration Plan

No data migration required. The change is purely additive to the interactive flow. If a user does not answer the strategy prompt (e.g. pipes stdin), the default `keep-existing` strategy is used, preserving existing behaviour.
