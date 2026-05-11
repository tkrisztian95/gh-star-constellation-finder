## ADDED Requirements

### Requirement: RepoInput carries isArchived flag
The `RepoInput` interface SHALL include an `isArchived: boolean` field. `buildUserMessage` SHALL include an `Archived: yes` or `Archived: no` line in the user prompt based on this value.

#### Scenario: Active repo prompt includes Archived: no
- **WHEN** `buildUserMessage` is called with `input.isArchived === false`
- **THEN** the returned string SHALL contain the line `Archived: no`

#### Scenario: Archived repo prompt includes Archived: yes
- **WHEN** `buildUserMessage` is called with `input.isArchived === true`
- **THEN** the returned string SHALL contain the line `Archived: yes`
