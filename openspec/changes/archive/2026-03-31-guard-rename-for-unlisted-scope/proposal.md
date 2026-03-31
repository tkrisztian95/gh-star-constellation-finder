## Why

When the user picks `allow-rename` strategy combined with `unlisted-only` scope, the system may propose renaming existing lists whose repos were never analyzed — because those repos were intentionally excluded from the working set. The new name is derived solely from unlisted repos and may be a poor fit for whatever is already in the list, silently breaking the user's existing organization.

## What Changes

- The suggestion engine already guards against renaming non-empty lists in `unlisted-only` scope (pre-claims them as taken). This change exposes that guard to the user with clear messaging and lets the design settle the one open question: should lists with exactly **one** repo be treated as rename-eligible (so that single-repo lists can be folded into the analysis)?
- A warning or contextual note is shown at the strategy selection step when the user picks `allow-rename` while `unlisted-only` scope is active, explaining which lists are eligible and why.
- The eligibility threshold for renaming under `unlisted-only` is made explicit and consistent across engine, UI, and documentation: currently **empty lists only**; the design may relax this to **≤ 1 repo**.

## Capabilities

### New Capabilities
- `rename-safety-unlisted`: Communicates rename eligibility rules to the user when `allow-rename` is combined with `unlisted-only` scope, and enforces a consistent threshold (empty or ≤ 1 repo) for which lists may be proposed for renaming.

### Modified Capabilities
- `unlisted-repos-filter`: The scope selection interaction gains additional context text when `allow-rename` is the active strategy, informing the user that only empty lists (or lists with ≤ 1 repo, per design decision) will be candidates for renaming.

## Impact

- `src/engine/suggestionEngine.ts` — eligibility threshold logic (already partially in place)
- `src/index.tsx` — strategy/scope selection UI, warning copy
- `src/components/ScopeScreen.tsx` or surrounding render logic — contextual note injection
- No API or data-format changes; purely behavioral and presentational
