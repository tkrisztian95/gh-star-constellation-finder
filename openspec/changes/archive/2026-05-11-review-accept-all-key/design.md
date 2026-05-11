## Context

The interactive review loop in [src/components/ReviewScreen.tsx](../../../src/components/ReviewScreen.tsx) walks the user through one suggestion at a time. Each `useInput` event records a `ReviewDecision` (`accepted` | `skipped` | `rejected`) for the current index, advances `setIndex`, and calls `onComplete(decisions)` when the queue is drained. The orchestration layer in [src/orchestration/review.ts](../../../src/orchestration/review.ts) waits on that resolved `decisions` map and feeds it into the Summary screen, which gates GitHub mutation behind a `[y/N] apply` confirmation.

Today there is no way to bulk-accept. With dozens (or hundreds) of suggestions, a confident user still has to mash `a` or Enter for every entry.

## Goals / Non-Goals

**Goals:**

- One keystroke that accepts every remaining unreviewed suggestion and jumps to the Summary screen.
- Preserve prior explicit `skipped` / `rejected` decisions — bulk-accept fills gaps, not overwrites.
- Keep the existing safety net: the Summary screen's `[y/N] apply` confirmation remains the final gate before GitHub mutation.
- Surface the new binding in the help row so it is discoverable without reading the spec.

**Non-Goals:**

- A "reject all" or "skip all" binding (out of scope; can be filed separately if requested).
- An extra confirmation prompt before invoking bulk-accept — the Summary screen already provides one, and adding a second prompt defeats the speed-up.
- Any change to headless / `--analyze-only` mode (it does not enter the review loop at all).
- Changing the shape of the `decisions: Map<number, ReviewDecision>` payload or the orchestration contract.

## Decisions

### Decision: Use `Ctrl+A` as the binding

Bind on `key.ctrl && input.toLowerCase() === "a"` inside the existing `useInput` handler in `ReviewScreen`.

**Why:** Matches the user-confirmed preference. Reads as "select all" in most UI conventions, leaves the lowercase `a` binding untouched, and does not collide with the other bindings (`a`, `s`, `r`, `q`, Enter, Esc).

**Alternatives considered:**

- _Capital `A` (shift+a)_: Easy to type but easy to hit accidentally if caps-lock is on; rejected per user preference.
- _`*` or `!`_: Less discoverable; no clear "select all" semantics.

**Terminal note:** Ink runs the TUI in raw mode, so `Ctrl+A` is delivered to the React `useInput` handler rather than being swallowed by the shell's readline. No `process.stdin.setRawMode` change is required.

### Decision: Bulk-accept fills only unreviewed indices

The new handler iterates from the current `index` to `suggestions.length - 1` and sets `decisions[i] = "accepted"` _only when `decisions` does not already have an entry for `i`_. Prior `skipped` / `rejected` decisions for earlier indices are preserved verbatim.

**Why:** Matches the mental model of "accept the rest". A user who explicitly skipped suggestion #3 expects it to stay skipped when they hit Ctrl+A on suggestion #10. Overwriting prior decisions would silently undo deliberate choices.

**Alternative considered:** Overwrite every decision regardless of prior state. Rejected — it is surprising and not what "accept all remaining" reads as.

### Decision: Jump straight to the Summary screen, no extra confirmation

After populating `decisions`, the handler calls `onComplete(next)` immediately — the same exit path used when the user accepts the final suggestion one at a time.

**Why:** The Summary screen already shows the accepted / skipped / rejected counts and gates the GitHub mutation behind `[y/N] apply`. Adding a Ctrl+A-specific confirmation would duplicate that gate and undercut the speed-up. If the user has second thoughts they answer `N` at the Summary prompt and the session falls through to the save-prompt without mutating anything.

### Decision: Ctrl+A is a no-op when the quit-confirm sub-dialog is showing

The existing `if (showQuitConfirm) return;` early-exit at the top of the `useInput` handler already swallows every keystroke other than `y` / `n` / Enter that the quit dialog itself listens for. The Ctrl+A branch lives below that guard, so the no-op behavior is free.

## Risks / Trade-offs

- **Risk:** User hits Ctrl+A by muscle memory expecting "select-all-text" semantics and accepts everything inadvertently.
  **Mitigation:** The Summary screen `[y/N] apply` prompt is the safety net — answering `N` discards all mutations and falls through to the save-prompt, identical to the existing flow.

- **Risk:** A terminal emulator or multiplexer intercepts Ctrl+A (e.g. tmux's default prefix key is `Ctrl+B`, but a user may have remapped it to `Ctrl+A`).
  **Mitigation:** Documented as a known limitation. Users with a Ctrl+A multiplexer prefix can still press the per-suggestion `a` binding repeatedly. Not worth gating the feature on; if it turns out to be a real-world pain point, a fallback binding can be added later.

- **Trade-off:** No way to bulk-skip or bulk-reject. Out of scope by design — the common case is "accept all" once trust is established, and the inverse operations are far rarer.
