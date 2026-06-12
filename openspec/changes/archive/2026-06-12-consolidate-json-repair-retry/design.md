## Context

`src/orchestration/consolidationCoordinator.ts` has three pass-2 parse sites that today rethrow or fall straight to identity on a `parseRemapping` failure:

- **Single-chunk path** (`runChunkedConsolidation`, ~L60-65): parse failure rethrows → caught by the outer `consolidateCategories` catch (~L277) → identity for the whole run.
- **Multi-chunk path** (~L87-93): each chunk's parse failure rethrows → `Promise.allSettled` rejects that chunk → per-chunk identity (~L108).
- **Reducer** (~L144-163): parse failure is caught and the pre-reducer `composedRemapping` is kept (budget enforcement is the safety net).

All three call `provider.complete(prompt, generationName, span)` and parse with `parseRemapping(content, names)`. The provider seam is `complete(prompt, generationName, parent?) => Promise<string>` (`src/ai/types.ts:81`). Pass-1 (`deduplicate-language-qualifiers`, ~L235) is a different prompt family and is **out of scope** for this change.

## Goals / Non-Goals

**Goals:**
- One repair attempt per failed consolidation parse, then existing identity fallback.
- Keep the happy path untouched (no extra call when the first parse succeeds).
- Single shared helper so all three sites behave identically and stay testable at the `AIProvider` seam.

**Non-Goals:**
- No repair on pass-1 qualifier dedup, reroute, or any non-consolidation parse.
- No multi-attempt repair loop — exactly one retry, matching the issue.
- No change to budget enforcement or the identity-fallback semantics themselves.

## Decisions

1. **Add a `parseRemappingWithRepair` helper in the coordinator.** Signature roughly: `(provider, content, names, generationName, span) => Promise<Map<string,string>>`. It tries `parseRemapping(content, names)`; on throw it logs the failure, calls `provider.complete(buildJsonRepairPrompt(content), \`${generationName}-repair\`, span)`, and re-parses. A second failure (or a thrown repair call) re-throws the **original** error so each call site keeps its current fallback path unchanged. This means:
   - Single-chunk: still rethrows on total failure → outer catch → run-level identity (unchanged contract).
   - Multi-chunk: still rejects the chunk on total failure → per-chunk identity (unchanged contract).
   - Reducer: wrap the `parseRemapping` call; on total failure the existing `catch` keeps the pre-reducer map (unchanged contract).
2. **Add `buildJsonRepairPrompt(content)` to `src/ai/prompts.ts`.** Tiny, fence-free instruction: "The following JSON output was truncated or malformed. Return ONLY the corrected JSON object — no prose, no code fences." followed by the raw `content`. Keep it short so it survives a tight `num_predict`.
3. **Reuse `logParseFailure` + add a repair-outcome log.** Emit `consolidation JSON repair {recovered|failed}` so the log shows both the original failure and whether repair saved the work.
4. **Test at the provider seam.** A mock `AIProvider` returns malformed JSON on the first `complete` for a given generation name and valid JSON on the `-repair` call → assert recovery; and malformed on both → assert identity fallback and that exactly one repair call was made.

## Risks / Trade-offs

- **Extra latency only on failures:** the repair call adds one round-trip, but exclusively when a parse already failed — strictly better than the current total loss. Acceptable.
- **Repair prompt could itself over-run `num_predict`:** mitigated by keeping the prompt minimal; if repair output is also truncated it simply fails to parse and we fall back to identity, i.e. no worse than today.
- **Ollama has no token counts:** the repair call adds nothing token-reporting-specific; existing backend branching in tracing is unaffected.
