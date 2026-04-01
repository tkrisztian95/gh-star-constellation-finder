## MODIFIED Requirements

### Requirement: UI shows a loading message during consolidating phase
When the app phase is `"consolidating"`, the TUI SHALL render a visible loading message that reflects the current sub-step of consolidation. When the distribution summary pass (Pass 0) is running the message SHALL indicate that the system is analysing repo distribution. When the consolidation passes are running the message SHALL indicate that categories are being consolidated.

#### Scenario: Loading message is shown during consolidation
- **WHEN** the app phase is `"consolidating"`
- **THEN** a non-empty text message describing the consolidation activity SHALL be visible in the TUI

#### Scenario: Loading message reflects distribution analysis sub-step
- **WHEN** Pass 0 (distribution summary) is executing
- **THEN** the visible message SHALL mention distribution or repo grouping (e.g. "Analysing repo distribution…")

#### Scenario: Loading message reflects category consolidation sub-step
- **WHEN** Pass 1 or Pass 2 (consolidation) is executing
- **THEN** the visible message SHALL indicate category consolidation is in progress (e.g. "Consolidating categories…")
