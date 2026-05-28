## MODIFIED Requirements

### Requirement: Cache analysis results to local file
The system SHALL persist AI analysis results to a local SQLite database after each successful repo analysis, keyed by a composite of the repo's GitHub node ID and a SHA-256 hash of its README content. The persisted row SHALL include the `category`, `killer_feature`, `data_quality`, and `description` fields of the result.

#### Scenario: Cache hit skips AI call
- **WHEN** a repo's analysis is requested and a matching cache entry exists (same repo ID and README hash)
- **THEN** the system SHALL return the cached analysis result — including its `description` — without making an AI API call

#### Scenario: Cache miss triggers analysis and persists result
- **WHEN** a repo's analysis is requested and no matching cache entry exists
- **THEN** the system SHALL call the AI analyzer, store the result — including `description` — in the cache database via `INSERT OR REPLACE`, and return the result

#### Scenario: Cache file created on first run
- **WHEN** no cache file exists at `.cache/analysis.db`
- **THEN** the system SHALL create the file, run the `CREATE TABLE IF NOT EXISTS entries` schema (with a `description TEXT NOT NULL` column), set `PRAGMA user_version = 2`, and write the first result to it after the first successful analysis

#### Scenario: Cache survives partial run
- **WHEN** the process is interrupted mid-analysis (e.g., Ctrl-C)
- **THEN** all analysis results obtained before the interruption SHALL be persisted in the cache database, courtesy of SQLite WAL journaling

### Requirement: Corrupt or missing cache file is handled gracefully
The system SHALL handle a missing or unreadable cache database without crashing.

#### Scenario: Missing cache file falls back to empty cache
- **WHEN** the cache database does not exist at startup
- **THEN** the system SHALL create a fresh empty database with the current (v2) schema and proceed with an empty in-memory cache, with no error

#### Scenario: Corrupt cache file falls back to empty cache
- **WHEN** the file at the cache path exists but cannot be opened as a SQLite database (e.g., truncated, garbage bytes, or wrong format)
- **THEN** the system SHALL log a warning, rename the broken file to `<path>.broken.<timestamp>`, open a fresh empty database with the current (v2) schema at the original path, and proceed with an empty in-memory cache

## ADDED Requirements

### Requirement: Schema version migration drops incompatible cache
The system SHALL define a `SCHEMA_VERSION` constant of `2`. When opening an existing cache database whose `PRAGMA user_version` is less than `SCHEMA_VERSION`, the system SHALL drop the `entries` table and recreate it under the current schema, then set `PRAGMA user_version = 2`. This trades the stale-shape cache for a one-time full re-analysis on the next run.

#### Scenario: v1 cache is migrated by clearing
- **WHEN** an existing cache database reports `PRAGMA user_version = 1` (no `description` column)
- **THEN** the system SHALL drop and recreate the `entries` table under the v2 schema, set `user_version` to `2`, and proceed with an empty in-memory cache so the next run re-analyses every repo

#### Scenario: Current-version cache is preserved
- **WHEN** an existing cache database already reports `PRAGMA user_version = 2`
- **THEN** the system SHALL keep all existing entries and SHALL NOT drop the table
