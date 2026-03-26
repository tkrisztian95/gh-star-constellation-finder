## ADDED Requirements

### Requirement: JSON output schema supports optional decisions and mutationResults keys
The JSON document produced by both `--analyze-only` mode and the interactive session save SHALL support two optional top-level keys: `decisions` and `mutationResults`. When absent, consumers SHALL treat them as empty/not applicable. The existing required keys (`runId`, `suggestions`, `summary`, `errors`) SHALL remain unchanged.

#### Scenario: analyze-only output unchanged (no new keys)
- **WHEN** `--analyze-only` produces output
- **THEN** the JSON SHALL NOT contain `decisions` or `mutationResults` keys (they are not applicable in headless mode)

#### Scenario: Interactive save includes decisions
- **WHEN** the interactive session save writes a file
- **THEN** the JSON SHALL include a `decisions` key alongside the existing required keys

#### Scenario: Schema is backwards-compatible
- **WHEN** a consumer reads analyze-only JSON that predates this change
- **THEN** the absence of `decisions` and `mutationResults` SHALL be treated as valid (both keys are optional)
