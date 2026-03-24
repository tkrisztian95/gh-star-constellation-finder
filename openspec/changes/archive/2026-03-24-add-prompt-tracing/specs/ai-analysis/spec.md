## MODIFIED Requirements

### Requirement: Analyzer factory accepts optional tracing client
The `createAnalyzer` factory SHALL accept an optional `langfuse` parameter of type `Langfuse | null`. When not provided it SHALL default to `null` and behaviour SHALL be identical to the current implementation.

#### Scenario: Factory called without langfuse parameter
- **WHEN** `createAnalyzer()` is called without a `langfuse` argument
- **THEN** an analyzer is returned that operates identically to the pre-tracing implementation

#### Scenario: Factory called with langfuse client
- **WHEN** `createAnalyzer(backend, langfuseClient)` is called with a non-null client
- **THEN** the returned analyzer records a generation trace on each `analyze()` call
