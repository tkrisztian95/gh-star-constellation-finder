## 1. Build membership-evidence lookup in `generateSuggestions`

- [ ] 1.1 After the `claimedListIds` initialization block and before the main `analyzedRepos` loop, build a `Map<string, Set<string>>` named `categoryToListIds` that maps each normalized category name (lowercase, trimmed) to the set of `listId`s that contain at least one analyzed repo with that category (iterate `analyzedRepos`, for each `{ repo, analysis }` add each `repo.listIds[i]` to the set keyed by `analysis.category.toLowerCase().trim()`)
- [ ] 1.2 Verify the lookup is built correctly by adding a focused unit test in `src/__tests__/consolidator.test.ts` for the case where repos in a list are categorized under the target name vs a different name

## 2. Refactor the `allow-rename` pairing loop

- [ ] 2.1 Replace the positional `unclaimedIdx` counter approach with a scan: for each `create-list` suggestion, iterate through the remaining unclaimed lists (from a mutable working array) and find the first list `L` for which `categoryToListIds.get(normalizedCategory)?.has(L.id)` is `true`
- [ ] 2.2 If a matching unclaimed list is found, emit `rename-list` + convert `create-list` to `move-to-list` exactly as before, and remove `L` from the working array so it cannot be reused
- [ ] 2.3 If no matching unclaimed list is found, leave the `create-list` suggestion unchanged (do not consume any unclaimed list)

## 3. Update tests

- [ ] 3.1 Add a test case: `allow-rename` with an unclaimed list whose repos' categories do NOT match the new category → expects `create-list` preserved, no `rename-list` emitted
- [ ] 3.2 Add a test case: `allow-rename` with two unclaimed lists where only the second has membership evidence for the target category → expects the second list to be renamed (first skipped)
- [ ] 3.3 Add a test case: `allow-rename` + `unlisted-only` scope → verify no `rename-list` suggestions are emitted (existing unlisted-only tests should already cover the `repoIds.length > 1` pre-claim; add a case for 0-repo lists to confirm they are also not renamed)
- [ ] 3.4 Ensure existing rename tests that rely on legitimate membership evidence still pass
