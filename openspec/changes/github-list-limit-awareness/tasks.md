## 1. Update consolidation prompt

- [x] 1.1 Add `existingListNames: string[]` and `maxLists: number = 32` parameters to `buildConsolidationPrompt` in `src/ai/prompts.ts`
- [x] 1.2 Insert a `LIST BUDGET` section into the prompt template that communicates existing count, cap, remaining budget, and existing list names
- [x] 1.3 Add an instruction to the prompt telling the AI to merge proposed categories so that distinct new names stay within the remaining budget
- [x] 1.4 Update unit tests in `src/__tests__/prompts.test.ts` to cover the new prompt sections with various budget scenarios (fresh account, partial, zero budget)

## 2. Update consolidation return type

- [x] 2.1 Define `ConsolidationResult` interface (`remapping: Map<string, string>`, `mergeWarnings: string[]`) in `src/ai/types.ts` or `src/ai/consolidator.ts`
- [x] 2.2 Update `consolidateViaOpenAI` and `consolidateViaOllama` to accept `existingListNames` and pass them (along with `maxLists`) to `buildConsolidationPrompt`
- [x] 2.3 Update `parseRemapping` (or add a new helper) to compare pre/post names and populate `mergeWarnings` for any name that changed

## 3. Add post-processing budget guard

- [x] 3.1 After receiving the AI remapping, count distinct new canonical names that are not in `existingListNames`
- [x] 3.2 If `existingCount + newDistinctCount > maxLists`, programmatically merge the smallest new groups into the largest until within budget
- [x] 3.3 Append a `mergeWarnings` entry for each forced programmatic merge

## 4. Update `consolidateCategories` public API

- [x] 4.1 Change `consolidateCategories` signature to accept `existingListNames: string[]` and return `Promise<ConsolidationResult>`
- [x] 4.2 Update the identity-map fallback path to return a `ConsolidationResult` with empty `mergeWarnings`
- [x] 4.3 Update the error-fallback path to also return a `ConsolidationResult`

## 5. Thread existing lists through the orchestration layer

- [x] 5.1 Locate the call site(s) of `consolidateCategories` in the orchestration / pipeline code
- [x] 5.2 Pass `existingLists.map(l => l.name)` as the second argument
- [x] 5.3 Capture `mergeWarnings` from the result and forward it to the UI layer

## 6. Render merge advisory in the TUI

- [x] 6.1 Add a `mergeWarnings` prop (or equivalent) to the suggestions display component
- [x] 6.2 When `mergeWarnings` is non-empty, render a visible advisory panel before the suggestion list listing each warning
- [x] 6.3 When `mergeWarnings` is empty, render no advisory panel

## 7. Tests and validation

- [x] 7.1 Add unit tests for `consolidateCategories` covering: budget not exceeded, budget exceeded with AI compliance, budget exceeded with AI non-compliance (fallback), zero remaining budget
- [x] 7.2 Verify existing suggestion-engine tests still pass
- [ ] 7.3 Manual smoke-test: run analysis with a real account near the 32-list cap and confirm advisory is shown
