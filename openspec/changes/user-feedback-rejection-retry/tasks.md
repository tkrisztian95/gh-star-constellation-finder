## 1. Types and Data Model

- [ ] 1.1 Define `RejectedEntry` type (`repo`, `suggestion`, `reason?: string`) in a shared types file
- [ ] 1.2 Add `rejectedEntries: RejectedEntry[]` to the TUI session state type
- [ ] 1.3 Add optional `retryContext: { priorSuggestion: Suggestion; reason?: string }` parameter to the `Analyzer` interface's `analyze()` method

## 2. Retry Prompt

- [ ] 2.1 Add `buildRetryPrompt(repo, priorSuggestion, rejectionReason?: string): string` to `src/ai/prompts.ts`
- [ ] 2.2 Ensure rejection context block appears before repo metadata in the prompt output
- [ ] 2.3 Add fallback instruction when no reason is provided ("Try a more specific or differently framed category")

## 3. Analyzer Updates

- [ ] 3.1 Update `openaiAnalyzer.ts` to call `buildRetryPrompt` when `retryContext` is provided, `buildUserMessage` otherwise
- [ ] 3.2 Update `ollamaAnalyzer.ts` with the same optional `retryContext` branching

## 4. Suggestion Engine Retry Orchestration

- [ ] 4.1 Add `retryRejected(entries: RejectedEntry[], analyzer: Analyzer): Promise<Suggestion[]>` to the suggestion engine
- [ ] 4.2 Handle `analysis-failed` results from the retry pass without aborting remaining entries

## 5. TUI — Reject Action and Reason Capture

- [ ] 5.1 Update reject keybinding handler to enter a reason-capture sub-state instead of immediately advancing
- [ ] 5.2 Render the reason prompt label (`"Rejection reason (optional, Enter to skip):"`) in the sub-state view
- [ ] 5.3 On `Enter` or `Esc` in sub-state: create a `RejectedEntry`, append to session state, advance to next suggestion
- [ ] 5.4 Ensure skip (`s`) does not trigger the reason sub-state and produces no `RejectedEntry`

## 6. TUI — Session Summary Screen

- [ ] 6.1 Update summary screen to show separate accepted / skipped / rejected counts
- [ ] 6.2 When `rejectedEntries.length > 0`, display the retry prompt: `"Retry N rejected repositories? [y/N]"`
- [ ] 6.3 On `y`: trigger retry analysis pass and open the retry review pass
- [ ] 6.4 On `n` or `Enter` (default): skip retry and proceed to applying accepted suggestions

## 7. TUI — Retry Review Pass

- [ ] 7.1 Show analysis progress indicator during retry: `"Re-analyzing X / N rejected repositories..."`
- [ ] 7.2 Display the retry pass header: `"Retry Pass — N repositories"`
- [ ] 7.3 Allow accept / skip / reject during retry pass using the same keybindings
- [ ] 7.4 On reject during retry pass: record in final summary but do NOT queue another retry prompt

## 8. Final Summary

- [ ] 8.1 Update the post-retry summary to include retry-pass outcomes (accepted from retry, skipped from retry, still-rejected after retry)
