### Requirement: --analyze-only flag triggers headless JSON output mode
The CLI SHALL accept an `--analyze-only` flag. When present, the application SHALL run the full read pipeline (fetch starred repos, fetch READMEs, AI analysis, category consolidation, suggestion generation) without rendering any interactive TUI, print a single JSON document to stdout, and exit with code `0`.

#### Scenario: Flag present — JSON emitted and process exits
- **WHEN** the CLI is invoked with `--analyze-only`
- **THEN** the process SHALL print valid JSON to stdout and exit with code `0` without prompting the user

#### Scenario: Flag absent — normal TUI flow unchanged
- **WHEN** the CLI is invoked without `--analyze-only`
- **THEN** the existing interactive TUI flow SHALL run exactly as before

### Requirement: JSON output contains run ID, analyzed repos, and suggestions
The JSON document emitted in `--analyze-only` mode SHALL be an object with the following top-level keys: `runId` (string), `suggestions` (array), `summary` (object), and `errors` (array).

`runId` SHALL be a unique identifier for the run generated via the existing `generateSessionId()` utility from `src/ai/tracing.ts`.

Each `suggestions` entry SHALL use the existing `Suggestion` type shape.

The `summary` object SHALL contain: `starredCount`, `analyzedCount`, `suggestionCount`, `durationMs`, `model`, `githubUser`, and optionally `langfuseSessionId` (when Langfuse is configured and its session ID differs from `runId`).

The `errors` array SHALL contain `{ repo, owner }` entries for any repos whose AI analysis failed.

#### Scenario: Output is parseable JSON with expected keys
- **WHEN** `--analyze-only` output is parsed with `JSON.parse`
- **THEN** the result SHALL have `runId`, `suggestions`, `summary`, and `errors` as top-level properties

#### Scenario: runId is a non-empty string
- **WHEN** the JSON output is inspected
- **THEN** `runId` SHALL be a non-empty string that is unique across runs

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
