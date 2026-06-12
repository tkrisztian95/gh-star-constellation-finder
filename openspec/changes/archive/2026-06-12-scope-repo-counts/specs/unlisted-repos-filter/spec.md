## ADDED Requirements

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
