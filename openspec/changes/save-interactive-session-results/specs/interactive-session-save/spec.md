## ADDED Requirements

### Requirement: Save prompt offered at end of interactive session
After the interactive session concludes — either after mutations are applied (`done` phase) or after the user declines to apply changes — the application SHALL transition to a `save-prompt` TUI phase that asks the user for a file path. Pressing Enter with an empty input SHALL skip saving and exit normally.

#### Scenario: Save prompt appears after successful apply
- **WHEN** the user completes the review, confirms the summary, and changes are applied
- **THEN** the TUI SHALL display a `save-prompt` phase asking for a file path before exiting

#### Scenario: Save prompt appears when user declines to apply
- **WHEN** the user declines the summary confirmation (no changes applied)
- **THEN** the TUI SHALL display a `save-prompt` phase asking for a file path before exiting

#### Scenario: Empty input skips saving
- **WHEN** the user presses Enter without typing a path at the save prompt
- **THEN** the application SHALL exit without writing any file

### Requirement: Session results written to user-specified file
When the user provides a non-empty file path at the save prompt, the application SHALL write a JSON file to that path containing the full session results, and display a confirmation message before exiting.

#### Scenario: File written at provided path
- **WHEN** the user types a valid file path and presses Enter
- **THEN** the application SHALL write the session JSON to that path and display the path in the TUI before exiting

#### Scenario: Write error shown and app still exits
- **WHEN** the user types a path that cannot be written (e.g. permission denied)
- **THEN** the application SHALL display the error message in the TUI and exit gracefully without crashing

### Requirement: Session JSON includes decisions and mutation results
The JSON written by the interactive save SHALL use the same top-level schema as `--analyze-only` output (`runId`, `summary`, `suggestions`, `errors`) and SHALL additionally include:
- `decisions`: an array of objects `{ suggestionIndex: number, decision: "accepted" | "skipped" | "rejected" }` for every suggestion the user reviewed
- `mutationResults`: an array of `{ status: "success" | "failed", message: string }` entries, present only when changes were applied; omitted when the user declined to apply

#### Scenario: Decisions recorded for all reviewed suggestions
- **WHEN** the user reviews suggestions and a file path is provided
- **THEN** the `decisions` array SHALL contain one entry per suggestion with the correct decision value

#### Scenario: mutationResults present after apply
- **WHEN** changes are applied and the user saves the session
- **THEN** `mutationResults` SHALL be a non-empty array reflecting the apply outcome

#### Scenario: mutationResults absent when not applied
- **WHEN** the user declines to apply and saves the session
- **THEN** the JSON SHALL NOT contain a `mutationResults` key
