## Why

The rename card in the review screen gives the user no context about what accepting or rejecting the rename will actually affect. They see `'OldName' → 'NewName'` but don't know which repos will be moved into that list if they accept, or whether there are repos already sitting in the list that were never analyzed. Without this context the rename decision is effectively blind. A secondary gap: after rejecting the rename, subsequent move suggestions still show the proposed new name as the destination with no indication that it will be a freshly created list rather than the original renamed one.

## What Changes

- The rename card SHALL display a preview section listing repos that will be moved into the list if the rename is accepted (derived from `move-to-list` suggestions targeting this rename in the same suggestion set).
- The rename card SHALL display a separate section listing repos already in the list that were not part of the analysis (derived from all starred repos whose `listIds` include this list, minus any that appear in the incoming move suggestions).
- When a `move-to-list` suggestion targets a `rename:` placeholder whose corresponding rename was already rejected or skipped, the review card SHALL display a dimmed note clarifying the repo will land in a newly created list, not the original renamed one.

## Capabilities

### New Capabilities
- `rename-card-repo-preview`: Repo preview sections on the rename card showing incoming repos (from suggestions) and existing unanalyzed repos (from `allRepos`).
- `rename-rejection-move-annotation`: Contextual annotation on move-to-list suggestions when the associated rename was declined, clarifying the actual destination.

### Modified Capabilities

## Impact

- `src/components/ReviewScreen.tsx` — add repo preview to rename card; add post-rejection note to move cards; accept new `repos` prop
- `src/index.tsx` — pass `allRepos` into the `review` phase state and down to `ReviewScreen`
- No type changes to `Suggestion` or engine required
