## MODIFIED Requirements

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
