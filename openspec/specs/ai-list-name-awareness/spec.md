# ai-list-name-awareness Specification

## Purpose
TBD - created by archiving change use-existing-lists-in-ai-analysis. Update Purpose after archive.
## Requirements
### Requirement: RepoInput accepts existing list names
`RepoInput` SHALL include an optional `existingListNames: string[]` field containing the names of the user's current GitHub Lists.

#### Scenario: Field is present when lists exist
- **WHEN** the caller has fetched one or more `GitHubList` objects
- **THEN** `RepoInput.existingListNames` SHALL be populated with those list names before being passed to the analyzer

#### Scenario: Field is absent or empty for new users
- **WHEN** the user has no existing GitHub Lists
- **THEN** `RepoInput.existingListNames` SHALL be an empty array or omitted, and analyzer behaviour SHALL be identical to the current baseline

### Requirement: System prompt includes existing list names
The AI system prompt SHALL include the user's existing list names when `existingListNames` is non-empty, instructing the model to prefer an existing name when the repo clearly fits.

#### Scenario: Existing list name matches repo domain
- **WHEN** the AI receives a repo that clearly belongs to a domain already covered by an existing list name
- **THEN** the AI SHALL return that existing list name as the `category` value (case-preserved from input)

#### Scenario: No existing list fits
- **WHEN** none of the existing list names are a good fit for the repo's domain
- **THEN** the AI SHALL invent an appropriate category name following the existing category rules

#### Scenario: No existing lists provided
- **WHEN** `existingListNames` is empty or absent
- **THEN** the system prompt SHALL NOT include the existing-lists section, and the AI SHALL follow the existing category rules unchanged

### Requirement: Existing list names are injected at the session level
The system prompt SHALL be built once per analysis session (not per repo) with the current list of existing names, so all repos in a session use the same context.

#### Scenario: Consistent context across repos in a batch
- **WHEN** multiple repos are analyzed in a single session
- **THEN** all repos SHALL receive the same set of existing list names in their system prompt

