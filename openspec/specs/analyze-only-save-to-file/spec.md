### Requirement: --output flag saves JSON to a file in analyze-only mode
The CLI SHALL accept an `--output <path>` flag. When `--output` is combined with `--analyze-only`, the application SHALL write the JSON document to the specified file path and SHALL NOT write JSON to stdout. The file SHALL be created or overwritten if it already exists.

#### Scenario: JSON written to file when --output is provided
- **WHEN** the CLI is invoked with `--analyze-only --output result.json`
- **THEN** the process SHALL write valid JSON to `result.json` and exit with code `0`

#### Scenario: stdout contains no JSON when --output is provided
- **WHEN** stdout is captured while running with `--analyze-only --output result.json`
- **THEN** the captured stdout SHALL contain no JSON output

#### Scenario: Existing file at output path is overwritten
- **WHEN** a file already exists at the path given by `--output`
- **THEN** the process SHALL overwrite it with the new JSON document without error

### Requirement: A confirmation message is printed to stderr after writing
When `--output` is used, the process SHALL print exactly one line to stderr confirming the output path after the file is written.

#### Scenario: stderr confirmation line is printed
- **WHEN** `--analyze-only --output result.json` completes successfully
- **THEN** stderr SHALL contain a line indicating the file path where the analysis was saved

### Requirement: --output without --analyze-only is a hard error
The CLI SHALL exit with a non-zero exit code and print a usage error to stderr if `--output` is provided without `--analyze-only`.

#### Scenario: --output alone causes early exit with error
- **WHEN** the CLI is invoked with `--output result.json` but without `--analyze-only`
- **THEN** the process SHALL exit with a non-zero code and print an error message to stderr without running the pipeline
