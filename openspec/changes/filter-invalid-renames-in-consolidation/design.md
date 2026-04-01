## Context

`generateSuggestions` in `src/engine/suggestionEngine.ts` has an `allow-rename` block (lines ~117–174) that converts `create-list` suggestions into `rename-list` suggestions by consuming unclaimed existing lists. The pairing is purely positional: the first `create-list` gets the first unclaimed list, the second gets the second, and so on—regardless of whether there is any semantic or membership relationship between the two.

As a result, a user with lists "Photography" and "Travel" can receive `rename-list` suggestions like "Photography → Machine Learning" when those lists happen to be unclaimed and the AI produced "Machine Learning" as a new category. This is misleading: the user never asked to rename "Photography", and the AI provided no evidence that it should be.

The fix must be minimal and local—no new AI calls, no external similarity metrics.

## Goals / Non-Goals

**Goals:**
- Emit `rename-list` only when there is direct evidence that the AI analysis considers the existing list's content to belong to the new category (i.e., at least one analyzed repo currently in the list was categorized under the target name).
- Preserve all existing rename behaviour when evidence exists (the legitimate case: repos in "ML" list categorized as "Machine Learning" → rename "ML" → "Machine Learning").
- Keep unclaimed lists that fail the eligibility check out of the rename pairing pool so their slot is not silently consumed.

**Non-Goals:**
- Fuzzy or semantic name similarity between old and new list names.
- Changes to the consolidation AI prompt or its output schema.
- Changes to the list-budget enforcement logic.
- Changes to re-routing or delete-list logic.

## Decisions

### Decision 1: Use repo membership as the eligibility signal

**Options considered:**
1. Name-similarity heuristic (edit distance, shared tokens) — fragile, language-dependent, no ground truth.
2. A second AI call asking "should list X be renamed to Y?" — expensive and adds latency.
3. Check whether any analyzed repo in the unclaimed list has `analysis.category` matching the target category — zero cost, uses already-available data.

**Choice:** Option 3. The `analyzedRepos` array is already in scope in `generateSuggestions`, and each repo carries both `repo.listIds` and `analysis.category`. Building a lookup set is O(n) and introduces no new dependencies.

### Decision 2: Build membership lookup before the allow-rename loop

Before the `allow-rename` block, build a `Map<string /* normalizedCategory */, Set<string /* listId */>>` from `analyzedRepos`:

```
categoryToListIds: Map<normalizedCategory, Set<listId>>
```

Populate it by iterating `analyzedRepos` and, for each repo, adding its `listIds` entries under its normalized category.

During the rename pairing loop, when evaluating whether unclaimed list `L` can be renamed to category `C`:

```
eligible = categoryToListIds.get(normalizedCategory(C))?.has(L.id) ?? false
```

If `eligible` is `false`, skip this unclaimed list—do not consume it, do not emit `rename-list`. The original `create-list` suggestion is kept.

### Decision 3: Keep unclaimed lists that fail the check available for later pairs

The current loop increments `unclaimedIdx` for every `create-list` suggestion it encounters. After the fix, it must only increment when a rename is actually emitted. Unclaimed lists that were skipped remain available for subsequent categories that might have evidence for them.

This means the pairing becomes: for each new category, scan unclaimed lists for one that passes the eligibility check, instead of taking the next one unconditionally.

## Risks / Trade-offs

- **Fewer renames emitted**: Users in `allow-rename` mode will see fewer `rename-list` suggestions and more `create-list` suggestions when evidence is absent. This is the intended outcome, but it changes observable behaviour. → Acceptable: the current behaviour was incorrect.
- **Scope interaction (`unlisted-only`)**: In `unlisted-only` scope, repos inside existing lists are not analyzed, so `categoryToListIds` will contain no entries for those lists. Consequently, no `rename-list` will ever be emitted for unclaimed lists in that scope (because their repos were never analyzed). This is correct—there is no evidence either way, so rename should not be proposed. The existing `repoIds.length` pre-claim guard (`rename-safety-unlisted` spec) already reduces the rename candidate pool in that scope; this change reduces it further to zero, which is safe.
- **Performance**: One extra O(n) pass over `analyzedRepos` and O(1) lookups per pairing. Negligible.

### Decision 4: `recreate` strategy is explicitly excluded from this change

In `recreate` strategy, `effectiveExistingLists = []` is passed to consolidation, and the `allow-rename` block in `generateSuggestions` does not run (guarded by `strategy === "allow-rename"`). No `rename-list` suggestions are ever emitted in `recreate` mode, so the membership-eligibility guard has nothing to apply to. The fix is logically a no-op for `recreate` and no code changes are needed for that path.

## Open Questions

None. The approach is fully determined by the available data and the existing architecture.
