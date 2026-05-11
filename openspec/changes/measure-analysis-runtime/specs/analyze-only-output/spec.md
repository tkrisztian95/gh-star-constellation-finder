## MODIFIED Requirements

### Requirement: JSON output contains run ID, analyzed repos, and suggestions
The JSON document emitted in `--analyze-only` mode SHALL be an object with the following top-level keys: `runId` (string), `suggestions` (array), `summary` (object), `errors` (array), and `analysisTimings` (array).

`runId` SHALL be a unique identifier for the run generated via the existing `generateSessionId()` utility from `src/ai/tracing.ts`.

Each `suggestions` entry SHALL use the existing `Suggestion` type shape.

The `summary` object SHALL contain: `starredCount`, `analyzedCount`, `suggestionCount`, `durationMs`, `analysisDurationMs`, `model`, `githubUser`, and optionally `langfuseSessionId` (when Langfuse is configured and its session ID differs from `runId`). `analysisDurationMs` SHALL be the wall-clock duration of the analysis phase only, as returned by `runAnalysis`; `durationMs` continues to represent the full run since `analysisStartTime`.

The `errors` array SHALL contain `{ repo, owner }` entries for any repos whose AI analysis failed.

The `analysisTimings` array SHALL contain one entry per repo that entered the analysis loop, in the order the loop processed them. Each entry SHALL be of the form `{ owner: string, name: string, durationMs: number, status: "ok" | "failed" | "skipped-archived" | "aborted" }`.

#### Scenario: Output is parseable JSON with expected keys
- **WHEN** `--analyze-only` output is parsed with `JSON.parse`
- **THEN** the result SHALL have `runId`, `suggestions`, `summary`, `errors`, and `analysisTimings` as top-level properties

#### Scenario: runId is a non-empty string
- **WHEN** the JSON output is inspected
- **THEN** `runId` SHALL be a non-empty string that is unique across runs

#### Scenario: summary carries analysisDurationMs
- **WHEN** the JSON output is inspected after a completed analyze-only run
- **THEN** `summary.analysisDurationMs` SHALL be a non-negative integer less than or equal to `summary.durationMs`

#### Scenario: analysisTimings has one entry per analyzed repo
- **WHEN** `--analyze-only --limit 10` is passed and 10 repos are analyzed
- **THEN** `analysisTimings` SHALL contain 10 entries

#### Scenario: Failed repo appears in analysisTimings with status failed
- **WHEN** a repo's analysis fails and is recorded in `errors`
- **THEN** the same repo SHALL appear in `analysisTimings` with `status: "failed"`

## ADDED Requirements

### Requirement: Interrupt-save session JSON includes timing
The session JSON written when the user chooses `save` from the interrupt-confirm screen SHALL include the same `summary.analysisDurationMs` field and top-level `analysisTimings` array as the `--analyze-only` output, scoped to the repos that were analyzed before the interrupt.

#### Scenario: Interrupt-save JSON carries partial timings
- **WHEN** the user interrupts a run after 5 repos and chooses `save`
- **THEN** the saved JSON SHALL contain `summary.analysisDurationMs` and `analysisTimings` with 5 entries
