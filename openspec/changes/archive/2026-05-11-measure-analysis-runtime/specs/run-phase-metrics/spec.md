## ADDED Requirements

### Requirement: PhaseTimings data structure
A `PhaseTimings` interface SHALL be defined with the optional millisecond fields `fetchStarsListsMs`, `fetchReadmesMs`, `analysisMs`, `consolidationMs`, `suggestionsMs`, and `applyMs`. All fields SHALL be non-negative integers when present.

#### Scenario: Type is structurally consistent
- **WHEN** any `PhaseTimings` value is constructed during a run
- **THEN** every present field SHALL be a non-negative integer

#### Scenario: Interrupted run carries partial timings
- **WHEN** the user interrupts during the analysis phase before consolidation begins
- **THEN** the resulting `PhaseTimings` SHALL contain `fetchStarsListsMs`, `fetchReadmesMs`, and `analysisMs` and SHALL NOT contain `consolidationMs`, `suggestionsMs`, or `applyMs`

### Requirement: Fetching phases are measured at call sites
The orchestrator entry points (`main` and `runAnalyzeOnly`) SHALL record `fetchStarsListsMs` around the parallel `fetchStarredRepos` / `fetchUserLists` call and `fetchReadmesMs` around the `fetchAllReadmes` call. The measurement SHALL include error paths (durations recorded even if a fetch rejects, before re-throwing or exiting).

#### Scenario: Successful star fetch records fetchStarsListsMs
- **WHEN** a normal run reaches the README-fetching phase
- **THEN** `phaseTimings.fetchStarsListsMs` SHALL be a non-negative integer

#### Scenario: Failed star fetch still records the duration
- **WHEN** `fetchStarredRepos` rejects
- **THEN** `phaseTimings.fetchStarsListsMs` SHALL be set before the error is surfaced

### Requirement: runAnalysis records analysis-phase timing
`runAnalysis` SHALL return `analysisDurationMs: number` and an `analysisTimings: AnalysisTiming[]` array alongside its existing fields, and SHALL mutate the caller-supplied `PhaseTimings.analysisMs` to the same value. The total SHALL equal `Date.now() - analysisStartTime` captured immediately before the function returns.

#### Scenario: Total analysis duration is returned
- **WHEN** `runAnalysis` resolves
- **THEN** the resolved value SHALL include `analysisDurationMs` as a non-negative integer matching the value written into `PhaseTimings.analysisMs`

#### Scenario: Interrupted analysis reflects time spent
- **WHEN** the run is interrupted via ESC mid-analysis
- **THEN** `analysisDurationMs` SHALL reflect wall-clock time from start until the loop exits, not the time the full set would have taken

### Requirement: Per-repo analysis timing entries
For every repo that enters the analysis loop in `runAnalysis`, exactly one entry of the form `{ owner: string, name: string, durationMs: number, status: "ok" | "failed" | "skipped-archived" | "aborted" }` SHALL be appended to the returned `analysisTimings` array, in the order the loop processed each repo.

#### Scenario: Successful analysis records ok
- **WHEN** a repo's analyzer call resolves normally
- **THEN** the entry SHALL have `status: "ok"` and `durationMs ≥ 0`

#### Scenario: Failed analysis records failed
- **WHEN** `analyzer.analyze()` throws an error not caused by interruption
- **THEN** the entry SHALL have `status: "failed"` and `durationMs` reflecting the time before the throw

#### Scenario: Archived repo records skipped-archived
- **WHEN** `repo.isArchived === true` triggers the fast-path
- **THEN** the entry SHALL have `status: "skipped-archived"` and a near-zero `durationMs`

#### Scenario: Aborted repo records aborted
- **WHEN** `interruptedRef.value` becomes true during the analyzer call for a repo
- **THEN** the entry SHALL have `status: "aborted"` and the repo SHALL be excluded from `analyzedRepos` as today

### Requirement: Review phase records consolidation and suggestion timings
`runReviewPhase` SHALL mutate `PhaseTimings.consolidationMs` to the wall-clock duration of `consolidateCategories` and `PhaseTimings.suggestionsMs` to the wall-clock duration of `generateSuggestions`. Both SHALL be set even if a subsequent step in the review phase exits the process.

#### Scenario: Normal flow records both fields
- **WHEN** a run reaches the review screen
- **THEN** `phaseTimings.consolidationMs` and `phaseTimings.suggestionsMs` SHALL both be non-negative integers

#### Scenario: Zero-suggestions exit still records timings
- **WHEN** `generateSuggestions` returns `count === 0` and the orchestrator exits with `"No suggestions generated..."`
- **THEN** both fields SHALL be set before the exit

### Requirement: Apply phase records mutation timing
`runApplyPhase` SHALL mutate `PhaseTimings.applyMs` to the wall-clock duration of the GitHub mutation loop. The value SHALL be available to any post-apply save-site that serializes the session JSON.

#### Scenario: Apply completes and records timing
- **WHEN** the apply phase finishes (success or partial)
- **THEN** `phaseTimings.applyMs` SHALL be a non-negative integer

### Requirement: Duration formatting helper
A `formatDuration(ms: number): string` helper SHALL render millisecond durations as `Xm Ys` when ≥ 60 seconds, `Ys` when ≥ 1 second, and `Zms` otherwise, where seconds are rounded to the nearest integer.

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
