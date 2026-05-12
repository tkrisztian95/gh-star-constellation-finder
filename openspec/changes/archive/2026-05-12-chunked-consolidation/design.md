## Context

`consolidateCategories` in `src/orchestration/consolidationCoordinator.ts` runs two AI passes after per-repo analysis: pass 1 dedupes language/platform qualifier variants, pass 2 enforces the global list budget. Pass 2 sends `deduplicatedNames` (commonly 60–100 entries after pass 1) plus `effectiveExistingLists` plus distribution context as a single `provider.complete` call. The output is a JSON `{originalName: canonicalName}` map.

Three production failures in May 2026 (#26, #28, #30) share the same root cause: at this scale the single call grows past whatever model budget is dominant — context window, predict cap, or thinking-token budget — and either truncates mid-JSON or returns empty content. Each fix tuned one knob; the next run found the next bottleneck. The architecture itself ("one big call") is the bug.

Constraints inherited from the project:
- Headless `--analyze-only` parity: pipeline and engine must be identical to interactive TUI mode.
- "Other" bucket is sacred and must never be renamed/deleted by suggestion generation.
- Existing GitHub list cap of 32 (`GITHUB_MAX_LISTS`).
- Provider abstraction: do not bypass `AIProvider.complete` from orchestration.
- Langfuse tracing must remain opt-in and never affect runtime behaviour.

## Goals / Non-Goals

**Goals:**
- Cap the input and output size of every individual LLM call regardless of how many categories pass 1 produces.
- Preserve current consolidation correctness: the global remapping result must still respect `effectiveMaxLists`, never collide with existing list names, and never touch the "Other" bucket.
- Failure isolation: a single chunk that returns malformed JSON must not invalidate the other chunks.
- Latency improvement from parallelism is a welcome side-effect but not the primary motivation.

**Non-Goals:**
- Changing pass 1 (language-qualifier dedup). Pass-1 input is naturally bounded by the number of *distinct* proposed names *before* dedup; it's never been the failure surface.
- Changing the rerouting path (`rerouteOrphanRepos`). Same provider, different shape, separate concern — tracked elsewhere if needed.
- Changing the consolidation prompt's semantic instructions. The prompt content stays; only the *batching* around it changes.
- Streaming, JSON repair, or schema-mode (separately tracked in #34, #39, #33).
- Changing session JSON or cache file formats.

## Decisions

### 1. Chunk size of ~25 names, configurable internally but not exposed

Rationale: At 25 input names plus the prompt boilerplate plus `effectiveExistingLists`, the prompt fits comfortably under any current model's context budget, and the output (25 key-value pairs ≈ 500 tokens) is far below `num_predict: 8192`. We don't expose a flag because the right value depends on the prompt, not on user preference — and we want one tuning surface to maintain.

Alternatives considered: fixed 10 (too many round-trips for the common case), dynamic by token estimate (introduces a tokenizer dependency for marginal benefit). Reject both.

### 2. Each chunk receives the **same** `effectiveExistingLists` and `effectiveMaxLists`

Rationale: This preserves the per-chunk invariant that no chunk can produce a canonical name that collides with an existing list or that pushes the local count over the budget. The reducer then enforces the *global* count.

Alternative: divide the budget across chunks (e.g. budget/N per chunk). Rejected because it tilts the model toward over-merging on each chunk and produces worse semantic results than letting each chunk pick reasonable canonicals locally and arbitrating globally afterwards.

### 3. Reducer is *conditional*, not always invoked

Rationale: If the union of canonical names produced by the chunks already fits in `effectiveMaxLists`, no extra call is needed. The reducer fires only when over-budget. Saves an LLM call on the common case where chunks happen to converge on overlapping canonicals (e.g. multiple chunks independently pick "CLI Tools").

Reducer prompt is a stripped-down variant of `buildConsolidationPrompt` with input being just the over-budget union of canonicals, no distribution context, no existing-list context beyond the budget rule. Output is again `{originalCanonical: finalCanonical}`. Composition: chunk-canonical → reducer-final.

### 4. Chunks run in parallel via `Promise.allSettled`

Rationale: Failure isolation requires that one chunk's rejection does not abort the others. `Promise.allSettled` returns per-promise outcomes; failed chunks contribute an identity sub-map for their slice of names.

Alternative: `Promise.all` with try/catch inside each chunk. Equivalent semantically; `allSettled` reads cleaner and centralises the per-chunk error handling at the coordinator level.

### 5. Tracing: per-chunk generation under the existing `consolidation-phase` span

Rationale: The `consolidation-phase` span already exists. Each chunk's `provider.complete(prompt, "consolidate-categories-chunk-N", consolidationSpan)` automatically nests as a sibling generation. Reducer call uses name `consolidate-categories-reduce`. No new span primitives needed.

### 6. File log entries at chunk boundaries

Rationale: At `info` we want to see the shape of the run from `app.log` alone — chunk count, sizes, how many succeeded. At `warn` we already have the existing parse-failure shape; we keep it. Reducer firing/skipped is also `info`.

## Risks / Trade-offs

- **[Risk] Inconsistent canonicals across chunks** → the reducer is specifically designed to coalesce these. If two chunks pick "CLI Tools" and "Command Line Utilities" for similar inputs, the reducer merges them (or they both survive if under budget — acceptable redundancy).
- **[Risk] Parallel chunks load up the local Ollama server** → mitigated by Ollama's own request queueing. The OpenAI path has connection pooling. If this turns out to be a real issue, a `Promise` semaphore is the obvious knob.
- **[Risk] Reducer call hits the same overrun problems the original single call had** → very unlikely because the reducer's input is the *union of canonical names* across chunks (bounded by sum of chunk sizes / merge ratio), which is typically <30 names even for 100+ input categories. If it does happen, the reducer is a single call with the same outer catch as before, so we still degrade to identity on its slice — same failure mode but on much smaller surface.
- **[Trade-off] Slight semantic quality regression on edge cases**: chunks lose visibility into each other. The reducer compensates for the budget axis but not for "chunk A picked X, chunk B picked Y, and a global view would have produced Z". We accept this — empirically the bigger win is reliability over rare cross-chunk optimality.

## Migration Plan

No migration. The change is internal to `consolidateCategories`. The function signature stays. `onSubStep?.()` callbacks may emit slightly different progress messages ("Consolidating chunk 2 of 4…") but that's UI text, not API.

Rollback: revert the commit. No state changes, no schema changes.

## Open Questions

None blocking. Reducer prompt phrasing can be iterated post-merge against real runs.
