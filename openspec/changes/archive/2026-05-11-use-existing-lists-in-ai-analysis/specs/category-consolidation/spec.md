## ADDED Requirements

### Requirement: Consolidation runs after per-repo analysis
After all per-repo AI analysis completes, the system SHALL run a single consolidation AI call that receives all proposed new category names (those not matching any existing list) and returns a remapping to consolidated names.

#### Scenario: Multiple near-duplicate new names are merged
- **WHEN** per-repo analysis produces names like "Rust CLI Tools", "Go CLI Utilities", and "Python CLI Scripts"
- **THEN** the consolidation pass SHALL return a remapping such that all three map to a single shared name (e.g. "CLI Tools")

#### Scenario: Distinct domains are not merged
- **WHEN** per-repo analysis produces names that belong to genuinely different domains (e.g. "LLM Inference Engines" and "CSS Animation Libraries")
- **THEN** the consolidation pass SHALL NOT merge them, and each SHALL remain its own list name

#### Scenario: Single new name is not consolidated
- **WHEN** there is only one proposed new category name
- **THEN** the consolidation pass SHALL be skipped and the name used as-is

#### Scenario: Zero new names skips consolidation
- **WHEN** all repos matched existing lists during per-repo analysis
- **THEN** no consolidation AI call is made

### Requirement: Consolidation remapping is applied before suggestion generation
The system SHALL apply the consolidation remapping to `analyzedRepos` results before passing them to `generateSuggestions`, so the suggestion engine sees consolidated names.

#### Scenario: Remapped repos produce fewer create-list suggestions
- **WHEN** three repos had distinct new category names that the consolidation pass merged into one
- **THEN** `generateSuggestions` SHALL produce one `create-list` suggestion and two `move-to-list` suggestions (rather than three `create-list` suggestions)

#### Scenario: Repos matching existing lists are unaffected
- **WHEN** a repo's category matched an existing list name during per-repo analysis
- **THEN** the consolidation remapping SHALL NOT alter its category

### Requirement: Consolidation prompt prefers specificity over over-generalisation
The consolidation AI prompt SHALL instruct the model to merge names only when they share the same concrete technical domain, and to prefer a specific shared name over a vague generic one.

#### Scenario: Consolidated name is domain-specific, not generic
- **WHEN** "React Component Libraries" and "Vue Component Libraries" are merged
- **THEN** the consolidated name SHALL be "Component Libraries" rather than "Frontend Tools" or "JavaScript"

#### Scenario: Language-qualified names are dequalified when language is not the defining trait
- **WHEN** "Rust HTTP Clients", "Go HTTP Clients", and "Python HTTP Clients" are candidates
- **THEN** the consolidated name SHALL be "HTTP Clients", not "API Tools" or "Networking"
