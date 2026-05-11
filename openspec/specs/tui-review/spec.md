# tui-review Specification

## Purpose
TBD - created by archiving change ai-github-stars-tui. Update Purpose after archive.
## Requirements
### Requirement: Present suggestions one at a time in a full-screen TUI
The system SHALL display each suggestion in a dedicated full-screen Bubble Tea panel showing: repository name, current List membership, AI category, killer feature, suggestion type, and proposed action.

#### Scenario: Single suggestion displayed
- **WHEN** the user is reviewing a suggestion
- **THEN** the TUI SHALL show the repository name, language, description, current Lists, proposed category, killer feature, and the action (e.g., "Move to list: Vector Databases")

#### Scenario: Progress indicator shown
- **WHEN** reviewing suggestions
- **THEN** the TUI SHALL display a progress indicator such as `"Suggestion 3 of 12"` in the header

### Requirement: Accept, skip, or reject each suggestion via keyboard
The system SHALL provide keyboard shortcuts to accept (`a` or `Enter`), skip (`s`), or reject (`r`) each suggestion. Skipped suggestions are not re-shown; rejected suggestions are logged but not applied.

#### Scenario: User accepts a suggestion
- **WHEN** the user presses `a` or `Enter` on a suggestion
- **THEN** the system SHALL queue the suggestion for application and advance to the next suggestion

#### Scenario: User skips a suggestion
- **WHEN** the user presses `s` on a suggestion
- **THEN** the system SHALL advance to the next suggestion without queuing the action and without logging the skip

#### Scenario: User rejects a suggestion
- **WHEN** the user presses `r` on a suggestion
- **THEN** the system SHALL advance to the next suggestion and add a rejected entry to the session summary

#### Scenario: All suggestions reviewed
- **WHEN** the user has acted on every suggestion
- **THEN** the system SHALL display a summary screen showing accepted, skipped, and rejected counts before applying mutations

### Requirement: Allow quitting at any time
The system SHALL allow the user to quit the TUI at any point by pressing `q` or `Ctrl+C`, cancelling any pending (not yet accepted) suggestions. Already-accepted suggestions SHALL be applied before exit.

#### Scenario: User quits mid-review
- **WHEN** the user presses `q`
- **THEN** the system SHALL prompt "Apply N accepted suggestion(s) before quitting? [y/N]" and respect the user's choice

### Requirement: Display loading state during analysis
The system SHALL show an animated loading indicator while starred repositories are being fetched and analyzed, including a live count of analyzed vs total repositories.

#### Scenario: Analysis in progress
- **WHEN** the system is fetching and analyzing repositories
- **THEN** the TUI SHALL display a spinner and `"Analyzing X / N repositories..."`

