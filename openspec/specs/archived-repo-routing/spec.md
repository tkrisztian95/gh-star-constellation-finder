# archived-repo-routing Specification

## Purpose
TBD - created by archiving change handle-archived-repos. Update Purpose after archive.
## Requirements
### Requirement: Repo type carries isArchived flag
The `Repo` interface SHALL include an `isArchived: boolean` field. The GitHub GraphQL starred-repositories query SHALL request the `isArchived` field for each node, and `mapRepo` SHALL map it to the `Repo` object.

#### Scenario: Active repo mapped from GraphQL
- **WHEN** a starred repository node has `isArchived: false` in the GraphQL response
- **THEN** the resulting `Repo` object SHALL have `isArchived: false`

#### Scenario: Archived repo mapped from GraphQL
- **WHEN** a starred repository node has `isArchived: true` in the GraphQL response
- **THEN** the resulting `Repo` object SHALL have `isArchived: true`

### Requirement: Archived repos are pre-routed to the Archived category
The suggestion engine SHALL, before invoking AI analysis, check `repo.isArchived`. When `true`, it SHALL assign the repo a synthetic `AnalysisResult` of `{ category: "Archived", killerFeature: "(archived repository)", dataQuality: "sparse" }` and skip the analyser call entirely.

#### Scenario: Archived repo bypasses AI analysis
- **WHEN** `generateSuggestions` receives an archived repo (isArchived = true)
- **THEN** the suggestion engine SHALL produce a suggestion with `analysis.category === "Archived"` without calling the AI analyser

#### Scenario: Active repo follows normal analysis path
- **WHEN** `generateSuggestions` receives a non-archived repo (isArchived = false)
- **THEN** the suggestion engine SHALL call the AI analyser and use its returned category

### Requirement: All archived repos land in a single Archived GitHub List
The suggestion engine SHALL group all archived repos under the canonical list name `"Archived"`, using the existing create-list / move-to-list routing logic.

#### Scenario: First archived repo triggers list creation
- **WHEN** no GitHub List named "Archived" exists and the first archived repo is processed
- **THEN** a `create-list` suggestion SHALL be emitted with `targetListName === "Archived"`

#### Scenario: Subsequent archived repos join the same list
- **WHEN** a `create-list` suggestion for "Archived" has already been emitted
- **THEN** each additional archived repo SHALL emit a `move-to-list` suggestion targeting the same pending "Archived" list

#### Scenario: Archived repo added to existing Archived list
- **WHEN** a GitHub List named "Archived" (case-insensitive) already exists
- **THEN** each archived repo SHALL emit a `move-to-list` suggestion targeting that existing list

