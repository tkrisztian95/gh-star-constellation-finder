## 1. Extend Types

- [ ] 1.1 Add `reroutedRepos: { repoName: string; category: string; targetList: string | null }[]` field to `SuggestionResult` in `src/engine/suggestionEngine.ts`

## 2. Re-routing Prompt

- [ ] 2.1 Add `buildReroutingPrompt(orphans: { category: string }[], availableTargets: string[])` to `src/ai/prompts.ts` — returns a prompt asking the AI to map each orphan category to the best target list name or `null`

## 3. Re-routing AI Function

- [ ] 3.1 Add `rerouteOrphanRepos(orphans, availableTargets, backend)` to `src/ai/consolidator.ts` following the OpenAI/Ollama routing pattern of `consolidateCategories`
- [ ] 3.2 Parse the AI JSON response into `Map<string, string | null>` (orphan category → target list name or null)
- [ ] 3.3 Catch all errors and return a map of `null` values for all orphans on failure (no error propagation)

## 4. Re-routing Logic in Suggestion Engine

- [ ] 4.1 After building the full `suggestions` array, count members per pending list ID (only `isPendingCreate` entries)
- [ ] 4.2 Collect orphan suggestions where the pending list has exactly one member
- [ ] 4.3 Build `availableTargets` list: existing GitHub list names + pending list names with ≥2 members
- [ ] 4.4 Call `rerouteOrphanRepos` with orphan categories and available targets
- [ ] 4.5 For each orphan with a valid AI target: remove the `create-list` suggestion and insert a `move-to-list` suggestion pointing at the target list (set `isPendingCreate` correctly based on whether target is existing or pending)
- [ ] 4.6 For each orphan with a `null` target: remove the `create-list` suggestion entirely
- [ ] 4.7 Populate `reroutedRepos` with one entry per orphan (target list name or null)
- [ ] 4.8 Return `{ suggestions, count: suggestions.length, reroutedRepos }` from `generateSuggestions`

## 5. Update Callers of SuggestionResult

- [ ] 5.1 Update `src/index.tsx` to destructure `reroutedRepos` from `generateSuggestions` result and pass it to `SummaryScreen`

## 6. Summary Screen

- [ ] 6.1 Add `reroutedRepos` prop to `SummaryScreen` component props in `src/components/SummaryScreen.tsx`
- [ ] 6.2 For each entry with a non-null `targetList`, render a message indicating the repo was moved to that list
- [ ] 6.3 For each entry with `targetList: null`, render a warning indicating the repo was not assigned to any list

## 7. Tests

- [ ] 7.1 Unit test `buildReroutingPrompt`: verify orphan categories and target list names appear in the output
- [ ] 7.2 Unit test `rerouteOrphanRepos`: AI returns valid mapping — correct target returned
- [ ] 7.3 Unit test `rerouteOrphanRepos`: AI throws — all orphans mapped to null, no error thrown
- [ ] 7.4 Unit test `generateSuggestions`: singleton pending list is re-routed to existing list — correct `move-to-list` suggestion emitted
- [ ] 7.5 Unit test `generateSuggestions`: singleton pending list re-routed to another pending list — `isPendingCreate: true` on replacement suggestion
- [ ] 7.6 Unit test `generateSuggestions`: singleton with no AI match — suggestion removed, `reroutedRepos` entry has `targetList: null`
- [ ] 7.7 Unit test `generateSuggestions`: multi-repo category untouched — all suggestions retained, `reroutedRepos` empty
- [ ] 7.8 Unit test `generateSuggestions`: existing-list assignments unaffected by re-routing
