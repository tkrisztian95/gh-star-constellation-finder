# github-mutator Specification

## Purpose
TBD - created by archiving change ai-github-stars-tui. Update Purpose after archive.
## Requirements
### Requirement: Create a new GitHub List via GraphQL mutation
The system SHALL create a new GitHub List using the `createList` GraphQL mutation when the user accepts a `create-list` suggestion.

#### Scenario: List created successfully
- **WHEN** the user accepts a `create-list` suggestion and the mutation succeeds
- **THEN** the system SHALL store the new List's `id` in memory for subsequent `move-to-list` suggestions targeting the same new List

#### Scenario: List creation fails
- **WHEN** the GitHub API returns an error for the `createList` mutation
- **THEN** the system SHALL display the error inline and mark the suggestion as failed without crashing; the user SHALL be able to continue reviewing remaining suggestions

### Requirement: Move a repository to a GitHub List via GraphQL mutation
The system SHALL add a repository to a GitHub List using the `addStarredRepositoriesToList` GraphQL mutation when the user accepts a `move-to-list` suggestion.

#### Scenario: Repository moved successfully
- **WHEN** the user accepts a `move-to-list` suggestion and the mutation succeeds
- **THEN** the system SHALL display `"✓ Moved <repo> to <list>"` in the session log

#### Scenario: Move mutation fails
- **WHEN** the GitHub API returns an error for the move mutation
- **THEN** the system SHALL display the error message and mark the suggestion as failed, continuing with remaining suggestions

### Requirement: Apply mutations only after user confirmation
The system SHALL not issue any GitHub API mutation until the user has explicitly accepted a suggestion (via the TUI) and the session confirmation prompt is accepted.

#### Scenario: No accepted suggestions
- **WHEN** the user reviews all suggestions and accepts none
- **THEN** the system SHALL exit without making any GitHub API mutation calls

#### Scenario: Session summary confirmation
- **WHEN** the user finishes reviewing and has accepted one or more suggestions
- **THEN** the system SHALL display a final summary of accepted actions and prompt `"Apply these N changes? [y/N]"` before executing any mutation

### Requirement: Report mutation results in a session summary
The system SHALL display a final summary after all mutations are applied, listing which succeeded, which failed, and which were skipped or rejected.

#### Scenario: All mutations succeed
- **WHEN** all accepted suggestions are applied without error
- **THEN** the system SHALL print a summary table with a success status for each action

#### Scenario: Some mutations fail
- **WHEN** one or more mutations fail
- **THEN** the system SHALL list failed actions with their error messages and exit with code 1

