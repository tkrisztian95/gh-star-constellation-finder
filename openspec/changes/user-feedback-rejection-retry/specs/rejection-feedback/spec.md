## ADDED Requirements

### Requirement: Capture optional rejection reason in TUI
The system SHALL enter a brief reason-capture sub-state when the user presses `r` to reject a suggestion. The user MAY type a free-text reason and confirm with `Enter`, or press `Esc` or `Enter` immediately to skip providing a reason. In either case the review SHALL advance to the next suggestion.

#### Scenario: User rejects with a reason
- **WHEN** the user presses `r` on a suggestion and types "too generic, this is a Rust CLI framework" then presses `Enter`
- **THEN** the system SHALL record a `RejectedEntry` with the repo, the prior suggestion, and the reason string, then advance to the next suggestion

#### Scenario: User rejects without a reason
- **WHEN** the user presses `r` on a suggestion and immediately presses `Enter` or `Esc`
- **THEN** the system SHALL record a `RejectedEntry` with the repo and prior suggestion and `reason: undefined`, then advance to the next suggestion

#### Scenario: Reason prompt is clearly labelled
- **WHEN** the TUI enters the reason-capture sub-state
- **THEN** the TUI SHALL display a prompt such as `"Rejection reason (optional, Enter to skip):"` below the suggestion panel

### Requirement: RejectedEntry type
The system SHALL define a `RejectedEntry` type with fields: `repo` (the repository object), `suggestion` (the rejected suggestion object), and optional `reason` (string).

#### Scenario: RejectedEntry created on reject
- **WHEN** a suggestion is rejected with or without a reason
- **THEN** a `RejectedEntry` is appended to the session's `rejectedEntries` array

### Requirement: Session summary distinguishes skip and reject
The end-of-session summary screen SHALL show separate counts for skipped suggestions (neutral) and rejected suggestions (bad AI output, eligible for retry). It SHALL also indicate how many rejected repos are queued for the retry pass.

#### Scenario: Summary with mixed outcomes
- **WHEN** the user has accepted 4, skipped 2, and rejected 3 suggestions
- **THEN** the summary SHALL display accepted: 4, skipped: 2, rejected: 3, and prompt "Retry 3 rejected repositories? [y/N]"

#### Scenario: No rejections
- **WHEN** the user has no rejections
- **THEN** the summary SHALL NOT display a retry prompt
