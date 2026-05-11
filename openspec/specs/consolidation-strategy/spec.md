# consolidation-strategy Specification

## Purpose
TBD - created by archiving change consolidation-strategy-selector. Update Purpose after archive.
## Requirements
### Requirement: Strategy selection prompt presented before consolidation
After AI analysis completes and before consolidation begins, the system SHALL display an interactive menu offering three consolidation strategies: `keep-existing`, `recreate`, and `allow-rename`. The user SHALL select one by entering `1`, `2`, or `3`. Pressing Enter without input SHALL default to `keep-existing`.

#### Scenario: User selects keep-existing
- **WHEN** the user enters `1` or presses Enter without input at the strategy prompt
- **THEN** the system proceeds with `keep-existing` strategy and existing lists are preserved

#### Scenario: User selects recreate
- **WHEN** the user enters `2` at the strategy prompt
- **THEN** the system proceeds with `recreate` strategy

#### Scenario: User selects allow-rename
- **WHEN** the user enters `3` at the strategy prompt
- **THEN** the system proceeds with `allow-rename` strategy

#### Scenario: User enters invalid input
- **WHEN** the user enters anything other than `1`, `2`, or `3`
- **THEN** the system defaults to `keep-existing` strategy

### Requirement: Keep-existing strategy preserves all existing lists
When strategy is `keep-existing`, the system SHALL pass all existing list names to the consolidation step, treating them as fixed anchors. The suggestion engine SHALL only propose `create-list` and `move-to-list` operations. No existing list SHALL be deleted or renamed.

#### Scenario: Repo already in correct list
- **WHEN** strategy is `keep-existing` and a repo's AI category matches its current list name (case-insensitive)
- **THEN** no suggestion is emitted for that repo

#### Scenario: Repo assigned to existing list by AI
- **WHEN** strategy is `keep-existing` and a repo's AI category matches an existing list name
- **THEN** a `move-to-list` suggestion is emitted targeting that list

#### Scenario: Repo assigned to new category
- **WHEN** strategy is `keep-existing` and a repo's AI category does not match any existing list
- **THEN** a `create-list` suggestion is emitted (first repo in that category) or `move-to-list` to the pending list

### Requirement: Recreate strategy treats existing lists as non-existent during consolidation
When strategy is `recreate`, the system SHALL pass an empty `existingListNames` array to the consolidation step and use the full 32-list budget. The AI SHALL produce category names unconstrained by legacy list names.

#### Scenario: AI consolidation receives empty existing names in recreate mode
- **WHEN** strategy is `recreate`
- **THEN** `consolidateCategories` is called with `existingListNames = []`

#### Scenario: Full list budget available in recreate mode
- **WHEN** strategy is `recreate`
- **THEN** the consolidation budget is 32 (not 32 minus existing list count)

### Requirement: Recreate strategy deletes all existing lists before applying new ones
When strategy is `recreate` and the user confirms the summary, the system SHALL delete all existing GitHub lists before creating new ones. Deletion SHALL happen in parallel.

#### Scenario: All lists deleted before apply in recreate mode
- **WHEN** strategy is `recreate` and the user confirms the summary screen
- **THEN** all existing lists are deleted via the GitHub API before any `create-list` or `move-to-list` mutations are applied

#### Scenario: Summary screen warns about deletion in recreate mode
- **WHEN** strategy is `recreate` and the summary screen is displayed
- **THEN** the summary screen shows a prominent warning indicating how many existing lists will be permanently deleted

### Requirement: Allow-rename strategy emits rename-list suggestions
When strategy is `allow-rename`, the suggestion engine SHALL emit `rename-list` suggestions when the AI assigns repos to a category name that differs from (but could replace) an existing list name. A `rename-list` suggestion SHALL include the old name, the new name, and the list ID.

#### Scenario: AI proposes a category that supersedes an existing list
- **WHEN** strategy is `allow-rename` and the AI assigns repos to a category name that does not exactly match any existing list but the consolidation AI returns a mapping that displaces an existing list name
- **THEN** a `rename-list` suggestion is emitted for that list instead of a `create-list`

#### Scenario: Accepted rename applied before moves
- **WHEN** a `rename-list` suggestion is accepted in the review and applied
- **THEN** the rename mutation executes before any `move-to-list` mutations targeting that list

#### Scenario: Rejected rename falls back to create-list
- **WHEN** a `rename-list` suggestion is rejected in the review
- **THEN** the existing list retains its name and a new list is created with the AI-proposed name instead

### Requirement: ConsolidationStrategy type defined in shared types
The system SHALL export a `ConsolidationStrategy` type as `'keep-existing' | 'recreate' | 'allow-rename'` from `src/types.ts`. All pipeline functions that are strategy-aware SHALL accept this type as a parameter.

#### Scenario: Strategy type accepted by consolidateCategories
- **WHEN** `consolidateCategories` is called with a `strategy` parameter
- **THEN** it adjusts `existingListNames` and `maxLists` according to the strategy before invoking the AI

#### Scenario: Strategy type accepted by generateSuggestions
- **WHEN** `generateSuggestions` is called with a `strategy` parameter
- **THEN** it emits the appropriate suggestion types based on the strategy

### Requirement: Suggestion type union extended with rename-list and delete-list
The `Suggestion` union type in `src/types.ts` SHALL include `rename-list` (carrying `listId`, `oldName`, `newName`) and `delete-list` (carrying `listId`, `listName`) variants.

#### Scenario: rename-list suggestion rendered in review TUI
- **WHEN** a `rename-list` suggestion is present in the review phase
- **THEN** the TUI displays it as "Rename list '<oldName>' → '<newName>'" with the associated repo context

#### Scenario: delete-list suggestion not shown in review TUI in recreate mode
- **WHEN** strategy is `recreate`
- **THEN** list deletions are not surfaced as individual reviewable suggestions; the warning on the summary screen is sufficient

