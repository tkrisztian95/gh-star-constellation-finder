## ADDED Requirements

### Requirement: Review screen annotates move suggestions when their associated rename was rejected or skipped
When a `move-to-list` suggestion's `targetListId` starts with `"rename:"` and the corresponding `rename-list` suggestion has already been decided as `"rejected"` or `"skipped"` by the user, the review card for that move SHALL display a dimmed contextual note clarifying that the repo will land in a newly created list rather than a renamed one.

#### Scenario: Note shown when rename was rejected
- **WHEN** the user is reviewing a `move-to-list` suggestion whose `targetListId` is `"rename:<X>"` and the `rename-list` suggestion for list `X` was decided as `"rejected"`
- **THEN** the review card SHALL display a dimmed note stating that the rename was declined and the repo will be moved to a newly created list named `targetListName`

#### Scenario: Note shown when rename was skipped
- **WHEN** the user is reviewing a `move-to-list` suggestion whose `targetListId` is `"rename:<X>"` and the `rename-list` suggestion for list `X` was decided as `"skipped"`
- **THEN** the review card SHALL display the same dimmed note as the rejected case

#### Scenario: No note shown when rename was accepted
- **WHEN** the user is reviewing a `move-to-list` suggestion whose `targetListId` is `"rename:<X>"` and the `rename-list` suggestion for list `X` was decided as `"accepted"`
- **THEN** the review card SHALL NOT display any additional annotation

#### Scenario: No note shown when rename has not yet been reviewed
- **WHEN** the user is reviewing a `move-to-list` suggestion whose `targetListId` is `"rename:<X>"` and no decision has been recorded yet for the corresponding `rename-list` suggestion
- **THEN** the review card SHALL NOT display any annotation (the outcome is still undetermined)

#### Scenario: Move suggestion without a rename prefix is unaffected
- **WHEN** the user is reviewing a `move-to-list` suggestion whose `targetListId` does not start with `"rename:"`
- **THEN** the review card SHALL display no rename-related annotation regardless of any other state
