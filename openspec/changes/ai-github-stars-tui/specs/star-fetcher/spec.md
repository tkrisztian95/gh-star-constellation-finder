## ADDED Requirements

### Requirement: Fetch all starred repositories via GraphQL
The system SHALL retrieve all repositories starred by the authenticated user using the GitHub GraphQL API, paginating through all pages until the complete list is fetched.

#### Scenario: User has starred repositories
- **WHEN** the authenticated user has starred repositories
- **THEN** the system SHALL return a complete list including name, owner, description, primary language, star count, topics, and current GitHub List memberships

#### Scenario: User has no starred repositories
- **WHEN** the authenticated user has zero starred repositories
- **THEN** the system SHALL display `"No starred repositories found."` and exit cleanly

#### Scenario: Pagination required
- **WHEN** the user has more starred repositories than the GraphQL page size (100)
- **THEN** the system SHALL automatically follow `pageInfo.endCursor` and fetch all subsequent pages before presenting the TUI

### Requirement: Fetch existing GitHub Lists for the user
The system SHALL retrieve all GitHub Lists belonging to the authenticated user, including List name, description, and the set of repositories currently assigned to each List.

#### Scenario: User has existing Lists
- **WHEN** the user has one or more GitHub Lists
- **THEN** the system SHALL include each List's `id`, `name`, and `description` in the data model for use by the suggestion engine

#### Scenario: User has no Lists
- **WHEN** the user has no GitHub Lists
- **THEN** the system SHALL proceed normally; the suggestion engine MAY only generate create-list suggestions

### Requirement: Respect GitHub API rate limits
The system SHALL monitor rate limit headers from the GraphQL API and pause if the remaining quota drops below a safe threshold.

#### Scenario: Rate limit nearly exhausted
- **WHEN** the `X-RateLimit-Remaining` header is below 50
- **THEN** the system SHALL pause and display a countdown until `X-RateLimit-Reset` before continuing
