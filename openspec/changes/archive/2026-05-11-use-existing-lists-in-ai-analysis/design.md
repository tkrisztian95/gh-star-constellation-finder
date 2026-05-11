## Context

The AI analyzer (`src/ai/prompts.ts`) currently receives repo metadata and generates a `category` name without any knowledge of the user's existing GitHub Lists. The suggestion engine (`src/engine/suggestionEngine.ts`) then does an exact case-insensitive match between the AI-generated category and existing list names. Two problems arise:

1. **Name mismatch with existing lists**: AI returns "Rust CLI Tools" but the user has "Rust Command Line" — a new list is proposed unnecessarily.
2. **Per-repo analysis produces a long tail of near-duplicate new names**: analyzing 200 repos independently yields names like "Rust CLI Tools", "Go CLI Utilities", "Python CLI Scripts" — each becoming a separate list instead of a shared "CLI Tools".

This change addresses both problems: (1) by supplying existing list names to the per-repo prompt, and (2) by running a single consolidation AI call after all per-repo analysis completes.

## Goals / Non-Goals

**Goals:**
- Supply the AI with existing list names at analysis time so it can reuse them when appropriate
- Reduce new list proliferation by consolidating near-duplicate proposed names before suggestions are generated
- Keep changes contained to the AI prompt layer and orchestration in `index.tsx`

**Non-Goals:**
- Fuzzy/semantic matching in the suggestion engine (the engine stays unchanged)
- Retroactively renaming or merging existing lists the user already has
- Changing how `move-to-list` vs `create-list` suggestions are generated

## Decisions

### Pass existing list names in `RepoInput`, not via a separate call

The `Analyzer` interface already receives a `RepoInput` per repo. Adding an optional `existingListNames: string[]` field is the simplest extension — no new interfaces, no additional plumbing. The caller (`index.tsx`) already has the list of `GitHubList` objects before analysis starts.

**Alternative considered**: Pass lists as a constructor argument to the analyzer class. Rejected because it couples a session-level concern to the analyzer instance and makes testing harder.

### Inject list names into the system prompt, not the user message

The system prompt sets persistent rules. Putting "prefer these names" in the system prompt means every repo analysis in a session uses the same constraint, which is the correct semantics. The user message is per-repo and already crowded with repo data.

**Alternative considered**: Append list names to each user message. Works but adds token overhead per repo and is semantically odd (existing lists aren't per-repo context).

### Soft preference, not hard constraint

The prompt instructs the AI to prefer an existing list name "when the repo clearly fits". It must still invent a name when no existing list is a good match. This avoids forcing misclassification just to reuse an existing name.

### Consolidation as a single second-pass AI call, not per-repo

After all repos are analyzed, collect only the proposed *new* category names (those that didn't match any existing list). Send them in one AI call with a prompt that asks the model to group similar names and return a canonical name for each group. This is O(1) API calls regardless of repo count, and the model has the full set of names to reason about relationships between them.

**Alternative considered**: Ask each per-repo analysis call to also consider other repos' categories. Rejected — per-repo calls run in parallel and don't have a shared view of other results; coordinating this would require serialisation and greatly complicate the architecture.

**Alternative considered**: Deterministic clustering (e.g. string similarity). Rejected — semantic similarity ("LLM Inference Engines" and "Local AI Runners") is not captured by string distance.

### Consolidation input: new names only, not existing lists

The consolidation prompt receives only the proposed *new* names (those not matching any existing list). Existing list names are already resolved by the per-repo prompt. Mixing them in would confuse the model about which names are fixed vs flexible.

### Consolidation output: flat remapping JSON

The model returns `{ "original name": "consolidated name", ... }`. The orchestrator applies this map to `analyzedRepos` before calling `generateSuggestions`. The suggestion engine then sees consolidated names and produces fewer `create-list` suggestions.

### Consolidation is skipped when there are zero or one new names

No AI call is needed if there's nothing to consolidate.

## Risks / Trade-offs

- [Token cost — per-repo] Injecting N list names into the system prompt adds tokens per session. → Mitigation: List names are short; even 100 lists adds ~500 tokens, negligible.
- [Token cost — consolidation] Consolidation call scales with the number of distinct new names, not the number of repos. Worst case (200 distinct names) is still a small prompt. → No mitigation needed.
- [Prompt drift — per-repo] Adding instructions may subtly change category quality for repos that don't match any existing list. → Mitigation: The instruction is additive ("prefer when fits"); the existing category rules are unchanged.
- [Consolidation over-generalises] The model may merge names that are genuinely distinct (e.g. "Rust CLI Tools" and "Python Web Scrapers" could both be called "CLI Tools" — wrong). → Mitigation: Prompt instructs the model to only merge when the domain is the same; to prefer specificity over genericness.
- [Empty list case] First-time users have no existing lists; `existingListNames` will be empty. → Mitigation: The prompt only includes the list section when names are present; behaviour is unchanged.

## Migration Plan

1. Update `RepoInput` in `src/ai/types.ts` (additive, backwards-compatible).
2. Update `SYSTEM_PROMPT` → `buildSystemPrompt(existingListNames)` in `src/ai/prompts.ts`.
3. Add `buildConsolidationPrompt(proposedNames)` and `consolidateCategories(proposedNames, analyzer)` in `src/ai/`.
4. Update `src/index.tsx`:
   a. Pass `existingListNames` into each `analyzer.analyze(...)` call.
   b. After the `Promise.all` analysis loop, collect distinct new-category names.
   c. Call `consolidateCategories`; apply remapping to `analyzedRepos`.
   d. Pass remapped `analyzedRepos` to `generateSuggestions`.
5. No database migrations, no API changes, no breaking changes.
