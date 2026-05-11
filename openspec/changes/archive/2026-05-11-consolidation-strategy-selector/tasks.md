## 1. Types and Shared Definitions

- [x] 1.1 Add `ConsolidationStrategy` type (`'keep-existing' | 'recreate' | 'allow-rename'`) to `src/types.ts`
- [x] 1.2 Add `rename-list` variant to `Suggestion` union in `src/types.ts` (fields: `type`, `listId`, `oldName`, `newName`)
- [x] 1.3 Add `delete-list` variant to `Suggestion` union in `src/types.ts` (fields: `type`, `listId`, `listName`)

## 2. GraphQL Mutations

- [x] 2.1 Add `DeleteUserList` GraphQL mutation to `src/graphql/mutations.ts`
- [x] 2.2 Add `UpdateUserList` (rename) GraphQL mutation to `src/graphql/mutations.ts`

## 3. Strategy Selection Prompt

- [x] 3.1 Implement `promptStrategy(): Promise<ConsolidationStrategy>` helper in `src/index.tsx` using readline, displaying the three numbered options with descriptions and defaulting to `keep-existing`

## 4. Consolidation Updates

- [x] 4.1 Update `consolidateCategories` signature in `src/ai/consolidator.ts` to accept optional `strategy: ConsolidationStrategy` parameter
- [x] 4.2 In `consolidateCategories`, when `strategy === 'recreate'` pass `existingListNames = []` and `maxLists = 32` to the AI call
- [x] 4.3 Update consolidation prompt in `src/ai/prompts.ts` to include a hint about renaming when `strategy === 'allow-rename'`

## 5. Suggestion Engine Updates

- [x] 5.1 Update `generateSuggestions` in `src/engine/suggestionEngine.ts` to accept `strategy: ConsolidationStrategy`
- [x] 5.2 In `generateSuggestions`, when `strategy === 'allow-rename'`, detect when an AI category could rename an existing list and emit a `rename-list` suggestion instead of `create-list`
- [x] 5.3 Write unit tests for `generateSuggestions` covering `allow-rename` rename-list emission and fallback behaviour

## 6. Mutator Updates

- [x] 6.1 Add `deleteAllLists(lists, graphqlWithAuth)` helper to `src/github/mutator.ts` that deletes all passed lists in parallel
- [x] 6.2 Add handling for `rename-list` suggestions in `applyAcceptedSuggestions` (call `UpdateUserList`, execute before move-to-list mutations)
- [x] 6.3 Ensure `rename-list` mutations run before any `move-to-list` mutations in the apply loop

## 7. Orchestration in index.tsx

- [x] 7.1 Call `promptStrategy()` after the "Proceed?" confirmation and before `consolidateCategories`
- [x] 7.2 Pass strategy to `consolidateCategories`
- [x] 7.3 Pass strategy to `generateSuggestions`
- [x] 7.4 In `recreate` mode, call `deleteAllLists` after summary confirmation and before `applyAcceptedSuggestions`

## 8. UI Updates

- [x] 8.1 Update `SummaryScreen` in `src/components/SummaryScreen.tsx` to accept optional `strategy` prop and display a strategy badge
- [x] 8.2 When `strategy === 'recreate'`, show a prominent deletion warning in `SummaryScreen` (e.g. "⚠ Will DELETE X existing lists")
- [x] 8.3 Update `ReviewScreen` to render `rename-list` suggestion type as "Rename list '<oldName>' → '<newName>'"
