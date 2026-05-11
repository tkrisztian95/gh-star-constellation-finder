## ADDED Requirements

### Requirement: Rename card displays incoming repos that will be moved if accepted
When a `rename-list` suggestion is shown in the review screen, the card SHALL display a section listing the repos from other suggestions in the same set that will be moved into that list (i.e. `move-to-list` suggestions with `targetListId === "rename:<listId>"`). If there are no incoming repos the section SHALL be omitted.

#### Scenario: One or more incoming repos shown
- **WHEN** the rename card is displayed and there are `move-to-list` suggestions targeting `"rename:<listId>"`
- **THEN** the card SHALL render a labeled section (e.g. "Moving in if accepted:") listing each repo as `owner/name`, up to a maximum of 5 entries

#### Scenario: More than 5 incoming repos truncated
- **WHEN** there are more than 5 `move-to-list` suggestions targeting the rename placeholder
- **THEN** the card SHALL display the first 5 repo names and a dimmed suffix indicating the remaining count (e.g. "…and 3 more")

#### Scenario: No incoming repos — section omitted
- **WHEN** no `move-to-list` suggestions target `"rename:<listId>"`
- **THEN** the card SHALL NOT render the incoming-repos section

### Requirement: Rename card displays repos already in the list that were not analyzed
When a `rename-list` suggestion is shown, the card SHALL display a section listing repos that are already members of the list (their `listIds` includes the rename's `listId`) but do not appear as incoming move suggestions. If there are no such repos the section SHALL be omitted.

#### Scenario: One or more existing unanalyzed repos shown
- **WHEN** the rename card is displayed and at least one `Repo` in `allRepos` has `listIds` containing `listId` and is not in the incoming move suggestions
- **THEN** the card SHALL render a labeled section (e.g. "Already in list (not analyzed):") listing each repo as `owner/name`, up to a maximum of 5 entries

#### Scenario: More than 5 existing unanalyzed repos truncated
- **WHEN** there are more than 5 such repos
- **THEN** the card SHALL display the first 5 and a dimmed suffix with the remaining count

#### Scenario: No existing unanalyzed repos — section omitted
- **WHEN** no repos in `allRepos` are in the list outside of the incoming suggestions
- **THEN** the card SHALL NOT render the existing-repos section

#### Scenario: Both sections absent when list is empty and has no incoming repos
- **WHEN** the rename targets an empty list and no move suggestions target it
- **THEN** the rename card SHALL render with neither section present
