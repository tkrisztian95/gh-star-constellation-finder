## 1. Update Types

- [x] 1.1 Add optional `existingListNames?: string[]` field to `RepoInput` in `src/ai/types.ts`

## 2. Update Per-Repo AI Prompt

- [x] 2.1 Convert `SYSTEM_PROMPT` from a constant string to a `buildSystemPrompt(existingListNames: string[])` function in `src/ai/prompts.ts`
- [x] 2.2 When `existingListNames` is non-empty, append a section to the system prompt listing existing list names and instructing the AI to prefer them when the repo clearly fits
- [x] 2.3 When `existingListNames` is empty or absent, return the existing prompt unchanged (no new section added)

## 3. Update Analyzer Implementations

- [x] 3.1 Update `src/ai/openaiAnalyzer.ts` to call `buildSystemPrompt(input.existingListNames ?? [])` instead of using the `SYSTEM_PROMPT` constant
- [x] 3.2 Update `src/ai/ollamaAnalyzer.ts` to call `buildSystemPrompt(input.existingListNames ?? [])` instead of using the `SYSTEM_PROMPT` constant

## 4. Build Consolidation Prompt and Function

- [x] 4.1 Add `buildConsolidationPrompt(proposedNames: string[]): string` to `src/ai/prompts.ts` — prompt instructs the AI to group near-duplicate names by shared domain and return a flat JSON remapping `{ "original": "consolidated" }` for every input name
- [x] 4.2 Add `consolidateCategories(proposedNames: string[], analyzer: Analyzer): Promise<Map<string, string>>` in `src/ai/` — makes a single AI call with the consolidation prompt and parses the JSON remapping response
- [x] 4.3 Skip the AI call and return an identity map when `proposedNames` has fewer than 2 entries

## 5. Update Call Site

- [x] 5.1 In `src/index.tsx`, extract existing list names from the fetched `lists` array: `const existingListNames = lists.map(l => l.name)`
- [x] 5.2 Pass `existingListNames` into each `analyzer.analyze(...)` call inside the `Promise.all` block
- [x] 5.3 After the analysis loop, identify proposed new category names: names in `analyzedRepos` that do not match any existing list name (case-insensitive)
- [x] 5.4 Call `consolidateCategories` with those new names to get the remapping
- [x] 5.5 Apply the remapping to `analyzedRepos` (replace each `analysis.category` with its consolidated name if present in the map)
- [x] 5.6 Pass the remapped `analyzedRepos` to `generateSuggestions` as before
