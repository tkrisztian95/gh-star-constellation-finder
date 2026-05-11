## ADDED Requirements

### Requirement: Keybinding hint row sits below the suggestion panel

The review screen SHALL render the keybinding hint row (the strip listing the accept / accept-all / skip / reject / quit keys) AFTER the bordered suggestion panel, not above or beside the "Suggestion N of M" counter. The "Suggestion N of M" counter remains the section title above the panel. When the quit-confirm prompt is active it SHALL still render after the keybinding hint row, remaining the bottom-most element on screen.

#### Scenario: Hint row renders below the panel during normal review

- **WHEN** the user is reviewing any suggestion and the quit-confirm prompt is not active
- **THEN** the vertical order on screen SHALL be: optional merge-warning box (if any), then the "Suggestion N of M" counter, then the bordered suggestion panel, then the keybinding hint row

#### Scenario: Hint row stays above the quit-confirm prompt when quitting

- **WHEN** the user has pressed `q` (or ESC) and the quit-confirm prompt is showing
- **THEN** the vertical order on screen SHALL be: optional merge-warning box (if any), then the "Suggestion N of M" counter, then the bordered suggestion panel, then the keybinding hint row, then the quit-confirm `[y/N]` line

#### Scenario: Keybinding content and behavior are unchanged

- **WHEN** the hint row is rendered in the new position
- **THEN** the hint text SHALL still list `[a/Enter] Accept`, `[Ctrl+A] Accept all`, `[s] Skip`, `[r] Reject`, and `[q] Quit`, and pressing any of those keys SHALL produce the same behavior as before the layout change
