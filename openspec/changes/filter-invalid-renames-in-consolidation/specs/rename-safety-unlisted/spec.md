## MODIFIED Requirements

### Requirement: Rename eligibility is restricted when scope is unlisted-only
When `allow-rename` strategy is active and scope is `unlisted-only`, the system SHALL only propose renaming lists whose `repoIds.length` is **≤ 1**. Lists with two or more existing repos SHALL be pre-claimed as ineligible for renaming, because their contents were not analysed and the AI-derived name may not fit them. Additionally, even for lists with 0–1 repos, the system SHALL NOT emit a `rename-list` unless the membership-evidence requirement is also satisfied (see `rename-eligibility-by-membership`). Because repos inside existing lists are not analysed in `unlisted-only` scope, the membership-evidence check will always fail for those lists, meaning no `rename-list` suggestions are emitted in `unlisted-only` scope regardless of `repoIds.length`.

#### Scenario: Non-empty list with multiple repos is not proposed for rename
- **WHEN** strategy is `allow-rename`, scope is `unlisted-only`, and an existing list has two or more repos in `repoIds`
- **THEN** the system SHALL treat that list as claimed and SHALL NOT emit a `rename-list` suggestion for it

#### Scenario: Empty list is not proposed for rename due to absent membership evidence
- **WHEN** strategy is `allow-rename`, scope is `unlisted-only`, and an existing list has zero repos
- **THEN** the system SHALL NOT emit a `rename-list` suggestion for it, because no analyzed repo can be in an empty list and the membership-evidence check therefore fails

#### Scenario: Single-repo list is not proposed for rename due to absent membership evidence
- **WHEN** strategy is `allow-rename`, scope is `unlisted-only`, and an existing list has exactly one repo
- **THEN** the system SHALL NOT emit a `rename-list` suggestion for it, because that repo was not analysed in `unlisted-only` scope and the membership-evidence check therefore fails

#### Scenario: No eligibility restriction applies when scope is all
- **WHEN** strategy is `allow-rename` and scope is `all`
- **THEN** the system SHALL apply no pre-claim restriction based on `repoIds.length`; rename eligibility is determined solely by the membership-evidence check
