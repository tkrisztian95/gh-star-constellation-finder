Tracks #5

## Why

Reviewing 100+ suggestions one keypress at a time is tedious when the user already trusts the run and just wants to apply everything. The current ReviewScreen has no bulk-accept shortcut — users must press `a`/Enter for every remaining suggestion, or quit and lose the benefit of staged review. A single keybinding to accept all remaining suggestions makes the happy path fast while preserving the Summary screen's `[y/N] apply` confirmation as the final safety gate before any GitHub mutation.

## What Changes

- Add `Ctrl+A` keybinding to the interactive ReviewScreen that marks every still-unreviewed suggestion as `accepted` and advances directly to the Summary screen.
- Suggestions the user has already explicitly skipped or rejected SHALL be preserved as-is — `Ctrl+A` only fills in the unreviewed indices.
- Update the ReviewScreen header help row to advertise the new binding: `[a/Enter] Accept [Ctrl+A] Accept all [s] Skip [r] Reject [q] Quit`.
- No new confirmation prompt — the existing Summary screen `[y/N] apply` step continues to gate the GitHub mutation.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tui-review`: Adds a bulk-accept keyboard shortcut alongside the existing per-suggestion `a` / `s` / `r` / `q` bindings.

## Impact

- Code: [src/components/ReviewScreen.tsx](../../../src/components/ReviewScreen.tsx) — new branch in `useInput`, updated help text.
- Tests: [src/__tests__/reviewScreen.test.ts](../../../src/__tests__/reviewScreen.test.ts) — extend with a case covering "Ctrl+A from the middle of the queue accepts all remaining and preserves prior skips/rejects".
- No changes to: orchestration (`src/orchestration/review.ts` already handles whatever `decisions` map ReviewScreen returns), session JSON shape, analytics events, GitHub mutator, headless / `--analyze-only` path.
- No breaking changes — purely additive binding.
