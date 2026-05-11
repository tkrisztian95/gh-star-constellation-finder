## MODIFIED Requirements

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

## ADDED Requirements

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
