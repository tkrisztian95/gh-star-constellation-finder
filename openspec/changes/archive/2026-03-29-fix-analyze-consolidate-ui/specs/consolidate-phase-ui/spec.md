## ADDED Requirements

### Requirement: App transitions to a consolidating phase after analysis completes
Immediately after all per-repo analysis tasks finish (and before `consolidateCategories` is called), the app phase SHALL be set to `"consolidating"`. The phase SHALL remain `"consolidating"` until `consolidateCategories` and `generateSuggestions` both resolve, at which point the phase SHALL transition to `"review"` (or `"info"` if no suggestions are generated).

#### Scenario: Phase transitions from analyzing to consolidating
- **WHEN** the last repo analysis completes and the analyzed count equals the total count
- **THEN** the app phase SHALL be `"consolidating"` before any further async work proceeds

#### Scenario: Phase transitions from consolidating to review
- **WHEN** `consolidateCategories` and `generateSuggestions` complete with at least one suggestion
- **THEN** the app phase SHALL transition to `"review"`

#### Scenario: Phase transitions from consolidating to info when no suggestions
- **WHEN** `consolidateCategories` and `generateSuggestions` complete with zero suggestions
- **THEN** the app phase SHALL transition to `"info"` with the "already well organized" message

### Requirement: Step indicator includes a Consolidate step between Analyze and Review
The `StepIndicator` component SHALL include a "Consolidate" step positioned between the existing "Analyze" and "Review" steps. The step SHALL be highlighted as the current step when the app phase tag is `"consolidating"`, marked as done when the phase is `"review"` or later, and shown as pending otherwise.

#### Scenario: Consolidate step is active during consolidating phase
- **WHEN** the app phase is `"consolidating"`
- **THEN** the "Consolidate" step in the step indicator SHALL be rendered as the current (cyan, bold) step

#### Scenario: Consolidate step is marked done during review phase
- **WHEN** the app phase is `"review"` or any later phase
- **THEN** the "Consolidate" step SHALL be rendered with a green ✓ prefix

### Requirement: Step indicator is visible during consolidating phase
The `SHOW_STEPS_TAGS` set SHALL include `"consolidating"` so that the step indicator renders during the consolidation phase.

#### Scenario: Step indicator renders when phase is consolidating
- **WHEN** the app phase tag is `"consolidating"`
- **THEN** the step indicator component SHALL be rendered in the TUI

### Requirement: Scope and Strategy steps are merged into a single Setup step
The `StepIndicator` component SHALL replace the separate "Scope" and "Strategy" step entries with a single "Setup" step. Both `"pick-scope"` and `"pick-strategy"` phase tags SHALL map to the "Setup" step as its active tags. The step SHALL be marked done when the app phase advances past `"pick-strategy"`.

#### Scenario: Setup step is active during scope selection
- **WHEN** the app phase is `"pick-scope"`
- **THEN** the "Setup" step in the step indicator SHALL be rendered as the current step

#### Scenario: Setup step is active during strategy selection
- **WHEN** the app phase is `"pick-strategy"`
- **THEN** the "Setup" step in the step indicator SHALL be rendered as the current step

#### Scenario: Setup step is marked done after strategy is selected
- **WHEN** the app phase advances to `"fetching"` or any later phase
- **THEN** the "Setup" step SHALL be rendered with a green ✓ prefix

### Requirement: UI shows a loading message during consolidating phase
When the app phase is `"consolidating"`, the TUI SHALL render a visible loading message (e.g., "Consolidating categories…") so that users know the application is working.

#### Scenario: Loading message is shown during consolidation
- **WHEN** the app phase is `"consolidating"`
- **THEN** a non-empty text message describing the consolidation activity SHALL be visible in the TUI
