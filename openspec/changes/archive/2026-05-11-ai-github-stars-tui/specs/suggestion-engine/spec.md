## ADDED Requirements

### Requirement: Generate typed suggestions from AI analysis results
The system SHALL produce one suggestion per repository based on the AI-derived category and the user's existing GitHub Lists.

#### Scenario: Category matches an existing List name
- **WHEN** the AI-derived category closely matches an existing GitHub List name (case-insensitive, trimmed)
- **THEN** the system SHALL generate a `move-to-list` suggestion referencing the existing List

#### Scenario: Category does not match any existing List
- **WHEN** no existing List name matches the AI-derived category
- **THEN** the system SHALL generate a `create-list` suggestion with the AI category as the proposed List name

#### Scenario: Repository is already in the correct List
- **WHEN** the repository is already a member of the List that matches the AI category
- **THEN** the system SHALL skip generating a suggestion for that repository

### Requirement: Deduplicate create-list suggestions
The system SHALL not suggest creating the same new List more than once. If multiple repositories share the same AI category and no matching List exists, the system SHALL generate one `create-list` suggestion and bundle subsequent repos as additional `move-to-list` suggestions referencing the to-be-created List.

#### Scenario: Multiple repos suggest the same new List
- **WHEN** three repositories are all categorized as "Vector Databases" and no such List exists
- **THEN** the system SHALL generate one `create-list` suggestion for "Vector Databases" and `move-to-list` suggestions for all three repos targeting that new List

### Requirement: Expose suggestion count before TUI review
The system SHALL display the total number of generated suggestions before entering the interactive review flow.

#### Scenario: Summary shown before review
- **WHEN** analysis is complete
- **THEN** the system SHALL display `"N suggestions ready for review"` before presenting the first suggestion panel
