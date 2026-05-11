## ADDED Requirements

### Requirement: runAnalysis records per-repo analysis duration
`runAnalysis` SHALL measure wall-clock duration for every repo that enters the analysis loop, including archived repos (fast-path) and repos whose analyzer call throws. The measurement SHALL start when the repo is dequeued from the pending queue and SHALL end when the repo's processing finishes (success, failure, or abort), regardless of which branch executes.

#### Scenario: Successful repo analysis records duration and ok status
- **WHEN** a repo's analyzer call resolves normally
- **THEN** `runAnalysis` records an entry `{ owner, name, durationMs, status: "ok" }` in its returned `analysisTimings` array with `durationMs` ≥ 0

#### Scenario: Failed repo analysis records duration and failed status
- **WHEN** `analyzer.analyze()` throws an error that is not caused by interruption
- **THEN** `runAnalysis` records an entry `{ owner, name, durationMs, status: "failed" }` with `durationMs` reflecting the time spent before the throw

#### Scenario: Archived repo records near-zero duration and skipped status
- **WHEN** `repo.isArchived === true` and the fast-path is taken without an analyzer call
- **THEN** `runAnalysis` records an entry `{ owner, name, durationMs, status: "skipped-archived" }`

#### Scenario: Aborted repo records duration and aborted status
- **WHEN** `interruptedRef.value` becomes true during the analyzer call for a repo
- **THEN** `runAnalysis` records an entry `{ owner, name, durationMs, status: "aborted" }` for that repo and excludes the repo from `analyzedRepos` as today

### Requirement: runAnalysis returns total analysis duration
`runAnalysis` SHALL return `analysisDurationMs: number` alongside its existing `analyzedRepos`, `analysisErrorCount`, and `analysisStartTime` fields. `analysisDurationMs` SHALL equal `Date.now() - analysisStartTime` captured immediately before the function returns.

#### Scenario: Total duration is returned
- **WHEN** `runAnalysis` resolves
- **THEN** the resolved value SHALL include `analysisDurationMs` as a non-negative number

#### Scenario: Total duration reflects interrupt path
- **WHEN** the run is interrupted via ESC before all repos complete
- **THEN** `analysisDurationMs` SHALL reflect the wall-clock time from start until the loop exits, not the time the full set would have taken

### Requirement: Duration formatting helper
A duration-formatting helper SHALL render millisecond durations as `Xm Ys` when ≥ 60 seconds, `Ys` when ≥ 1 second, and `Zms` otherwise, where seconds are rounded to the nearest integer.

#### Scenario: Sub-second formatting
- **WHEN** the helper is called with `850`
- **THEN** the returned string SHALL be `850ms`

#### Scenario: Single-digit-second formatting
- **WHEN** the helper is called with `4200`
- **THEN** the returned string SHALL be `4s`

#### Scenario: Minute-and-second formatting
- **WHEN** the helper is called with `134000`
- **THEN** the returned string SHALL be `2m 14s`

#### Scenario: Zero millisecond formatting
- **WHEN** the helper is called with `0`
- **THEN** the returned string SHALL be `0ms`
