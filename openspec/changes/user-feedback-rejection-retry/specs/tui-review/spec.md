## MODIFIED Requirements

### Requirement: Accept, skip, or reject each suggestion via keyboard
The system SHALL provide keyboard shortcuts to accept (`a` or `Enter`), skip (`s`), or reject (`r`) each suggestion. Skipped suggestions are not re-shown and generate no follow-up action. Rejected suggestions trigger an optional reason-capture sub-state, are recorded as `RejectedEntry` objects, and are eligible for the retry pass.

#### Scenario: User accepts a suggestion
- **WHEN** the user presses `a` or `Enter` on a suggestion
- **THEN** the system SHALL queue the suggestion for application and advance to the next suggestion

#### Scenario: User skips a suggestion
- **WHEN** the user presses `s` on a suggestion
- **THEN** the system SHALL advance to the next suggestion without queuing the action, without logging the skip, and without triggering a retry

#### Scenario: User rejects a suggestion
- **WHEN** the user presses `r` on a suggestion
- **THEN** the system SHALL enter the reason-capture sub-state (see rejection-feedback spec), record a `RejectedEntry`, and advance to the next suggestion after the reason is confirmed or skipped

#### Scenario: All suggestions reviewed
- **WHEN** the user has acted on every suggestion
- **THEN** the system SHALL display a summary screen showing accepted, skipped, and rejected counts, and prompt the user to start a retry pass if any rejections exist

## ADDED Requirements

### Requirement: Retry pass presented as a labelled second review round
The system SHALL present the re-analysed suggestions for rejected repositories as a second TUI review pass. The header SHALL clearly label the pass as `"Retry Pass — N repositories"` to distinguish it from the initial review. The same accept/skip/reject actions SHALL be available during the retry pass.

#### Scenario: Retry pass starts
- **WHEN** the user confirms the retry pass on the summary screen
- **THEN** the TUI SHALL show an analysis progress indicator (`"Re-analyzing X / N rejected repositories..."`) followed by the retry suggestions in a second review pass

#### Scenario: Retry pass rejected again
- **WHEN** the user rejects a suggestion during the retry pass
- **THEN** the system SHALL record the rejection in the final summary but SHALL NOT queue another retry pass (one retry pass per session)

#### Scenario: Retry pass skipped by user
- **WHEN** the user declines the retry prompt on the summary screen
- **THEN** the system SHALL proceed directly to applying accepted suggestions without re-analysing rejected repos
