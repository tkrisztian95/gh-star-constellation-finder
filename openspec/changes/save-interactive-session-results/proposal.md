## Why

The interactive session produces valuable data — AI analysis, generated suggestions, and user decisions — but currently discards it all when the process exits. Users who run the interactive flow have no way to persist what the AI recommended, what they accepted/rejected, or the final mutation outcomes, making it impossible to audit, replay, or share a session's results.

## What Changes

- After the interactive session concludes (apply phase done, or user declines to apply), the app prompts the user: "Save session results to file? [path or Enter to skip]"
- If the user provides a path, a JSON file is written containing: the full analysis/suggestions output (same schema as `--analyze-only`), per-suggestion decisions (accepted/skipped/rejected), and mutation results (if changes were applied)
- The save prompt is integrated into the TUI as a new terminal phase after `done` or the "no changes applied" exit path

## Capabilities

### New Capabilities
- `interactive-session-save`: Offer to persist full session state (analysis, decisions, mutation results) to a JSON file at the end of an interactive run

### Modified Capabilities
- `analyze-only-output`: The output JSON schema must be extended to carry an optional `decisions` array and an optional `mutationResults` array so the interactive save shares the same format

## Impact

- `src/index.tsx`: new `save-results` app phase; new `SavePromptScreen` component integrated into flow; output JSON construction shared with `runAnalyzeOnly`
- `src/components/SavePromptScreen.tsx`: new TUI component — text input asking for file path
- Output JSON schema gains two optional top-level keys: `decisions` and `mutationResults`
- No breaking changes to existing `--analyze-only` output (new keys are additive)
