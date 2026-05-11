## Context

The tool fetches a user's GitHub starred repositories, runs AI analysis to categorise them, then suggests creating or updating GitHub Lists. Currently, the `Repo` type and the GraphQL query do not capture whether a repository is archived. Archived repos get mixed into the AI analysis pipeline, potentially producing suggestions to add stale/read-only projects to the same lists as active ones. The fix is minimal: add one boolean field through the data pipeline and short-circuit categorisation for archived repos.

## Goals / Non-Goals

**Goals:**
- Fetch `isArchived` for every starred repo from the GitHub GraphQL API.
- Expose `isArchived` on the `Repo` type and the AI `RepoInput` type.
- Include an `Archived: yes/no` line in the AI user-message so the model has full context (even when the repo is pre-routed).
- Automatically assign archived repos the category `"Archived"` in the suggestion engine, bypassing the AI call entirely.
- Ensure archived repos are grouped into a single GitHub List named **Archived** via the existing `create-list` / `move-to-list` flow.

**Non-Goals:**
- No special UI treatment beyond the existing suggestion review screen (archived repos appear as normal suggestions targeting the "Archived" list).
- No option to customise the archive list name.
- No bulk-unarchive capability.
- No changes to how the user approves/rejects suggestions.

## Decisions

### Decision 1: Skip AI call for archived repos — assign category directly in engine

**Options considered:**
- A. Let the AI analyse archived repos and instruct it (via prompt) to always return `"Archived"`.
- B. Short-circuit in `suggestionEngine.ts`: if `repo.isArchived`, force `category = "Archived"` without calling the analyser.

**Decision: B.**
Option A wastes tokens and introduces a failure mode (the model could ignore the instruction). Option B is deterministic, cheaper, and keeps the categorisation logic in one place. The AI user-message still includes `Archived: yes/no` for completeness and for any future path where an archived repo does reach the analyser.

### Decision 2: Pass `isArchived` on `RepoInput` (ai/types.ts)

The `buildUserMessage` prompt helper receives a `RepoInput`. Adding `isArchived` there keeps the prompt-building layer self-contained and avoids coupling it to the outer `Repo` type. Consistent with how `existingListNames` is already threaded through.

### Decision 3: No separate archived-repo analysis result type

The existing `AnalysisResult` (`category`, `killerFeature`, `dataQuality`) is reused. For archived repos the suggestion engine synthesises a dummy result: `{ category: "Archived", killerFeature: "(archived repository)", dataQuality: "sparse" }`. This avoids null checks downstream and keeps the suggestion pipeline uniform.

## Risks / Trade-offs

- **GitHub API field availability** → `isArchived` has been stable on the GitHub GraphQL API since 2018; no risk of missing field.
- **"Archived" list name collision** → If the user already has a GitHub List called "Archived", the engine will reuse it correctly (same case-insensitive matching already in place). If they have "archived" (different casing), the existing normalisation in `suggestionEngine.ts` handles it.
- **Skipping AI for archived repos changes token usage** → Intentional reduction. Archived repos don't need fresh categorisation.
- **`killerFeature` placeholder** → The ReviewScreen currently displays `killerFeature`. The placeholder text `"(archived repository)"` is not actionable. Acceptable trade-off; the user can still reject the suggestion.

## Migration Plan

This is an additive in-process change with no persistent state or external schema migration:

1. Update `Repo` type and GraphQL query — new field is fetched automatically on next run.
2. Update `mapRepo`, `RepoInput`, `buildUserMessage` — no stored data format changes.
3. Update `suggestionEngine` — pre-routing logic is applied at runtime.
4. No rollback concern; reverting the PR restores prior behaviour completely.

## Open Questions

- Should archived repos be skippable entirely (i.e., never surfaced as suggestions) rather than routed to an "Archived" list? Left as a future option — current design defaults to surfacing them so the user can consciously unstar them.
