## ADDED Requirements

### Requirement: Analyzed-repo entries expose the description field
Wherever the `--analyze-only` JSON output embeds a per-repo `AnalysisResult` (within each `suggestions` entry's analysis data), that object SHALL include the `description` string field alongside `category` and `killerFeature`. No new top-level key is introduced; the field flows through the existing `Suggestion` shape.

#### Scenario: Description present in headless output
- **WHEN** `--analyze-only` output is parsed and a suggestion's embedded analysis is inspected
- **THEN** the analysis object SHALL contain a `description` string property

#### Scenario: Empty description serialized as empty string
- **WHEN** the model omitted the description for a repo and the result was cached or emitted
- **THEN** the `description` property SHALL be present and equal to the empty string, not `null` or absent
