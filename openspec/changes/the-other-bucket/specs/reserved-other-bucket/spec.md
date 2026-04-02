### Requirement: Prompt engineering and framework rationale
All prompt templates (including buildSystemPrompt and consolidation prompts) MUST:
- Explicitly instruct the AI to always reserve one slot for "Other" or "Miscellaneous"
- State in instructions and category rules that no more than 31 specific categories can be used
- Require that uncategorizable repos are always assigned to "Other"
- Include an example output where "Other" is present
- Apply TIDD-EC/CARE prompt engineering principles for clarity, compliance, and testability

#### Scenario: Prompt engineering compliance
- **WHEN** prompt templates are reviewed or updated
- **THEN** they follow the above requirements and rationale
## ADDED Requirements

### Requirement: Always reserve an "Other" bucket
The system SHALL always reserve one of the 32 available category slots for an "Other" or "Miscellaneous" bucket, regardless of user data.

#### Scenario: Slot reserved by default
- **WHEN** a user views their starred repository categories
- **THEN** the "Other" bucket is always present as one of the 32 slots

### Requirement: Uncategorizable repos go to "Other"
The system SHALL assign any repository that does not fit existing categories to the "Other" bucket by default.

#### Scenario: Uncategorizable repo assigned
- **WHEN** a repository cannot be matched to any specific category
- **THEN** it is placed in the "Other" bucket

### Requirement: Prompt and suggestion logic enforce reserved slot
The AI prompt and suggestion generation logic SHALL always reserve one slot for "Other" and SHALL NOT allow all 32 slots to be filled with specific categories. All prompt templates (including buildSystemPrompt and consolidation prompts) MUST explicitly instruct the AI to reserve one slot for "Other" or "Miscellaneous", never use all 32 slots for specific categories, and assign uncategorizable repos to "Other". The prompt must clearly state this rule in the instructions and category rules sections. generateSuggestions SHALL always include "Other" as a fallback category.

#### Scenario: Prompt reserves slot
- **WHEN** the AI prompt is constructed for category assignment (including buildSystemPrompt and consolidation prompts)
- **THEN** it explicitly instructs the model to reserve one slot for "Other" and not use all 32 for specific categories, and to assign uncategorizable repos to "Other"

#### Scenario: Suggestions always include "Other"
- **WHEN** suggestions are generated for category assignment
- **THEN** the "Other" bucket is always present, even if no repos are uncategorizable

### Requirement: UI and phase logic enforce and explain reserved slot
The user interface, review, and apply phases SHALL always display the "Other" bucket, SHALL NOT allow it to be deleted or renamed away, and SHALL provide an explanation of its purpose.

#### Scenario: UI explains "Other" bucket
- **WHEN** a user hovers over or clicks on the "Other" bucket in the UI
- **THEN** a tooltip or help text explains its purpose and why it is always present

#### Scenario: Phase transition enforces presence
- **WHEN** transitioning between analysis, review, and apply phases
- **THEN** the system checks for the "Other" bucket and adds it if missing
