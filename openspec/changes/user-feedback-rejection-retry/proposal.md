## Why

The TUI currently treats "skip" and "reject" as semantically equivalent — both just advance to the next suggestion without any follow-up action. This wastes the signal in a rejection: if the AI suggested the wrong category, we know it was wrong and have an opportunity to retry with that feedback, rather than silently discarding the repository.

## What Changes

- **Semantic distinction between skip and reject**: Skip means "I don't want to act on this now" (neutral). Reject means "this suggestion is wrong" (negative feedback about AI output quality).
- **Rejection reason capture**: When a user rejects a suggestion, the TUI prompts for an optional free-text reason (e.g., "wrong category", "too generic").
- **Rejection-aware retry prompt**: After the review session ends (or on demand), rejected repositories are re-queued for AI analysis with a modified prompt that includes the prior suggestion and rejection reason as negative constraints — the "build retry prompt" pattern.
- **Retry pass in TUI**: The re-analyzed suggestions for rejected repos are presented as a second review pass, clearly labelled as retries.
- **Session summary update**: The summary screen distinguishes between skipped (neutral), rejected (bad AI output, retried), and applied counts.

## Capabilities

### New Capabilities

- `rejection-feedback`: Captures a reason when the user rejects a suggestion and persists it alongside the rejected suggestion for the retry pass.
- `rejection-retry-prompt`: Builds a modified AI prompt for re-analysis that injects the prior suggestion and rejection reason as hard negative constraints, steering the model away from repeating the same mistake.

### Modified Capabilities

- `tui-review`: Skip and reject are now semantically distinct actions with different keyboard flows and outcomes. Reject triggers a reason prompt; skip does not.
- `suggestion-engine`: Must support a retry pass that re-feeds rejected repos back through the AI analyzer with the rejection-aware prompt.

## Impact

- `src/tui/` — new rejection reason modal/input prompt; updated keybindings and session summary
- `src/ai/prompts.ts` — new `buildRetryPrompt(prior, rejectionReason?)` function alongside existing `buildUserMessage`
- `src/suggestions/` — retry orchestration: collect rejected repos, invoke analyzer with retry prompt, merge results into a second suggestion batch
- No changes to GitHub API / mutation layer — retried suggestions go through the same accept/apply flow
