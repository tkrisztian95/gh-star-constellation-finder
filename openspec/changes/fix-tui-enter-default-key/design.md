## Context

Five Ink screens (`ScopeScreen`, `StrategyScreen`, `ConfirmScreen`, `InterruptConfirmScreen`, `SummaryScreen`) advertise a default option that should be selected on Enter. They detect Enter by checking `input === ""` in the `useInput` callback. Ink's `useInput` exposes both the typed `input` string and a `key` object whose `key.return` flag is set when Enter is pressed; the `input` value on Enter is implementation-defined and can be `""` or `"\r"` depending on terminal raw-mode behavior. `ReviewScreen` already uses `key.return` (see `src/components/ReviewScreen.tsx:81-89`), so the codebase already has the correct shape — the other screens were just written inconsistently.

## Goals / Non-Goals

**Goals:**

- Pressing Enter selects the advertised default option on every TUI screen that has one.
- Use a single, consistent pattern for Enter detection across all such screens.
- Preserve all existing non-default key bindings (`1`, `2`, `3`, `y`, `n`, etc.).

**Non-Goals:**

- Refactoring the input plumbing into a shared hook or higher-order component. Five sites is below the abstraction threshold.
- Changing prompt copy or screen layout.
- Touching `LoadingScreen` (already uses `key`) or `ReviewScreen` (already correct).

## Decisions

- **Use `key.return` everywhere.** Replace each `input === ""` check with the corresponding `key.return` test, widening the callback signature to `(input, key) => ...` where needed. Rationale: `key.return` is the documented Ink API for the Enter key; `input === ""` was an undocumented quirk that happens to work in some terminals.
- **Do not extract a shared helper.** A `useDefaultKeyConfirm` hook would compress maybe one line per call site at the cost of indirection. Inline `key.return` is more readable and matches `ReviewScreen` precedent.
- **No new tests beyond what the spec demands.** The bug is in five isolated input handlers with trivial logic; per-screen unit tests covering Enter dispatch via a mocked `useInput` are sufficient. End-to-end terminal tests are out of scope — the project does not have a TUI integration harness.

## Risks / Trade-offs

- [Risk] A future Ink upgrade changes `key.return` semantics. → Mitigation: pin Ink in `package.json` and keep the per-screen tests as a regression net.
- [Risk] A screen has a non-obvious second code path that still depends on `input === ""`. → Mitigation: tasks include a grep sweep for the literal `input === ""` to confirm no surviving occurrences after the fix.
