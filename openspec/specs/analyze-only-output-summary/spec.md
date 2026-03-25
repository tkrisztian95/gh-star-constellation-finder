### Requirement: JSON output contains a summary object
The `--analyze-only` JSON document SHALL include a top-level `summary` object with the following fields:
- `starredCount` (number) — total starred repos fetched before any `--limit` is applied
- `analyzedCount` (number) — repos actually sent for AI analysis (post-limit)
- `suggestionCount` (number) — number of entries in the `suggestions` array
- `durationMs` (number) — wall-clock milliseconds from pipeline start to JSON serialisation
- `model` (string) — AI model identifier in `"<backend>/<model>"` format (e.g. `"openai/gpt-4o-mini"`, `"ollama/llama3"`)
- `githubUser` (string) — GitHub login of the authenticated user

#### Scenario: Summary object is present and well-formed
- **WHEN** `--analyze-only` output is parsed
- **THEN** the result SHALL have a `summary` key whose value is an object with all six required fields present and of the correct types

#### Scenario: starredCount reflects total stars before limit
- **WHEN** `--analyze-only --limit 10` is used and the user has 50 starred repos
- **THEN** `summary.starredCount` SHALL be `50` and `summary.analyzedCount` SHALL be `10`

#### Scenario: durationMs is a positive number
- **WHEN** the output is inspected
- **THEN** `summary.durationMs` SHALL be a positive integer

#### Scenario: model uses backend/model format
- **WHEN** the OpenAI backend is used
- **THEN** `summary.model` SHALL be `"openai/gpt-4o-mini"`

#### Scenario: githubUser matches the authenticated account
- **WHEN** the output is inspected
- **THEN** `summary.githubUser` SHALL equal the GitHub login returned by the authentication step

### Requirement: JSON output contains an errors array
The `--analyze-only` JSON document SHALL include a top-level `errors` array. Each entry SHALL be an object with `repo` (string, repository name) and `owner` (string, repository owner) identifying a repo whose AI analysis returned category `"analysis-failed"`. When no analysis failures occurred the array SHALL be present and empty.

#### Scenario: Errors array is always present
- **WHEN** `--analyze-only` output is parsed with no analysis failures
- **THEN** `errors` SHALL be an empty array `[]`

#### Scenario: Failed repos appear in errors array
- **WHEN** one or more repos fail AI analysis (category becomes `"analysis-failed"`)
- **THEN** each such repo SHALL appear in `errors` as `{ "repo": "<name>", "owner": "<owner>" }`

#### Scenario: Failed repos are excluded from suggestions
- **WHEN** a repo appears in `errors`
- **THEN** it SHALL NOT appear in the `suggestions` array

### Requirement: langfuseSessionId included in summary when configured and distinct
When Langfuse credentials are present and the Langfuse session ID differs from `runId`, the `summary` object SHALL include a `langfuseSessionId` field (string). When Langfuse is not configured, or when the session ID equals `runId`, the `langfuseSessionId` field SHALL be omitted.

#### Scenario: langfuseSessionId absent when Langfuse not configured
- **WHEN** `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are not set
- **THEN** `summary` SHALL NOT contain a `langfuseSessionId` field

#### Scenario: langfuseSessionId present when Langfuse is configured and IDs differ
- **WHEN** Langfuse credentials are present and the Langfuse trace uses a session ID different from `runId`
- **THEN** `summary.langfuseSessionId` SHALL equal the Langfuse trace session ID

### Requirement: Langfuse tracing active in analyze-only mode
When Langfuse credentials (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`) are present, `--analyze-only` mode SHALL initialize a Langfuse client, create a run trace, pass it to the analyzer, and flush before exiting — identical to the behaviour in interactive mode.

#### Scenario: Tracing is a no-op when credentials are absent
- **WHEN** Langfuse credentials are not set
- **THEN** `--analyze-only` SHALL complete without error and produce no tracing side-effects

#### Scenario: Tracing is active when credentials are present
- **WHEN** Langfuse credentials are set
- **THEN** each AI analysis call in `--analyze-only` mode SHALL be traced under the Langfuse run trace and the client SHALL be flushed before the process writes its output
