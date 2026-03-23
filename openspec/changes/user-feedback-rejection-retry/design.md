## Context

The TUI review flow currently offers three actions: accept (`a`/`Enter`), skip (`s`), and reject (`r`). Both skip and reject silently drop the suggestion — the only difference is that reject increments a counter in the session summary. This makes rejection semantically empty.

The goal is to make rejection carry signal: the user is telling us the AI got it wrong. That signal should feed back into the AI analysis as negative constraints, producing a corrected suggestion on a second pass.

The existing `src/ai/prompts.ts` module (from the `improve-ai-analysis-prompts` change) already centralises prompt construction. The new `buildRetryPrompt` function slots in there. The suggestion orchestration layer that drives the TUI already iterates over analysed repos; a retry pass is a second iteration over the rejected subset.

## Goals / Non-Goals

**Goals:**
- Clear semantic split: skip = neutral, reject = signal of bad AI output
- Optional free-text rejection reason captured in TUI without blocking flow
- Retry pass: rejected repos re-analysed with a prompt injecting prior suggestion + reason
- Retry results presented as a second review pass in the same TUI session
- Session summary distinguishes skip / reject-retried / accept counts

**Non-Goals:**
- Persisting rejection history across sessions (no database or file cache)
- Automatic retry without user explicitly choosing to run the retry pass
- Changing the accept or skip flows in any way
- Multi-round retry (more than one retry pass per session)

## Decisions

### Decision: Rejection reason is optional and inline

**Options considered:**
1. Require a reason before advancing (blocking modal)
2. Optional inline input — press `r` to reject, then optionally type a reason and confirm
3. Pre-set reason categories (wrong category, too generic, etc.)

**Chosen: Option 2** — optional inline input. Blocking the flow on a required field would make rejection feel costly and discourage its use. Pre-set categories add UI complexity with marginal prompt improvement over free text. A single optional text field after `r` keeps the flow fast while capturing nuance when the user has something to say.

Implementation: after `r` is pressed, the TUI enters a brief "reason?" sub-state. The user can type a reason and press `Enter`, or press `Esc`/`Enter` immediately to skip the reason. Either way, the review advances to the next suggestion.

### Decision: Retry prompt uses negative-constraint injection

**Pattern (from prompt-engineering skill):**

```
Previously rejected attempt:
- Suggestion: Move to list "Developer Tools"
- Reason: "too generic, this is specifically a Rust CLI framework"

Do NOT repeat this approach.
Hard constraints derived from feedback:
- Category must be more specific than "Developer Tools"

Now re-analyze: [repo metadata + README]
```

**Why:** Structuring the rejection as an explicit negative constraint is more reliable than asking the model to "do better". It mirrors few-shot learning in reverse — a negative example with an explanation.

The `buildRetryPrompt(repo, priorSuggestion, rejectionReason?)` function in `src/ai/prompts.ts` assembles this block and prepends it to the standard user message, keeping the system prompt unchanged.

### Decision: Retry pass is a separate sequential phase, not interleaved

After all initial suggestions are reviewed (or the user explicitly triggers "retry rejected"), the rejected repos are re-analysed in a batch, then presented as a second TUI review pass labelled **"Retry Pass — N repositories"**. This is simpler than interleaving retried suggestions into the original queue and makes the two passes auditable.

### Decision: Rejection state lives in the TUI session object, not a new store

The `RejectedEntry` type (`{ repo, suggestion, reason? }`) is appended to a `rejectedEntries` array in the existing session state. No new storage layer. After the initial pass ends, the orchestrator reads this array, runs the retry analysis, and feeds the new suggestions back into a second TUI model.

## Risks / Trade-offs

- **Retry adds latency** — re-analysing N rejected repos is N more AI API calls. Mitigation: show a progress indicator (same spinner as initial analysis) and allow skipping the retry pass entirely.
- **Rejection reason is unstructured** — free text is harder to use as a prompt constraint than structured categories. Mitigation: `buildRetryPrompt` includes the raw reason verbatim and also adds a generic "be more specific" instruction as a fallback when no reason is given.
- **User may reject good suggestions** — misfire rejections waste a retry API call. Mitigation: this is acceptable; the retry result will likely be similar, and the user can skip it again.
- **No multi-round retry** — one retry pass may not fix a stubborn categorisation. Mitigation: out of scope for this change; users can always skip the retry result and handle the repo manually.
