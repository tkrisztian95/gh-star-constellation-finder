## MODIFIED Requirements

### Requirement: Generation trace per analysis call
For each `analyze()` invocation the system SHALL record a Langfuse generation containing: system prompt, user message, model name, backend name, repo full name, assigned category (set at end time), and the raw response string. The generation SHALL be parented to the analysis-phase span when one is active, otherwise to the root trace.

#### Scenario: Trace recorded for OpenAI call
- **WHEN** an OpenAI analysis completes successfully
- **THEN** a Langfuse generation is recorded with model, prompt messages, response, `repoFullName`, and `assignedCategory`

#### Scenario: Trace recorded for Ollama call
- **WHEN** an Ollama analysis completes successfully
- **THEN** a Langfuse generation is recorded with model, prompt messages, response, `repoFullName`, and `assignedCategory`

#### Scenario: Generation is child of analysis phase span
- **WHEN** an analysis-phase span is active and a generation is created
- **THEN** the generation is a child of the analysis-phase span, not a direct child of the root trace

### Requirement: Generation parent accepts span or trace
The system SHALL accept either a `LangfuseTrace` or a `LangfuseSpan` as the parent observation for a generation, so that generations can be properly nested under phase spans.

#### Scenario: Generation parented to span
- **WHEN** the provider's `analyze()` is called with a span as parent
- **THEN** the generation is created as a child of that span

#### Scenario: Generation parented to trace when no span
- **WHEN** the provider's `analyze()` is called with a trace as parent (no span)
- **THEN** the generation is created as a child of the trace (existing behaviour)
