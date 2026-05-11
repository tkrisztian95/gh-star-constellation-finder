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
The system SHALL show an animated loading indicator while starred repositories are being fetched and analyzed, including a live count of analyzed vs total repositories. While in the `analyzing` phase the system SHALL ALSO render a live elapsed-time counter, recomputed at least once per second from the analysis start timestamp using the duration-formatting helper.

#### Scenario: Analysis in progress
- **WHEN** the system is fetching and analyzing repositories
- **THEN** the TUI SHALL display a spinner and `"Analyzing X / N repositories..."`

#### Scenario: Elapsed timer ticks during analysis
- **WHEN** the `analyzing` phase has been active for at least two seconds
- **THEN** the TUI SHALL display the elapsed time formatted by the duration helper (e.g. `1s`, `14s`, `2m 14s`) and the displayed value SHALL increment at least once per second without ever decreasing

#### Scenario: Timer is not shown during fetching phase
- **WHEN** the phase is `fetching` (initial star/list fetch)
- **THEN** no elapsed-time counter SHALL be rendered

#### Scenario: Timer stops at interrupt
- **WHEN** the user presses ESC and the phase becomes `analyzing` with `stopping: true`
- **THEN** the elapsed counter MAY freeze at the time of interrupt and SHALL NOT regress

### Requirement: Completion screens show total + per-phase durations
On any post-analysis screen that summarizes the run (summary, save-prompt, and the post-apply done screen), the TUI SHALL display two pieces of timing information:

1. A single-line total formatted by the duration helper (e.g. `Analysis took 2m 14s`).
2. A compact per-phase breakdown listing each phase present in `PhaseTimings` (e.g. `Fetch 3s · READMEs 12s · Analysis 2m 14s · Consolidate 4s · Suggest 1s`).

Phases whose timing field is absent SHALL be omitted from the breakdown.

#### Scenario: Summary screen shows total and breakdown
- **WHEN** the user reaches the summary screen after a normal run
- **THEN** the screen SHALL contain a line with the formatted total analysis duration AND a line listing each measured phase with its formatted duration

#### Scenario: Save-prompt after interrupt shows partial breakdown
- **WHEN** the user chose `save` from the interrupt-confirm screen after a mid-analysis interrupt
- **THEN** the save-prompt SHALL display the breakdown including `fetch`, `READMEs`, and `analysis` only

#### Scenario: Done screen after apply shows applyMs
- **WHEN** the apply phase completes
- **THEN** the done screen breakdown SHALL include the apply phase duration

### Requirement: Accept all remaining suggestions via a single keybinding
The interactive ReviewScreen SHALL provide a `Ctrl+A` keyboard shortcut that marks every still-unreviewed suggestion as `accepted` and immediately advances to the Summary screen. Suggestions for which the user has already recorded an explicit `skipped` or `rejected` decision SHALL be preserved as-is — `Ctrl+A` only fills in indices that have no prior decision. The new binding SHALL be advertised in the ReviewScreen header help row alongside the existing `a` / `s` / `r` / `q` bindings. No additional confirmation prompt SHALL be introduced before the bulk acceptance; the existing Summary screen `[y/N] apply` confirmation remains the gate before any GitHub mutation.

#### Scenario: User accepts all remaining from the middle of the queue
- **WHEN** the user has 10 suggestions, has already pressed `a` on #1, `s` on #2, and `r` on #3, is currently viewing #4, and presses `Ctrl+A`
- **THEN** the system SHALL set decisions for indices 4 through 9 to `accepted`, leave the decisions for #1 (`accepted`), #2 (`skipped`), and #3 (`rejected`) unchanged, and advance directly to the Summary screen showing 7 accepted, 1 skipped, and 1 rejected

#### Scenario: User presses Ctrl+A on the first suggestion
- **WHEN** the user is viewing suggestion #1 of N with no prior decisions recorded and presses `Ctrl+A`
- **THEN** the system SHALL set every suggestion's decision to `accepted` and advance to the Summary screen showing N accepted

#### Scenario: Help row advertises the new binding
- **WHEN** the ReviewScreen is rendered for any suggestion
- **THEN** the header SHALL display a help row that names the Ctrl+A binding alongside `a`/Enter, `s`, `r`, and `q`

#### Scenario: Ctrl+A does not bypass the apply confirmation
- **WHEN** the user presses `Ctrl+A` to accept all remaining suggestions and reaches the Summary screen
- **THEN** the system SHALL still require the user to confirm `[y/N] apply` before invoking the GitHub mutator, identical to the per-suggestion accept flow

#### Scenario: Ctrl+A is ignored while the quit-confirm prompt is open
- **WHEN** the user has pressed `q` and the "Apply N accepted suggestion(s) before quitting? [y/N]" sub-prompt is visible
- **THEN** pressing `Ctrl+A` SHALL have no effect on decisions and SHALL NOT advance past the quit-confirm prompt

