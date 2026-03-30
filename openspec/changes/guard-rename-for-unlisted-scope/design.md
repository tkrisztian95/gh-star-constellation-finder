## Context

The app presents two independent choices in sequence: **scope** (all repos vs unlisted-only) then **strategy** (keep-existing / recreate / allow-rename). When both `allow-rename` and `unlisted-only` are active, the suggestion engine proposes renames based solely on unorganised repos — repos already inside a list were never analysed, so the AI has no basis for judging whether a new name fits them. A list with even one existing repo can be silently mis-renamed.

The engine fix (pre-claiming non-empty lists in `unlisted-only` mode) is already in place. What's missing is:
1. A consistent, documented eligibility threshold (empty-only vs. ≤ 1 repo).
2. User-facing communication about the restriction before they commit to a strategy.

## Goals / Non-Goals

**Goals:**
- Decide and hard-code the rename-eligibility threshold for `unlisted-only` + `allow-rename`.
- Show the user a contextual note on the strategy screen explaining which lists can be renamed and why, when scope is `unlisted-only`.
- Keep `StrategyScreen` aware of scope so it can surface the note without a separate confirmation step.

**Non-Goals:**
- Changing the rename flow for `all` scope — no restrictions apply there.
- Adding a separate confirmation / warning modal; a single inline note on the strategy screen is enough.
- Persisting or surfacing this information beyond the strategy selection step.

## Decisions

### 1. Eligibility threshold: ≤ 1 repo (not empty-only)

A list with exactly one repo is a marginal case the user likely created to "park" a single discovery. Renaming it folds it cleanly into the new AI-driven structure and the risk is low: one repo is easy to spot and move if the rename turns out to be wrong. Lists with two or more repos represent deliberate, multi-item groupings — renaming those based on unanalysed content is too risky.

**Threshold**: a list is rename-eligible in `unlisted-only` scope if `repoIds.length <= 1`.

**Alternative considered — empty-only**: Safer but over-conservative; it prevents the engine from touching single-repo "parking" lists, which is a common and low-risk use case. Rejected.

### 2. Surface the note inside `StrategyScreen` (not a separate screen)

`StrategyScreen` already owns the `allow-rename` option copy. Adding a conditional note there keeps the change contained and avoids a new navigation step. The scope is selected before the strategy, so `scopeMode` is known and can be passed as a prop.

When `scopeMode === "unlisted-only"`, render an additional dimmed/yellow line under option 3:

> *Only empty or single-repo lists are eligible for renaming (unanalysed repos inside lists won't be considered).*

**Alternative considered — post-selection warning**: Show the note only after the user picks option 3. Rejected because it feels like a gotcha and requires an extra acknowledgement step.

### 3. Pass `scopeMode` as a prop to `StrategyScreen`

`StrategyScreen` currently takes only `onSelect`. Adding `scopeMode?: ScopeMode` (optional, defaults to `"all"`) keeps it backward-compatible and isolated — no global state needed.

The render call in `index.tsx` already has `scopeMode` in scope at the point where `StrategyScreen` is rendered (it's resolved before `pick-strategy` phase begins).

### 4. Engine threshold mirrors UI threshold

The `generateSuggestions` pre-claim filter changes from `repoIds.length > 0` to `repoIds.length > 1`, matching the ≤ 1 decision above. Single-file in `suggestionEngine.ts`.

## Risks / Trade-offs

- **Single-repo rename still renames the list for an unanalysed repo** → Accepted trade-off; the note makes this explicit. One-repo mis-renames are easy to undo manually.
- **StrategyScreen gains a new prop** → Low risk; prop is optional with a safe default.
- **Copy may go stale if thresholds change later** → The threshold is defined in one place (engine), so the copy in `StrategyScreen` must be kept in sync manually. Acceptable for now given the small team.
