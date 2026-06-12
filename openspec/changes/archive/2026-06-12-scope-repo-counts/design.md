## Context

The scope screen (`src/components/ScopeScreen.tsx`) is driven by the `{ tag: "pick-scope" }` phase (`src/state/phases.ts:15`) and rendered in `AppRoot.tsx:112` with only an `onSelect` prop. At the point `main.tsx:183` calls `tui.setPhase({ tag: "pick-scope" })`, the full `repos` array is already in scope — `filteredRepos` is computed one line later (`main.tsx:190-191`) using exactly the predicate we need: `repos.filter((r) => r.listIds.length === 0)`. So both counts are available with zero extra fetching or state plumbing beyond the phase object.

## Goals / Non-Goals

**Goals:**
- Show total repo count next to "All starred repos" and unlisted count next to "Unlisted repos only".
- Reuse the existing `listIds.length === 0` predicate so the displayed unlisted count exactly matches the set that "unlisted only" will analyze.

**Non-Goals:**
- No change to scoping/filtering behavior, the strategy screen, or the analysis pipeline.
- No counts on the headless `--analyze-only` path (that path never renders `ScopeScreen`).
- No live re-computation — counts are a one-time snapshot of the fetched set.

## Decisions

1. **Carry counts on the phase, not via a separate store.** Extend the `pick-scope` variant to `{ tag: "pick-scope"; totalCount: number; unlistedCount: number }`. This mirrors how `confirm` already carries `repoCount`/`listCount` — consistent with the existing pattern and keeps `ScopeScreen` a pure render-from-props component (per project convention: business logic stays in orchestration).
2. **Compute in `main.tsx` before `setPhase`.** `totalCount = repos.length`; `unlistedCount = repos.filter((r) => r.listIds.length === 0).length`. Pass both into `setPhase`. The existing `filteredRepos` line can reuse the same predicate (no behavior change).
3. **Render inline, dim.** Append the count to each option label using Ink `Text` styling (e.g. a gray `(N)`), not emoji — matches the existing gray descriptive notes on each option.

## Risks / Trade-offs

- **Snapshot vs. live:** counts reflect the fetched set at prompt time. There is no later mutation of `repos` before scope selection, so the snapshot is always accurate. Low risk.
- **`--limit` interaction:** because counts derive from the post-limit `repos` array (`main.tsx:149`), they correctly reflect the limited working set rather than the user's full star count. This is the intended behavior (counts match what will be analyzed) and is covered by a spec scenario.
