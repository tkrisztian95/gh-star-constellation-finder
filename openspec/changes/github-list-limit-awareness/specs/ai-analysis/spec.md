## MODIFIED Requirements

### Requirement: Consolidation prompt includes existing lists and list budget
The `buildConsolidationPrompt` function SHALL accept `existingListNames: string[]` and `maxLists: number` (default 32) in addition to `proposedNames`. The generated prompt SHALL include a `LIST BUDGET` section that communicates the number of existing lists, the hard cap, the remaining budget, and the existing list names. The AI SHALL be instructed to merge proposed categories so that the total number of distinct new names does not exceed the remaining budget.

#### Scenario: Prompt with existing lists and budget pressure
- **WHEN** `buildConsolidationPrompt` is called with 6 proposed names, 4 existing list names, and `maxLists = 32`
- **THEN** the returned prompt string contains the existing list names, states the remaining budget (28), and instructs the AI to keep new names within that budget

#### Scenario: Prompt with zero remaining budget
- **WHEN** `buildConsolidationPrompt` is called with `existingListNames.length === 32`
- **THEN** the prompt instructs the AI to map every proposed name to an existing list or merge everything into a single name, and states that no new lists may be created

#### Scenario: Prompt with no existing lists (fresh account)
- **WHEN** `buildConsolidationPrompt` is called with an empty `existingListNames` array
- **THEN** the prompt states 0 existing lists and a full budget of 32, and the `LIST BUDGET` section is present but imposes no additional constraint
