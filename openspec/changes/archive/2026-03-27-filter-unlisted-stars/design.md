## Context

After fetching starred repos (`starFetcher.ts`), the app populates `repo.listIds` by building a reverse index from the user's existing GitHub lists. This means at the point repos are handed off to the analysis pipeline, each `Repo` already knows whether it belongs to any list (`listIds.length > 0`) or not (`listIds.length === 0`).

Currently the full starred repo set always flows into analysis and the suggestion review screen — there is no opt-in way to restrict the working set to only unorganized repos.

## Goals / Non-Goals

**Goals:**
- Let the user opt in to analyze/review only repos not yet in any GitHub list.
- The filter is applied after fetching and after `listIds` is populated, so it reflects the actual current state of the user's lists.
- No changes to the analysis, suggestion engine, or mutation logic — they already work on whatever repo set they receive.

**Non-Goals:**
- Filtering by list membership during review (per-suggestion toggling).
- Persisting filter preferences between runs.
- Partial-list membership filtering (e.g., "repos in fewer than N lists").

## Decisions

**Decision: filter at the orchestration layer, not the fetch layer**

The `listIds` population happens in `index.tsx` after `fetchStarredRepos()` and `fetchUserLists()` both complete. Filtering there (before passing `repos` to analysis) is the minimal, cleanest cut point — analysis, suggestion engine, and review all receive the already-narrowed set with no changes needed downstream.

Alternative considered: fetch only unlisted repos via GraphQL. Rejected — GitHub's API doesn't expose a "starred but not in any list" query. We must fetch all and filter locally.

**Decision: prompt-based opt-in at startup, not a CLI flag**

The app is already interactive and uses a `StrategyScreen` TUI prompt to let users pick consolidation strategy. A similar prompt asking "Analyze all starred repos or only unlisted ones?" fits the existing UX pattern without requiring CLI argument parsing changes. This keeps the single-binary entry point simple.

Alternative considered: `--unlisted-only` CLI flag. Deferred — the prompt approach is consistent with existing UX and easier to implement now. A flag can be added later.

## Risks / Trade-offs

- **Stale list data**: Lists are fetched once at startup. If the user has just organized repos in another session, the filter reflects that. This is the same staleness risk as the rest of the app. → Acceptable; no mitigation needed beyond documenting it.
- **Empty working set**: If all starred repos are already listed, the filtered set is empty and the run should exit early with a clear message rather than proceeding to an empty analysis. → Add a guard after filtering.
- **User confusion about scope**: The summary/save output won't make it obvious the run was filtered. → Include a note in the `LoadingScreen` and `SummaryScreen` when filter is active.
