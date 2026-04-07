### Requirement: Run-start event
The system SHALL emit a Langfuse `event` observation immediately after the root agent observation is created, recording that the run has begun.

#### Scenario: Event emitted at run start
- **WHEN** a Langfuse trace is active and the run begins
- **THEN** an event named `run-start` is created as a child of the agent observation with the backend and repo count in its metadata

#### Scenario: No event when tracing is disabled
- **WHEN** Langfuse credentials are absent
- **THEN** no event is emitted and the run proceeds normally

### Requirement: ESC interrupt event
The system SHALL emit a Langfuse `event` observation when the user triggers an ESC interrupt during analysis. The event SHALL be a child of the agent observation and SHALL record how many repos had been analysed at the time of interruption.

#### Scenario: Interrupt event on ESC
- **WHEN** the user presses ESC during analysis and a Langfuse trace is active
- **THEN** an event named `run-interrupted` is created with `analysedCount` and `totalCount` in its metadata

#### Scenario: No event when tracing is disabled
- **WHEN** Langfuse credentials are absent and the user presses ESC
- **THEN** no event is emitted
