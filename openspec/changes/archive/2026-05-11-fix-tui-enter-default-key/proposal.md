Tracks #4

## Why

Pressing Enter to accept the default option on several TUI screens does nothing for some users. The screens (`ScopeScreen`, `StrategyScreen`, `ConfirmScreen`, `InterruptConfirmScreen`, `SummaryScreen`) detect Enter by checking `input === ""` inside Ink's `useInput`. Ink does not guarantee an empty string on Enter — depending on terminal and raw-mode handling it can deliver `\r` instead, in which case the check fails silently and the prompt appears frozen. `ReviewScreen` already uses the correct `key.return` pattern, so the fix is to bring the other screens into line.

## What Changes

- `ScopeScreen`, `StrategyScreen`, `ConfirmScreen`, `InterruptConfirmScreen`, and `SummaryScreen` detect Enter via the `key.return` flag from Ink's `useInput`, not by comparing `input` to an empty string.
- The default option selection (e.g. "Enter = 1") behaves consistently across terminals and raw-mode configurations.
- Numeric digit selection (`"1"`, `"2"`, `"3"`) on the affected screens keeps working unchanged.

## Capabilities

### New Capabilities

- `tui-default-key-handling`: Defines how TUI prompt screens detect the Enter key for default-option selection.

### Modified Capabilities

<!-- None — no existing spec covers Enter-key handling for these screens. -->

## Impact

- Code: `src/components/ScopeScreen.tsx`, `src/components/StrategyScreen.tsx`, `src/components/ConfirmScreen.tsx`, `src/components/InterruptConfirmScreen.tsx`, `src/components/SummaryScreen.tsx`.
- No dependency, CLI, or session-format changes.
- No breaking changes — behavior is fixed, not redefined.
