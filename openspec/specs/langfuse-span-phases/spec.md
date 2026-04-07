### Requirement: Analysis phase span
The system SHALL create a Langfuse `span` observation that wraps the entire analysis batch. The span SHALL be a child of the agent observation and SHALL record the number of repos to analyse as input metadata. The span SHALL be ended (with success or error status) in a `finally` block regardless of whether the batch completes or throws.

#### Scenario: Span opened before analysis begins
- **WHEN** the analysis batch starts and a Langfuse trace is active
- **THEN** a span named `analysis-phase` is created as a child of the agent observation before the first repo is analysed

#### Scenario: Span closed after analysis completes
- **WHEN** the analysis batch finishes (all repos processed)
- **THEN** the `analysis-phase` span is ended with the count of successfully analysed repos in its output metadata

#### Scenario: Span closed on analysis error
- **WHEN** the analysis batch throws an unexpected error
- **THEN** the `analysis-phase` span is ended with `level: "ERROR"` before the error propagates

#### Scenario: No span when tracing is disabled
- **WHEN** Langfuse credentials are absent and the trace is null
- **THEN** no span is created and analysis proceeds normally

### Requirement: Consolidation phase span
The system SHALL create a Langfuse `span` observation wrapping the consolidation step. The span SHALL be a child of the agent observation and SHALL include the consolidation strategy and list count as input metadata.

#### Scenario: Span wraps consolidation
- **WHEN** consolidation begins and a Langfuse trace is active
- **THEN** a span named `consolidation-phase` is created before the first consolidation LLM call

#### Scenario: Span closed after consolidation
- **WHEN** consolidation finishes
- **THEN** the `consolidation-phase` span is ended with the number of suggestions produced

#### Scenario: No span when tracing is disabled
- **WHEN** Langfuse credentials are absent
- **THEN** consolidation proceeds without creating a span

### Requirement: Review phase span
The system SHALL create a Langfuse `span` observation wrapping the review interaction. The span SHALL record the number of suggestions presented as input metadata and the number accepted as output metadata.

#### Scenario: Span wraps review
- **WHEN** the review phase begins and a Langfuse trace is active
- **THEN** a span named `review-phase` is created

#### Scenario: Span closed after review
- **WHEN** the user finishes reviewing (accepts, rejects, or exits)
- **THEN** the `review-phase` span is ended with accepted/rejected counts in output metadata

#### Scenario: No span when tracing is disabled
- **WHEN** Langfuse credentials are absent
- **THEN** review proceeds without creating a span
