### Requirement: User can opt in to analyze only unlisted repos
The system SHALL prompt the user at startup to choose between analyzing all starred repos or only those not yet assigned to any GitHub list, **but only when the user has at least one existing GitHub list**. When the user has no lists, this prompt SHALL be skipped and the system SHALL proceed as if "All starred repos" was selected. When the user selects "unlisted only", the system SHALL exclude any repo whose `listIds` array is non-empty from the working set before analysis begins. The system SHALL pass the active `scopeMode` value to the strategy selection screen so that strategy options can be presented with scope-aware context.

#### Scenario: Scope prompt is presented when user has lists
- **WHEN** the user confirms they want to proceed and `lists.length > 0`
- **THEN** the system SHALL display the scope selection prompt

#### Scenario: Scope prompt is skipped when user has no lists
- **WHEN** the user confirms they want to proceed and `lists.length === 0`
- **THEN** the system SHALL skip the scope selection prompt and automatically use `scopeMode = "all"`

#### Scenario: User selects unlisted-only mode
- **WHEN** the user is presented with the scope selection prompt and chooses "Unlisted repos only"
- **THEN** the system SHALL filter the fetched repo set to repos with `listIds.length === 0` before passing them to the analysis pipeline

#### Scenario: User selects all-repos mode (default)
- **WHEN** the user chooses "All starred repos" or accepts the default
- **THEN** the system SHALL pass the full fetched repo set to analysis, preserving existing behavior

#### Scenario: scopeMode is forwarded to strategy screen
- **WHEN** the scope selection completes and the strategy screen is rendered
- **THEN** the system SHALL pass the resolved `scopeMode` as a prop to `StrategyScreen` so it can conditionally render scope-aware notes

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

### Requirement: Scope options show their repo counts
The scope selection prompt SHALL display the number of repos each scope option covers, so the user can see the size of each scope before choosing. The counts SHALL be derived from the already-fetched repo set: the "All starred repos" option SHALL show the total repo count, and the "Unlisted repos only" option SHALL show the count of repos whose `listIds` array is empty. This is a display-only addition and SHALL NOT change which repos are selected by either scope.

#### Scenario: Counts are shown next to each scope option
- **WHEN** the scope selection prompt is displayed and `lists.length > 0`
- **THEN** the "All starred repos" option SHALL show the total repo count and the "Unlisted repos only" option SHALL show the count of repos with `listIds.length === 0`

#### Scenario: Counts reflect the fetched repo set after any limit
- **WHEN** a `--limit` is applied to the fetched repos before scope selection
- **THEN** the displayed counts SHALL reflect the limited working set, matching the repos that will actually be analyzed

#### Scenario: Unlisted count of zero is still displayed
- **WHEN** every fetched repo already belongs to at least one list
- **THEN** the "Unlisted repos only" option SHALL show a count of `0`
