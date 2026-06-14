## ADDED Requirements

### Requirement: Ollama consolidate call supports a toggleable JSON-schema format mode
The Ollama provider SHALL support sending a JSON-schema `format` on the consolidation call, selectable via configuration and defaulting to off. When enabled, the call SHALL send a schema describing the remapping object (string-to-string-or-null mapping). The system SHALL log diagnostics that allow A/B comparison against the no-format baseline, and SHALL automatically degrade to no-format behaviour when schema mode yields empty content for the user's model, so a regressing model never loses consolidation work.

#### Scenario: Format mode is off by default
- **WHEN** the format-mode configuration is unset
- **THEN** the consolidate call SHALL send no `format` field, matching current behaviour exactly

#### Scenario: Format mode sends the JSON schema when enabled
- **WHEN** the format-mode configuration selects schema mode
- **THEN** the consolidate call SHALL include a JSON-schema `format` describing the remapping object

#### Scenario: Diagnostics logged in both modes
- **WHEN** a consolidate call completes in either mode
- **THEN** the file log SHALL record `doneReason` and `evalCount` (Ollama-only fields) so success rates can be compared across modes

#### Scenario: Empty content under schema mode falls back to no-format
- **WHEN** schema mode is enabled and the call returns empty `content`
- **THEN** the system SHALL log the empty-content event and retry the same call once without `format`, so the run degrades to baseline behaviour rather than failing
