Tracks #2

## Why

In the review TUI today, the keybinding hint row (`[a/Enter] Accept [Ctrl+A] Accept all [s] Skip [r] Reject [q] Quit`) is rendered on the same line as the "Suggestion N of M" header, *above* the bordered panel that shows the repo, AI analysis, and proposed action. Readers scan top-to-bottom: they see the commands first, then scroll past them to read the suggestion, then have to look back up to decide which key to press. Placing the action menu directly above the user's keystroke — i.e. *below* the suggestion they just read — matches how every other "review and decide" UI in the app already sits relative to the user's hands.

## What Changes

- Move the keybinding hint row in `ReviewScreen` from the header (currently sharing a `justifyContent="space-between"` row with the "Suggestion N of M" counter) to a new row below the bordered suggestion panel.
- Keep the "Suggestion N of M" counter where it is, as the section title above the panel.
- Quit-confirm prompt continues to render after the keybinding row (when active), so its `[y/N]` line stays the bottom-most thing on screen.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `tui-review`: adds a layout requirement that the keybinding hint row sits below the suggestion panel, not above it. No keys or behaviors change.

## Impact

- Code: `src/components/ReviewScreen.tsx` only. One JSX rearrangement.
- Tests: `src/__tests__/reviewScreen.test.ts` covers pure `derive*` helpers — unaffected.
- Orchestration / state machine / suggestion pipeline / headless mode: unaffected (layout-only).
- No breaking changes (no flags, file formats, or APIs touched).
