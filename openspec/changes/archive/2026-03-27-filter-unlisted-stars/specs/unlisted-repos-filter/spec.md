## ADDED Requirements

### Requirement: User can opt in to analyze only unlisted repos
The system SHALL prompt the user at startup to choose between analyzing all starred repos or only those not yet assigned to any GitHub list. When the user selects "unlisted only", the system SHALL exclude any repo whose `listIds` array is non-empty from the working set before analysis begins.

#### Scenario: User selects unlisted-only mode
- **WHEN** the user is presented with the scope selection prompt and chooses "Unlisted repos only"
- **THEN** the system SHALL filter the fetched repo set to repos with `listIds.length === 0` before passing them to the analysis pipeline

#### Scenario: User selects all-repos mode (default)
- **WHEN** the user chooses "All starred repos" or accepts the default
- **THEN** the system SHALL pass the full fetched repo set to analysis, preserving existing behavior

### Requirement: Empty working set is handled gracefully
The system SHALL detect when the filtered repo set is empty after applying the unlisted-only filter and SHALL exit early with an informative message rather than proceeding to an empty analysis run.

#### Scenario: All starred repos are already in lists
- **WHEN** the user selects "Unlisted repos only" and every fetched starred repo has at least one entry in `listIds`
- **THEN** the system SHALL display a message such as "All your starred repos are already organized — nothing to do!" and exit cleanly without error

### Requirement: Active filter is indicated in the UI
When the unlisted-only filter is active, the system SHALL make this visible during the loading and summary steps so the user understands the scope of the current run.

#### Scenario: Filter indicator shown during loading
- **WHEN** the unlisted-only filter is active and the loading screen is displayed
- **THEN** the loading screen SHALL include a label or note indicating the run is scoped to unlisted repos only

#### Scenario: Filter indicator shown in summary
- **WHEN** the unlisted-only filter is active and the summary screen is displayed
- **THEN** the summary SHALL include a note indicating results cover only unlisted repos
