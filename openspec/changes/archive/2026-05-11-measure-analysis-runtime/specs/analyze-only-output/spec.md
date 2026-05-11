## MODIFIED Requirements

### Requirement: JSON output contains run ID, analyzed repos, and suggestions
The JSON document emitted in `--analyze-only` mode SHALL be an object with the following top-level keys: `runId` (string), `suggestions` (array), `summary` (object), `errors` (array), and `analysisTimings` (array).

`runId` SHALL be a unique identifier for the run generated via the existing `generateSessionId()` utility from `src/ai/tracing.ts`.

Each `suggestions` entry SHALL use the existing `Suggestion` type shape.

The `summary` object SHALL contain: `starredCount`, `analyzedCount`, `suggestionCount`, `durationMs`, `analysisDurationMs`, `phaseTimings`, `model`, `githubUser`, and optionally `langfuseSessionId` (when Langfuse is configured and its session ID differs from `runId`).

- `durationMs` continues to represent the full run since `analysisStartTime`.
- `analysisDurationMs` SHALL be the wall-clock duration of the analysis phase only, as returned by `runAnalysis`.
- `phaseTimings` SHALL be an object with the optional integer fields `fetchStarsListsMs`, `fetchReadmesMs`, `analysisMs`, `consolidationMs`, `suggestionsMs`, and `applyMs`. Fields SHALL be present iff the corresponding phase ran to completion (or partially, in the case of `analysisMs` after an interrupt). `analysisMs` SHALL equal `analysisDurationMs`.

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

#### Scenario: summary.phaseTimings includes all non-interactive phases for analyze-only
- **WHEN** an analyze-only run completes
- **THEN** `summary.phaseTimings` SHALL contain `fetchStarsListsMs`, `fetchReadmesMs`, `analysisMs`, `consolidationMs`, and `suggestionsMs`; `applyMs` SHALL be absent

#### Scenario: analysisMs equals analysisDurationMs
- **WHEN** the JSON output is inspected
- **THEN** `summary.phaseTimings.analysisMs` SHALL equal `summary.analysisDurationMs`

#### Scenario: analysisTimings has one entry per analyzed repo
- **WHEN** `--analyze-only --limit 10` is passed and 10 repos are analyzed
- **THEN** `analysisTimings` SHALL contain 10 entries

#### Scenario: Failed repo appears in analysisTimings with status failed
- **WHEN** a repo's analysis fails and is recorded in `errors`
- **THEN** the same repo SHALL appear in `analysisTimings` with `status: "failed"`

## ADDED Requirements

### Requirement: Interactive-flow session JSON carries phase timings
The session JSON written by any interactive-flow save-site (interrupt-save, no-changes-save in `runReviewPhase`, and post-apply save in `runApplyPhase`) SHALL include `summary.phaseTimings` and a top-level `analysisTimings` array with the same shape as the analyze-only output, populated with whichever phase fields were measured before the save.

#### Scenario: Interrupt-save JSON carries partial phase timings
- **WHEN** the user interrupts a run after 5 repos and chooses `save`
- **THEN** the saved JSON SHALL contain `summary.phaseTimings` with `fetchStarsListsMs`, `fetchReadmesMs`, and `analysisMs` set, and `analysisTimings` with 5 entries

#### Scenario: Post-apply save includes applyMs
- **WHEN** the user saves after a successful apply
- **THEN** `summary.phaseTimings.applyMs` SHALL be present in the saved JSON

#### Scenario: No-changes save omits applyMs
- **WHEN** the user reaches the save-prompt without applying changes
- **THEN** `summary.phaseTimings.applyMs` SHALL NOT be present
