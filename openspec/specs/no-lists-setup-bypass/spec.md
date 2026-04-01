### Requirement: Setup screens are bypassed when user has no GitHub lists
When the fetched list of GitHub lists is empty (`lists.length === 0`), the system SHALL skip both the scope selection and strategy selection screens, automatically applying `scopeMode = "all"` and `strategy = "keep-existing"` without user interaction.

#### Scenario: Scope screen is skipped when user has no lists
- **WHEN** `lists.length === 0` and the confirm phase completes with the user choosing to proceed
- **THEN** the system SHALL NOT enter the `pick-scope` phase and SHALL proceed with `scopeMode = "all"`

#### Scenario: Strategy screen is skipped when user has no lists
- **WHEN** `lists.length === 0` and the scope step has been resolved
- **THEN** the system SHALL NOT enter the `pick-strategy` phase and SHALL proceed with `strategy = "keep-existing"`

### Requirement: Strategy screen renders only the "Keep existing" option when no lists exist
When `StrategyScreen` is rendered with `hasLists = false`, it SHALL display only the "Keep existing" option and SHALL NOT render the "Re-create all" or "Allow rename" options.

#### Scenario: Only option 1 is shown without lists
- **WHEN** `StrategyScreen` receives `hasLists = false`
- **THEN** only the "Keep existing" entry SHALL be visible; "Re-create all" and "Allow rename" SHALL NOT be rendered

#### Scenario: All three options are shown when lists exist
- **WHEN** `StrategyScreen` receives `hasLists = true` (or `hasLists` is omitted)
- **THEN** all three strategy options SHALL be rendered as before

### Requirement: Confirm screen displays list count alongside repo count
The confirm screen SHALL show the number of existing GitHub lists the user has in addition to the starred repo count.

#### Scenario: List count is shown on the confirm screen
- **WHEN** the `confirm` phase is reached and the user has one or more lists
- **THEN** the confirm screen SHALL display the list count next to or below the repo count

#### Scenario: Zero lists shown when user has no lists
- **WHEN** the `confirm` phase is reached and `lists.length === 0`
- **THEN** the confirm screen SHALL display "0 lists" (or equivalent) so the user is aware they have no existing lists

### Requirement: Initial loading screen indicates that lists are being fetched
The `fetching-initial` loading state SHALL communicate that both starred repositories and lists are being fetched, not only repositories.

#### Scenario: Loading message covers both resources
- **WHEN** the app is in the `fetching-initial` phase
- **THEN** the loading screen SHALL display a message that references fetching both starred repositories and lists (e.g., "Fetching starred repositories and lists...")
