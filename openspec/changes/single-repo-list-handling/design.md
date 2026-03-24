## Context

`suggestionEngine.ts` generates `Suggestion[]` from analyzed repos. For each category not matching an existing GitHub list, it emits one `create-list` suggestion for the first repo and `move-to-list` (with `isPendingCreate: true`) for subsequent repos in the same category. After AI consolidation remaps many fine-grained category names into fewer canonical names, some categories can end up with a single member — making the new list a singleton.

GitHub lists with one repo carry no organisational benefit and waste one of the 32 available list slots. Rather than simply dropping such repos, we use the AI to re-route them into the most appropriate existing or pending list.

## Goals / Non-Goals

**Goals:**
- Detect any pending new list that would have exactly one member after consolidation.
- Use the AI to assign each orphan repo to the best available target list (existing GitHub lists or pending lists with ≥2 members).
- Re-route the repo's suggestion to the AI-chosen target; fall back to dropping the suggestion if the AI finds no good match.
- Provide a clear per-repo warning in the summary for any repo that was re-routed or dropped.

**Non-Goals:**
- Multi-turn or iterative AI resolution (one AI call per re-routing batch is enough).
- Re-routing repos that are already members of an existing list.
- Pruning existing GitHub lists that already have one member (out of scope).
- Configuring the minimum-member threshold (hard-code to 2).

## Decisions

### 1. Re-routing runs inside `generateSuggestions`, not in a separate pipeline stage

**Decision:** After the full `suggestions` array is built, identify singleton pending lists, call `rerouteOrphanRepos`, then patch the suggestions before returning.

**Rationale:** All grouping state (pending list IDs, member counts) is already present at the end of `generateSuggestions`. Keeping re-routing here avoids leaking internal structure to callers.

**Alternative considered:** Caller-side re-routing in `index.tsx`. Rejected — leaks internal grouping semantics upward.

### 2. AI re-routing lives in `consolidator.ts` as `rerouteOrphanRepos`

**Decision:** Add a new exported async function `rerouteOrphanRepos(orphans, availableTargets, backend)` to `src/ai/consolidator.ts`, mirroring the pattern of `consolidateCategories`.

**Rationale:** The consolidator already handles the OpenAI/Ollama routing and prompt dispatch. Re-using that pattern keeps AI call logic centralised and avoids duplicating backend selection logic in the suggestion engine.

### 3. Re-routing prompt asks for a JSON mapping of orphan category → target list name

**Decision:** Add `buildReroutingPrompt(orphans, availableTargets)` to `src/ai/prompts.ts`. The AI receives each orphan's category and the list of available targets; it returns a JSON object `{ [orphanCategory]: targetListName | null }`.

**Rationale:** A single batched call for all orphans is cheaper and simpler than one call per repo. Returning `null` for no-match gives a clean fallback signal.

**Alternative considered:** Asking the AI to return a confidence score. Rejected — unnecessary complexity; null is sufficient for the fallback path.

### 4. Fallback to dropping if AI returns null

**Decision:** If the AI maps an orphan to `null` (or the call fails), the repo's suggestion is removed and added to `reroutedRepos` with a `dropped: true` flag.

**Rationale:** Forcing a bad assignment is worse than no assignment. The user sees the warning and can act manually.

### 5. Return re-routing results as structured data, not logs

**Decision:** Extend `SuggestionResult` with `reroutedRepos: { repoName: string; category: string; targetList: string | null }[]` instead of warning strings.

**Rationale:** Structured data lets the summary screen render context-appropriate messages (re-routed vs. dropped) without parsing strings.

## Risks / Trade-offs

- **Risk:** AI picks a semantically wrong target list for an orphan repo.
  → **Mitigation:** The available targets are constrained to existing lists the user already created plus other well-populated pending lists — the AI has a bounded, meaningful choice set.

- **Risk:** Re-routing AI call adds latency for every run that has orphans.
  → **Mitigation:** Orphan repos are rare (edge case after consolidation). The call is batched for all orphans in one request.

- **Risk:** Re-routing call fails (network, API key missing).
  → **Mitigation:** Failure falls back to dropping the suggestion — identical to the previous pruning behaviour. A warning is still surfaced.

- **Risk:** Re-routing removes a `create-list` but leaves orphaned `move-to-list` entries with `isPendingCreate: true`.
  → **Mitigation:** Re-routing must remove ALL suggestions referencing the same singleton `targetListId`, then insert a replacement `move-to-list` pointing at the chosen target.

## Migration Plan

No data migrations or deployment steps required — purely additive changes to existing modules. Feature is in effect immediately after merge.

## Open Questions

None.
