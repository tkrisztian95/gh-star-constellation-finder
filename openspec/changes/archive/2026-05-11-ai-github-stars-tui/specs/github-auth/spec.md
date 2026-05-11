## ADDED Requirements

### Requirement: Authenticate via GitHub Personal Access Token
The system SHALL read the GitHub PAT from the `GITHUB_TOKEN` environment variable and use it for all GitHub API calls. If the variable is absent or empty, the system SHALL exit with a clear error message instructing the user to set it.

#### Scenario: Token present and valid
- **WHEN** `GITHUB_TOKEN` is set and accepted by the GitHub API
- **THEN** the system SHALL proceed to fetch starred repositories without prompting the user

#### Scenario: Token absent
- **WHEN** `GITHUB_TOKEN` is not set
- **THEN** the system SHALL print `"Error: GITHUB_TOKEN environment variable is required"` and exit with code 1

#### Scenario: Token invalid or expired
- **WHEN** the GitHub API returns a 401 Unauthorized response
- **THEN** the system SHALL print `"Error: GitHub token is invalid or expired"` and exit with code 1

### Requirement: Validate required OAuth scopes
The system SHALL verify that the provided PAT has at least the `read:user` scope for read access and warn if `write` scope is missing (required for List mutations).

#### Scenario: Token has all required scopes
- **WHEN** the token has `read:user` scope
- **THEN** the system SHALL proceed normally

#### Scenario: Token missing write scope
- **WHEN** the token lacks write scope for Lists
- **THEN** the system SHALL display a non-fatal warning: `"Warning: token may lack write permissions for GitHub Lists — accept actions will fail"` and continue in read-only preview mode
