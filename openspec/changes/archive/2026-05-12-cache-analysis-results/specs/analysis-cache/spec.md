## ADDED Requirements

### Requirement: Cache analysis results to local file
The system SHALL persist AI analysis results to a local JSON file after each successful repo analysis, keyed by a composite of the repo's GitHub node ID and a SHA-256 hash of its README content.

#### Scenario: Cache hit skips AI call
- **WHEN** a repo's analysis is requested and a matching cache entry exists (same repo ID and README hash)
- **THEN** the system SHALL return the cached analysis result without making an AI API call

#### Scenario: Cache miss triggers analysis and persists result
- **WHEN** a repo's analysis is requested and no matching cache entry exists
- **THEN** the system SHALL call the AI analyzer, store the result in the cache file, and return the result

#### Scenario: Cache file created on first run
- **WHEN** no cache file exists at `.cache/analysis.json`
- **THEN** the system SHALL create the file and write the first result to it after the first successful analysis

#### Scenario: Cache survives partial run
- **WHEN** the process is interrupted mid-analysis (e.g., Ctrl-C)
- **THEN** all analysis results obtained before the interruption SHALL be persisted in the cache file

### Requirement: Content-based cache invalidation
The system SHALL invalidate a cache entry when the README content of a repo changes, by recomputing the SHA-256 hash and finding no matching entry.

#### Scenario: Updated README triggers re-analysis
- **WHEN** a repo's README has changed since the last run
- **THEN** the system SHALL treat the repo as a cache miss and re-analyze it

#### Scenario: Unchanged README uses cached result
- **WHEN** a repo's README has not changed since the last run
- **THEN** the system SHALL use the cached result and skip the AI call

### Requirement: No-cache flag forces full re-analysis
The system SHALL accept a `--no-cache` CLI flag that bypasses the cache for the current run.

#### Scenario: --no-cache triggers full analysis
- **WHEN** the user runs the CLI with `--no-cache`
- **THEN** the system SHALL analyze all repos via the AI backend regardless of existing cache entries

#### Scenario: --no-cache does not clear the cache file
- **WHEN** the user runs with `--no-cache` and new results are written
- **THEN** the cache file SHALL be updated with the fresh results (not deleted)

### Requirement: Corrupt or missing cache file is handled gracefully
The system SHALL handle a missing or unparseable cache file without crashing.

#### Scenario: Missing cache file falls back to empty cache
- **WHEN** the cache file does not exist at startup
- **THEN** the system SHALL proceed as if the cache is empty, with no error

#### Scenario: Corrupt cache file falls back to empty cache
- **WHEN** the cache file exists but contains invalid JSON
- **THEN** the system SHALL log a warning and proceed with an empty cache, overwriting the corrupt file on the next write
