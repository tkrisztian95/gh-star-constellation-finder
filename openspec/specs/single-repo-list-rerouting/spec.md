### Requirement: Single-member new lists trigger AI re-routing
The suggestion engine SHALL detect any pending new list with exactly one member after consolidation and invoke AI re-routing for each such orphan repo before returning suggestions.

#### Scenario: Singleton pending list triggers re-routing call
- **WHEN** `generateSuggestions` produces a `create-list` suggestion for a category with no further `move-to-list` entries sharing the same `targetListId`
- **THEN** `rerouteOrphanRepos` SHALL be called with that repo's details and the available target lists before suggestions are returned

#### Scenario: Multi-repo category is not re-routed
- **WHEN** `generateSuggestions` produces a `create-list` suggestion followed by one or more `move-to-list` suggestions sharing the same `targetListId`
- **THEN** those suggestions SHALL be returned unchanged and `rerouteOrphanRepos` SHALL NOT be called for that category

#### Scenario: Existing-list assignments are unaffected
- **WHEN** a repo is assigned to an existing GitHub list (not a new pending list)
- **THEN** that `move-to-list` suggestion SHALL not be subject to re-routing regardless of how many repos map to that list

### Requirement: AI re-routing assigns orphan repos to an available target list
The `rerouteOrphanRepos` function SHALL call the AI with each orphan repo's category and the list of available targets (existing GitHub lists plus pending new lists with ≥2 members). It SHALL return a mapping of orphan category to target list name, or `null` when no suitable target exists.

#### Scenario: AI returns a valid target list
- **WHEN** the AI identifies a suitable target list for an orphan repo
- **THEN** `rerouteOrphanRepos` SHALL return the target list name for that orphan category

#### Scenario: AI returns null for no suitable match
- **WHEN** the AI cannot find a suitable target for an orphan repo
- **THEN** `rerouteOrphanRepos` SHALL return `null` for that orphan category

#### Scenario: Re-routing call fails
- **WHEN** the AI call throws an error (network failure, missing API key)
- **THEN** `rerouteOrphanRepos` SHALL return `null` for all orphan categories and SHALL NOT propagate the error

### Requirement: Orphan suggestion is replaced with a re-routed suggestion
When AI re-routing returns a valid target, the suggestion engine SHALL remove the singleton `create-list` suggestion and replace it with a `move-to-list` suggestion pointing at the chosen target.

#### Scenario: Orphan re-routed to existing list
- **WHEN** `rerouteOrphanRepos` returns an existing GitHub list name for an orphan
- **THEN** the `create-list` suggestion SHALL be removed and a `move-to-list` suggestion with `isPendingCreate: false` SHALL be added pointing at that list's ID

#### Scenario: Orphan re-routed to another pending list
- **WHEN** `rerouteOrphanRepos` returns a pending new list name for an orphan
- **THEN** the `create-list` suggestion SHALL be removed and a `move-to-list` suggestion with `isPendingCreate: true` SHALL be added pointing at the target pending list's ID

### Requirement: Unresolved orphans are dropped and reported
When AI re-routing returns `null` for an orphan, the suggestion engine SHALL remove that repo's suggestion entirely and record the drop in the result.

#### Scenario: Dropped orphan captured in result
- **WHEN** `rerouteOrphanRepos` returns `null` for an orphan category
- **THEN** `SuggestionResult.reroutedRepos` SHALL contain an entry for the repo with `targetList: null`

#### Scenario: Re-routed orphan captured in result
- **WHEN** `rerouteOrphanRepos` returns a target list name for an orphan category
- **THEN** `SuggestionResult.reroutedRepos` SHALL contain an entry for the repo with the target list name

#### Scenario: No orphans yields empty reroutedRepos
- **WHEN** all pending new lists have two or more members
- **THEN** `SuggestionResult.reroutedRepos` SHALL be an empty array

### Requirement: Summary screen displays re-routing outcomes
The summary screen SHALL display a message for each entry in `reroutedRepos`, distinguishing between repos that were successfully re-routed and repos that were dropped.

#### Scenario: Re-routed repo shown with target list name
- **WHEN** a `reroutedRepos` entry has a non-null `targetList`
- **THEN** the summary screen SHALL render a message indicating the repo was moved to the named target list

#### Scenario: Dropped repo shown with warning
- **WHEN** a `reroutedRepos` entry has `targetList: null`
- **THEN** the summary screen SHALL render a warning indicating the repo was not assigned to any list

#### Scenario: No messages shown when no re-routing occurred
- **WHEN** `reroutedRepos` is empty
- **THEN** the summary screen SHALL not render any re-routing-related messages
