## ADDED Requirements

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
