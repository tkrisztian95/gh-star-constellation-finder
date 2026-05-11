## Context

`ReviewScreen` currently renders, in order:

1. Optional merge advisory box.
2. A header `<Box justifyContent="space-between">` with the "Suggestion N of M" counter on the left and the keybinding hint row on the right (single line).
3. The bordered cyan suggestion panel (repo info / AI analysis / action).
4. Optional quit-confirm `[y/N]` prompt.

Issue #2 asks for the keybinding hint row to sit *below* the suggestion panel so the user's eye lands on the available actions immediately after reading the suggestion. Layout-only change in one component.

## Goals / Non-Goals

**Goals:**

- Reorder the JSX in `ReviewScreen` so the keybinding hint row is rendered after the bordered suggestion panel.
- Keep the "Suggestion N of M" counter as the section title above the panel (only the hint moves).
- Preserve the quit-confirm prompt as the last thing on screen when active.

**Non-Goals:**

- No keybinding changes. Same keys (`a`/Enter, Ctrl+A, `s`, `r`, `q`, ESC) with the same behavior.
- No restyling, recoloring, or copy changes to the hint text.
- No touching merge-advisory rendering, suggestion-panel contents, or quit-confirm prompt.
- No changes to orchestration, state, AI provider, GitHub layer, headless mode, tests, analytics, or logging.

## Decisions

**Decision 1: Drop the `justifyContent="space-between"` header and split it into two simple rows.**

The current header `<Box justifyContent="space-between" marginBottom={1}>` exists to put the counter and hint side-by-side. With the hint moving, the header collapses to a single-child row — easier to read as a standalone `<Box marginBottom={1}><Text bold color="magenta">Suggestion N of M</Text></Box>`. The hint then becomes a new `<Box marginTop={1}><Text color="gray">…</Text></Box>` after the bordered panel.

_Alternative considered:_ keep the `space-between` header and add an empty `<Text>` on the right to preserve spacing. Rejected — wastes a vertical line and adds dead JSX.

**Decision 2: Render the hint row outside the bordered cyan panel, not inside it.**

The bordered panel is currently a tight container for the suggestion's *content*. Putting the keybindings inside it would conflate "what you're looking at" with "what you can do about it" and make the border meaning fuzzier. A bare row below the panel keeps the panel as the suggestion's visual unit and the hint as a separate strip.

_Alternative considered:_ add the hint as a final child inside the panel. Rejected for the reason above.

## Risks / Trade-offs

- **Risk**: existing screenshots / docs that show the review screen will show the old layout. → Mitigation: none needed; no docs reference the layout literally, and this is a pre-1.0 TUI iteration.
- **Risk**: the new layout pushes the suggestion panel up by one line, which on a very short terminal could clip the hint below the fold. → Mitigation: the hint is a single line; even short terminals (24 rows) easily fit panel + hint + optional quit prompt. No worse than today, where the hint already requires width to render fully.
