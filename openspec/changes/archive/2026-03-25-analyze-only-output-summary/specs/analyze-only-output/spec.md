## MODIFIED Requirements

### Requirement: JSON output contains run ID, analyzed repos, and suggestions
The JSON document emitted in `--analyze-only` mode SHALL be an object with the following top-level keys: `runId` (string), `suggestions` (array), `summary` (object), and `errors` (array).

`runId` SHALL be a unique identifier for the run generated via the existing `generateSessionId()` utility from `src/ai/tracing.ts`.

Each `suggestions` entry SHALL use the existing `Suggestion` type shape.

The `summary` object and `errors` array are defined in the `analyze-only-output-summary` capability spec.

#### Scenario: Output is parseable JSON with expected keys
- **WHEN** `--analyze-only` output is parsed with `JSON.parse`
- **THEN** the result SHALL have `runId`, `suggestions`, `summary`, and `errors` as top-level properties

#### Scenario: runId is a non-empty string
- **WHEN** the JSON output is inspected
- **THEN** `runId` SHALL be a non-empty string that is unique across runs
