## MODIFIED Requirements

### Requirement: stdout is clean JSON in analyze-only mode
In `--analyze-only` mode without `--output`, the process SHALL write only the JSON document to stdout. No progress indicators, TUI frames, or other text SHALL appear on stdout. When `--output` is provided, stdout SHALL be entirely empty — the JSON document is written to the file instead.

#### Scenario: stdout contains only JSON (no --output)
- **WHEN** stdout is captured while running with `--analyze-only` and no `--output` flag
- **THEN** the captured output SHALL be parseable as JSON with no leading or trailing non-JSON characters

#### Scenario: stdout is empty when --output is used
- **WHEN** stdout is captured while running with `--analyze-only --output <path>`
- **THEN** the captured stdout SHALL be empty
