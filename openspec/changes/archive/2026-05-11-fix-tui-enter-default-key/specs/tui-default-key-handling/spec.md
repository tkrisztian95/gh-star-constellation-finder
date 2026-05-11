## ADDED Requirements

### Requirement: Enter key selects advertised default option

Every interactive TUI prompt screen that advertises a default option (e.g. "Enter = 1", "Enter = y") SHALL detect the Enter key via Ink's `key.return` flag from the `useInput` callback. Screens MUST NOT rely on `input === ""` to detect Enter, because Ink does not guarantee an empty input string on Enter across terminals and raw-mode configurations.

This requirement applies to every screen that documents an Enter-as-default behavior, currently: `ScopeScreen`, `StrategyScreen`, `ConfirmScreen`, `InterruptConfirmScreen`, and `SummaryScreen`. Any future screen that advertises a default option MUST follow the same pattern.

#### Scenario: Pressing Enter on the scope prompt selects the default scope

- **WHEN** the user is on the scope selection screen and presses Enter without typing a digit
- **THEN** the application selects the advertised default scope (`all`) and advances to the next phase

#### Scenario: Pressing Enter on the strategy prompt selects the default strategy

- **WHEN** the user is on the consolidation strategy screen and presses Enter without typing a digit
- **THEN** the application selects the advertised default strategy (`keep-existing`) and advances

#### Scenario: Pressing Enter on a yes/no confirmation selects the advertised default

- **WHEN** the user is on a yes/no confirmation screen (`ConfirmScreen`, `SummaryScreen`) and presses Enter
- **THEN** the application invokes the confirm callback with the advertised default answer (`false` for the `[y/N]` prompt)

#### Scenario: Pressing Enter on the interrupt screen selects the default action

- **WHEN** the user is on the interrupt confirmation screen and presses Enter without typing a digit
- **THEN** the application selects the advertised default action for that screen variant (`continue` when analysis is in progress, `exit` otherwise)

#### Scenario: Numeric and letter shortcuts continue to work

- **WHEN** the user types a digit (`1`, `2`, `3`) or letter (`y`, `n`) shortcut on any affected screen
- **THEN** the application selects the corresponding option, unchanged from prior behavior
