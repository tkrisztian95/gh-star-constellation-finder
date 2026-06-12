## ADDED Requirements

### Requirement: Consolidation parse failure triggers one JSON-repair retry before identity fallback
When a pass-2 consolidation provider response fails to parse as a remapping, the system SHALL attempt exactly one repair before falling back to identity remapping. The repair SHALL issue a single additional provider call with a minimal prompt instructing the model to return ONLY the corrected JSON object (no prose, no code fences) for the failed content, then re-parse the result. If the repaired output parses successfully, the system SHALL use it. If the repaired output still fails to parse, or the repair call itself errors, the system SHALL fall back to identity remapping for the affected scope exactly as it did before this change. The repair retry SHALL apply at each pass-2 consolidation parse site — the single-chunk path, each chunk of the multi-chunk path, and the reducer step — and SHALL NOT fire on the happy path where the original response parses. Both the original parse failure and the repair outcome SHALL be logged.

#### Scenario: Repaired JSON parses and is used
- **WHEN** a consolidation provider response fails to parse and a single repair call returns valid JSON
- **THEN** the system SHALL use the repaired remapping and SHALL NOT fall back to identity for that scope

#### Scenario: Repair still fails, identity fallback preserved
- **WHEN** a consolidation provider response fails to parse and the repair call's output also fails to parse (or the repair call errors)
- **THEN** the system SHALL fall back to identity remapping for the affected scope, matching pre-change behavior

#### Scenario: Happy path issues no repair call
- **WHEN** a consolidation provider response parses successfully on the first attempt
- **THEN** the system SHALL NOT issue any repair call and SHALL incur no additional provider latency

#### Scenario: Repair is bounded to a single attempt
- **WHEN** the repair call's output fails to parse
- **THEN** the system SHALL NOT issue any further repair calls for that scope and SHALL proceed to identity fallback
