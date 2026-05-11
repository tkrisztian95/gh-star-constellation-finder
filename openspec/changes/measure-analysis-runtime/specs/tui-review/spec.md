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

### Requirement: Completion screens show total analysis duration
On any post-analysis screen that summarizes the run (summary, save-prompt, and the post-apply done screen), the TUI SHALL display the total analysis duration formatted by the duration helper, labelled clearly (e.g. `Analysis took 2m 14s`).

#### Scenario: Summary screen shows duration
- **WHEN** the user reaches the summary screen after a normal run
- **THEN** the screen SHALL contain a line that includes the formatted analysis duration

#### Scenario: Save-prompt after interrupt shows duration
- **WHEN** the user chose `save` from the interrupt-confirm screen
- **THEN** the resulting save-prompt SHALL display the formatted analysis duration for the partial run
