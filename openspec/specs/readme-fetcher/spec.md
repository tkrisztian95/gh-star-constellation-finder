# readme-fetcher Specification

## Purpose
TBD - created by archiving change ai-github-stars-tui. Update Purpose after archive.
## Requirements
### Requirement: Fetch README content via GitHub REST API
The system SHALL fetch the default README file for each starred repository using the GitHub REST API endpoint `GET /repos/{owner}/{repo}/readme`.

#### Scenario: README exists and is fetched successfully
- **WHEN** a repository has a README file
- **THEN** the system SHALL base64-decode the content and return the raw text

#### Scenario: Repository has no README
- **WHEN** the GitHub API returns 404 for the README endpoint
- **THEN** the system SHALL return an empty string and the analyzer SHALL fall back to description and topics only

#### Scenario: README fetch returns an API error
- **WHEN** the GitHub API returns a non-404 error (e.g., 503)
- **THEN** the system SHALL log the error, return an empty string, and continue processing the remaining repositories

### Requirement: Truncate README to a safe payload size
The system SHALL truncate README content to a maximum of 4000 characters before passing it to the AI analyzer to prevent excessive token usage and API cost.

#### Scenario: README is within size limit
- **WHEN** the decoded README is 4000 characters or fewer
- **THEN** the system SHALL pass the full content to the analyzer unchanged

#### Scenario: README exceeds size limit
- **WHEN** the decoded README exceeds 4000 characters
- **THEN** the system SHALL truncate at exactly 4000 characters and append `"... [truncated]"` to indicate partial content

### Requirement: Limit concurrent README fetch requests
The system SHALL fetch README files concurrently with a configurable maximum concurrency (default 5) to avoid overwhelming the GitHub REST API.

#### Scenario: Concurrency limit enforced
- **WHEN** there are more repositories than the concurrency limit
- **THEN** the system SHALL process them in batches, never exceeding the configured maximum simultaneous requests

