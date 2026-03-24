### Requirement: Langfuse client initialisation
The system SHALL initialise a Langfuse client when `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` environment variables are present. When either variable is absent the client SHALL be `null` and no tracing SHALL occur.

#### Scenario: Client created with credentials
- **WHEN** both `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set
- **THEN** a Langfuse client instance is created and passed to analyzers

#### Scenario: Client is null without credentials
- **WHEN** `LANGFUSE_PUBLIC_KEY` or `LANGFUSE_SECRET_KEY` is absent
- **THEN** no Langfuse client is created and analysis proceeds without tracing

### Requirement: Custom host support
The system SHALL use `LANGFUSE_BASE_URL` as the Langfuse host when the variable is set, enabling self-hosted deployments. When not set it SHALL default to the Langfuse cloud URL.

#### Scenario: Self-hosted base URL
- **WHEN** `LANGFUSE_BASE_URL` is set to a local or custom URL (e.g. `http://localhost:3000`)
- **THEN** the Langfuse client sends traces to that URL

### Requirement: Generation trace per analysis call
For each `analyze()` invocation the system SHALL record a Langfuse generation containing: system prompt, user message, model name, backend name, and the raw response string.

#### Scenario: Trace recorded for OpenAI call
- **WHEN** an OpenAI analysis completes successfully
- **THEN** a Langfuse generation is recorded with model, prompt messages, and response

#### Scenario: Trace recorded for Ollama call
- **WHEN** an Ollama analysis completes successfully
- **THEN** a Langfuse generation is recorded with model, prompt messages, and response

### Requirement: Token usage captured when available
The system SHALL include token usage (prompt tokens, completion tokens) in the generation trace for backends that return it. For backends that do not return usage data the field SHALL be omitted.

#### Scenario: Token usage from OpenAI
- **WHEN** OpenAI returns `usage` in the completion response
- **THEN** the Langfuse generation includes `usage.input` and `usage.output` token counts

#### Scenario: No usage for Ollama
- **WHEN** an Ollama analysis completes
- **THEN** the Langfuse generation is recorded without a `usage` field

### Requirement: Trace errors do not affect analysis
A failure in the Langfuse tracing path (network error, SDK exception) SHALL NOT propagate to the caller. The `analyze()` function SHALL return its result regardless of tracing success or failure.

#### Scenario: Langfuse SDK throws during trace
- **WHEN** the Langfuse SDK throws an exception while recording a generation
- **THEN** the analyze call still returns its result and the error is silently suppressed

### Requirement: Trace flush on process exit
The system SHALL flush pending Langfuse traces before the Node.js process exits to prevent data loss in CLI runs.

#### Scenario: Flush on beforeExit
- **WHEN** the CLI process finishes all analysis
- **THEN** `langfuse.flushAsync()` is awaited before the process terminates
