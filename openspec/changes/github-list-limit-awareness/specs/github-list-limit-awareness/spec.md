## ADDED Requirements

### Requirement: Consolidation respects GitHub 32-list hard cap
The `consolidateCategories` function SHALL accept the list of existing GitHub list names and use them to enforce the 32-list limit. The total of `existingListCount + distinctNewListCount` SHALL NOT exceed 32. When it would, the function SHALL merge the least-distinct new categories into broader ones until the budget is satisfied.

#### Scenario: Budget not exceeded — no merging required
- **WHEN** `consolidateCategories` is called with 10 proposed names and 20 existing lists (total = 30 ≤ 32)
- **THEN** the remapping is returned without forced merges and `mergeWarnings` is empty

#### Scenario: Budget exceeded — AI-driven merging
- **WHEN** `consolidateCategories` is called with 10 proposed names and 28 existing lists (budget = 4) and the AI consolidates them to 4 or fewer new names
- **THEN** the remapping reflects the AI's merged names and `mergeWarnings` lists each collapsed category with its canonical target

#### Scenario: AI ignores budget — post-processing fallback
- **WHEN** the AI response still produces more new names than the remaining budget allows
- **THEN** the consolidator programmatically merges the smallest new groups into the largest until the budget is satisfied, and adds a warning entry for each forced merge

#### Scenario: Zero remaining budget
- **WHEN** `consolidateCategories` is called and `existingListCount` equals 32
- **THEN** every proposed name is remapped to an existing list name (or the closest match) and `mergeWarnings` contains an entry advising the user that no new lists can be created

### Requirement: Consolidation result exposes merge advisories
`consolidateCategories` SHALL return a `ConsolidationResult` object with two fields: `remapping` (the name-to-canonical-name map) and `mergeWarnings` (an array of human-readable strings). `mergeWarnings` SHALL be empty when no budget-driven merging occurred.

#### Scenario: No merges — warnings array is empty
- **WHEN** all proposed names survive consolidation unchanged and the budget is not breached
- **THEN** `mergeWarnings` is `[]`

#### Scenario: Merges occurred — warnings describe the collapse
- **WHEN** one or more proposed names are remapped to a different canonical name due to budget pressure
- **THEN** each affected mapping produces a `mergeWarnings` entry of the form `"<original>" merged into "<canonical>" to stay within the 32-list GitHub limit`

### Requirement: User sees merge advisory in the UI
The UI layer SHALL display `mergeWarnings` as a visible advisory block before the suggestion list when the array is non-empty, indicating which categories were consolidated and suggesting the user review or manually free up list slots.

#### Scenario: Advisory shown when merges occurred
- **WHEN** `mergeWarnings` is non-empty after consolidation
- **THEN** the TUI renders a yellow/amber advisory panel listing the warnings before the suggestion list

#### Scenario: No advisory when no merges
- **WHEN** `mergeWarnings` is empty
- **THEN** no advisory panel is rendered
