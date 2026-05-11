# analyze-only-output Specification

## Purpose
Headless `--analyze-only` JSON output mode for non-interactive consumption.
## Requirements
### Requirement: --analyze-only flag triggers headless JSON output mode
The CLI SHALL accept an `--analyze-only` flag. When present, the application SHALL run the full read pipeline (fetch starred repos, fetch READMEs, AI analysis, category consolidation, suggestion generation) without rendering any interactive TUI, print a single JSON document to stdout, and exit with code `0`.

#### Scenario: Flag present — JSON emitted and process exits
- **WHEN** the CLI is invoked with `--analyze-only`
- **THEN** the process SHALL print valid JSON to stdout and exit with code `0` without prompting the user

#### Scenario: Flag absent — normal TUI flow unchanged
- **WHEN** the CLI is invoked without `--analyze-only`
- **THEN** the existing interactive TUI flow SHALL run exactly as before

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

### Requirement: Existing CLI flags are honoured in analyze-only mode
When `--analyze-only` is combined with `--backend`, `--limit`, or `--concurrency`, those flags SHALL take effect just as they do in interactive mode.

#### Scenario: --limit restricts repos analyzed
- **WHEN** `--analyze-only --limit 10` is passed
- **THEN** the output SHALL contain at most 10 entries in `analyzedRepos`

#### Scenario: --backend selects AI backend
- **WHEN** `--analyze-only --backend ollama` is passed
- **THEN** the Ollama backend SHALL be used for analysis

### Requirement: stdout is clean JSON in analyze-only mode
In `--analyze-only` mode without `--output`, the process SHALL write only the JSON document to stdout. No progress indicators, TUI frames, or other text SHALL appear on stdout. When `--output` is provided, stdout SHALL be entirely empty — the JSON document is written to the file instead.

#### Scenario: stdout contains only JSON (no --output)
- **WHEN** stdout is captured while running with `--analyze-only` and no `--output` flag
- **THEN** the captured output SHALL be parseable as JSON with no leading or trailing non-JSON characters

#### Scenario: stdout is empty when --output is used
- **WHEN** stdout is captured while running with `--analyze-only --output <path>`
- **THEN** the captured stdout SHALL be empty

### Requirement: analyze-only mode uses allow-rename consolidation strategy
In `--analyze-only` mode the category consolidation step SHALL use the `"allow-rename"` strategy, as no interactive strategy picker is shown.

#### Scenario: Consolidation runs without user input
- **WHEN** `--analyze-only` is used and no strategy flag is provided
- **THEN** category consolidation SHALL proceed with strategy `"allow-rename"` without prompting the user

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

