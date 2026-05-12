# category-consolidation Specification

## Purpose
TBD - created by archiving change use-existing-lists-in-ai-analysis. Update Purpose after archive.
## Requirements
### Requirement: Consolidation runs after per-repo analysis
After all per-repo AI analysis completes, the system SHALL run a consolidation step that receives all proposed new category names (those not matching any existing list) and returns a remapping to consolidated names. The step MAY split work across multiple AI calls (chunked map plus an optional reducer) provided the externally observable remapping behaviour is preserved.

#### Scenario: Multiple near-duplicate new names are merged
- **WHEN** per-repo analysis produces names like "Rust CLI Tools", "Go CLI Utilities", and "Python CLI Scripts"
- **THEN** the consolidation step SHALL return a remapping such that all three map to a single shared name (e.g. "CLI Tools")

#### Scenario: Distinct domains are not merged
- **WHEN** per-repo analysis produces names that belong to genuinely different domains (e.g. "LLM Inference Engines" and "CSS Animation Libraries")
- **THEN** the consolidation step SHALL NOT merge them, and each SHALL remain its own list name

#### Scenario: Single new name is not consolidated
- **WHEN** there is only one proposed new category name
- **THEN** the consolidation step SHALL be skipped and the name used as-is

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

### Requirement: Consolidation chunks proposed names into bounded batches
When the deduplicated proposed-name set is larger than the chunk size, the system SHALL split it into batches of at most the chunk size, run each batch through the consolidation prompt in parallel, and combine the per-batch remappings into a single composed remapping. Each batch SHALL receive the same existing-list context and the same effective budget as the original single-call form, so that per-batch outputs honour existing-list and "Other" bucket invariants individually.

#### Scenario: Below chunk size runs as one batch
- **WHEN** the deduplicated proposed-name set is smaller than or equal to the configured chunk size
- **THEN** the consolidation step SHALL issue a single AI call (no chunking, no reducer)

#### Scenario: Above chunk size splits into parallel batches
- **WHEN** the deduplicated proposed-name set is larger than the configured chunk size
- **THEN** the consolidation step SHALL partition the names into batches of at most the chunk size and run those batches' AI calls concurrently

#### Scenario: Per-batch existing-list invariant
- **WHEN** any single batch is executed
- **THEN** the canonical names produced by that batch SHALL NOT collide with any name in `effectiveExistingLists` and SHALL NOT rename or remove the "Other" bucket

### Requirement: Consolidation reducer enforces the global new-list budget
After the chunked map step, the system SHALL compute the set of distinct canonical names produced across all batches. If that set exceeds `effectiveMaxLists`, the system SHALL issue one additional AI call ("reducer") whose input is the over-budget canonical set and whose output is a remapping that brings the count to at most `effectiveMaxLists`. If the canonical set already fits the budget, the reducer SHALL be skipped.

#### Scenario: Reducer skipped when within budget
- **WHEN** the union of canonical names produced by the chunked map step is less than or equal to `effectiveMaxLists`
- **THEN** no reducer AI call SHALL be made and the chunked map remappings SHALL be the final result

#### Scenario: Reducer applied when over budget
- **WHEN** the union of canonical names produced by the chunked map step exceeds `effectiveMaxLists`
- **THEN** the system SHALL issue exactly one reducer AI call to remap the over-budget canonical set down to at most `effectiveMaxLists` distinct names

#### Scenario: Final remapping respects the global budget
- **WHEN** the consolidation step returns
- **THEN** the number of distinct canonical names in the final remapping that do not match an existing list SHALL NOT exceed `effectiveMaxLists`

### Requirement: Consolidation chunks fail in isolation
A consolidation batch whose AI call returns a malformed or unparseable response SHALL NOT cause other batches to fail. The system SHALL emit a warning, fall back to identity remapping for the names in the failed batch, and continue with the surviving batches.

#### Scenario: One failed batch does not invalidate others
- **WHEN** three batches run in parallel and one of them returns unparseable JSON
- **THEN** the two surviving batches' remappings SHALL be applied as their AI output, the failed batch's names SHALL map to themselves, and the consolidation step SHALL still return a complete composed remapping for all input names

#### Scenario: Failed batch is observable in logs
- **WHEN** a batch fails to parse
- **THEN** the system SHALL emit a `logger.warn` entry tagged with `phase: "consolidate-categories"` that includes the failing batch's content head/tail and error message, matching the existing single-call failure log shape

