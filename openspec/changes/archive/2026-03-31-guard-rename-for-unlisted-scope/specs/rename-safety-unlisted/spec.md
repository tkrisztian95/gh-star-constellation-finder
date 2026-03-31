## ADDED Requirements

### Requirement: Rename eligibility is restricted when scope is unlisted-only
When `allow-rename` strategy is active and scope is `unlisted-only`, the system SHALL only propose renaming lists whose `repoIds.length` is **≤ 1**. Lists with two or more existing repos SHALL be pre-claimed as ineligible for renaming, because their contents were not analysed and the AI-derived name may not fit them.

#### Scenario: Non-empty list with multiple repos is not proposed for rename
- **WHEN** strategy is `allow-rename`, scope is `unlisted-only`, and an existing list has two or more repos in `repoIds`
- **THEN** the system SHALL treat that list as claimed and SHALL NOT emit a `rename-list` suggestion for it

#### Scenario: Empty list remains eligible for rename
- **WHEN** strategy is `allow-rename`, scope is `unlisted-only`, and an existing list has zero repos
- **THEN** the system SHALL treat that list as unclaimed and MAY emit a `rename-list` suggestion for it

#### Scenario: Single-repo list is eligible for rename
- **WHEN** strategy is `allow-rename`, scope is `unlisted-only`, and an existing list has exactly one repo
- **THEN** the system SHALL treat that list as unclaimed and MAY emit a `rename-list` suggestion for it

#### Scenario: No eligibility restriction applies when scope is all
- **WHEN** strategy is `allow-rename` and scope is `all`
- **THEN** the system SHALL apply no pre-claim restriction based on `repoIds.length`; only category-match claiming applies

### Requirement: Strategy screen communicates rename restrictions when scope is unlisted-only
When the strategy selection screen is displayed and the active scope is `unlisted-only`, the system SHALL render a contextual note alongside the `allow-rename` option explaining that only empty or single-repo lists are eligible for renaming and that repos already inside lists will not be analysed.

#### Scenario: Note is shown for allow-rename option in unlisted-only scope
- **WHEN** the strategy selection screen is displayed and `scopeMode` is `unlisted-only`
- **THEN** the screen SHALL display an additional dimmed note under option 3 ("Allow rename") stating that only empty or single-repo lists are eligible for renaming

#### Scenario: No extra note is shown when scope is all
- **WHEN** the strategy selection screen is displayed and `scopeMode` is `all`
- **THEN** the screen SHALL display the standard option descriptions with no additional note about rename restrictions
