## Context

The review flow presents suggestions sequentially. When the engine emits an `allow-rename` plan it produces:
1. A `rename-list` suggestion (`listId`, `oldName`, `newName`)
2. One or more `move-to-list` suggestions whose `targetListId` is `"rename:<listId>"` and `targetListName` is the proposed new name

The `applyAcceptedSuggestions` mutator handles the rejected-rename fallback correctly (Pass 1: creates a new list, stores `resolvedListIds.set("rename:<listId>", newListId)`). Both display gaps are purely in the **review UI**:

- **Rename card**: shows only `OldName → NewName` with no repo context. Users cannot see which repos will be moved in or what is already in the list.
- **Move cards after rejection**: after rejecting the rename, subsequent move cards say "Move to 'NewName'" with no indication that NewName will be freshly created.

`ReviewScreen` currently receives `suggestions` and `mergeWarnings`. It does NOT receive the full starred repo list. Each `Repo` has a `listIds: string[]` field that identifies which lists it belongs to. `allRepos` is in scope at the call site in `index.tsx`.

## Goals / Non-Goals

**Goals:**
- Add a repo preview section to the rename card: incoming repos (from suggestions targeting this rename) and existing unanalyzed repos (from `allRepos` filtered by `listIds`).
- Add a dimmed note to move cards when their rename was rejected/skipped, clarifying the actual destination.

**Non-Goals:**
- Changing mutator logic (already correct).
- Showing repo preview on non-rename suggestion cards.
- Altering suggestion ordering or allowing re-decision of a rename from within a move card.
- Surfacing the rejection note when the rename decision is still `undefined`.

## Decisions

### D1 — Pass `repos: Repo[]` as a new prop to `ReviewScreen`; add it to the review phase state

`allRepos` is already in scope in `index.tsx` when transitioning to the `review` phase. Adding it to the phase state and passing it as a prop is the smallest change that gives `ReviewScreen` access to repo names and `listIds` without touching types or the engine.

Alternative considered: enrich `RenameListSuggestion` with `existingRepoIds` or `existingRepoNames` at engine time. Rejected — the engine doesn't receive `allRepos` today and adding it solely for display data couples engine logic to view concerns.

### D2 — Derive incoming repos from `suggestions` inside `ReviewScreen`, not from a pre-computed field

The full `suggestions` array is already in scope. Filtering for `move-to-list` with `targetListId === "rename:" + current.listId"` is O(n) and cheap. No new types or prop surface needed.

### D3 — Derive existing unanalyzed repos as `repos.filter(r => r.listIds.includes(listId))` minus incoming repo IDs

`Repo.listIds` contains the GitHub list IDs the repo belongs to. Cross-referencing against the rename's `listId` gives all repos in that list. Subtracting those that already appear as incoming move suggestions avoids double-counting repos that were analyzed and re-categorized to the same list.

### D4 — Show rejection note on move cards only when the rename decision is explicitly `"rejected"` or `"skipped"`

If the rename card hasn't been reviewed yet the outcome is unknown. Showing a note prematurely could mislead. The rename card always appears before its associated move cards in suggestion order (engine contract), so `undefined` is the normal pre-decision state.

### D5 — Render both sections as compact dimmed lists inside the existing rename card border

Keeps the visual change minimal and consistent with the existing dimmed hint on the rename card (line 159 of `ReviewScreen.tsx`). No new UI component needed.

## Risks / Trade-offs

- [Risk] Large lists could produce many existing-repo entries, making the rename card tall. → Mitigation: cap display at N (e.g. 5) with a "…and X more" suffix.
- [Risk] A `rename-list` for a list with no incoming suggestions and no existing repos is a valid (empty-list rename) case. → Mitigation: omit the section if the list is empty; no special handling needed.
- [Risk] Suggestion order could theoretically place a move card before its rename card. → The rejection-note guard already handles this via `decision !== undefined` (D4).
