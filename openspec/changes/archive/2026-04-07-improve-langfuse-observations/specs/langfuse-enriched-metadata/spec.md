## ADDED Requirements

### Requirement: Enriched root trace metadata
The system SHALL include the following additional fields in the root trace metadata: `modelId` (the resolved model identifier including backend prefix), `filteredRepoCount` (repos after scope filtering), `totalRepoCount` (all starred repos before filtering), `listNames` (array of existing list names), and `concurrency` (the concurrency setting used for analysis).

#### Scenario: Extended metadata on root trace
- **WHEN** a Langfuse trace is created for a run
- **THEN** the trace metadata includes `modelId`, `filteredRepoCount`, `totalRepoCount`, `listNames`, and `concurrency` in addition to the existing fields

#### Scenario: No metadata when tracing is disabled
- **WHEN** Langfuse credentials are absent
- **THEN** no trace is created and no metadata is recorded

### Requirement: Agent observation wrapping the run
The system SHALL create a Langfuse `agent` observation as the first child of the root trace, representing the orchestration run as an LLM-guided decision process. All phase spans and milestone events SHALL be children of this agent observation.

#### Scenario: Agent observation present when tracing enabled
- **WHEN** a Langfuse trace is active
- **THEN** an observation with name `constellation-agent` and type `agent` is created as the immediate child of the root trace

#### Scenario: Phase spans are children of agent
- **WHEN** phase spans are created
- **THEN** they are attached as children of the `constellation-agent` observation, not directly to the root trace

### Requirement: Per-generation repo metadata
Each `generation` observation SHALL include in its metadata: `repoFullName` (e.g. `owner/name`) and `assignedCategory` (the category string returned by the LLM, set at generation end time after the response is parsed).

#### Scenario: Generation metadata includes repo name
- **WHEN** a generation observation is ended for a repo analysis call
- **THEN** the generation metadata contains `repoFullName` matching the analysed repo

#### Scenario: Generation metadata includes assigned category
- **WHEN** a generation observation is ended after the LLM response is parsed
- **THEN** the generation metadata contains `assignedCategory` with the category string from the analysis result
