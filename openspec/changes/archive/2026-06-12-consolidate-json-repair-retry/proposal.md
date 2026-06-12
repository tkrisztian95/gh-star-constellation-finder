Tracks #39

## Why

When a pass-2 consolidation LLM call returns truncated or slightly malformed JSON, `parseRemapping` throws and the coordinator falls back to identity remapping — converting a recoverable formatting mistake into a total loss of consolidation work for that scope (the whole run on the single-chunk path, or one chunk on the multi-chunk path). The user's only remedy today is to re-run the entire pipeline. One cheap repair attempt on the failure path recovers most of these cases at zero cost to the happy path.

## What Changes

- On a consolidation JSON parse failure, before falling back to identity, issue **one** additional provider call with a minimal "return ONLY the corrected JSON" repair prompt, then re-parse.
- If the repaired output parses, use it. If it still fails (or the repair call errors), fall back to identity exactly as today.
- Apply the repair retry at the pass-2 consolidation parse sites: the single-chunk path, each chunk on the multi-chunk path, and the reducer step.
- Both the original parse failure and the repair outcome (recovered / still-failed) are logged.
- No change to the happy path — the repair call only fires after a parse throw. AI-pipeline behavior is identical in interactive TUI and headless `--analyze-only` modes (shared engine).

### Breaking changes

None. Pure failure-path enhancement; session JSON and cache formats are unchanged.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `category-consolidation`: a consolidation parse failure SHALL trigger one JSON-repair retry before identity fallback.

## Impact

- `src/orchestration/consolidationCoordinator.ts` — wrap the consolidate/reducer parse sites with a repair-retry helper.
- `src/ai/prompts.ts` — add a `buildJsonRepairPrompt(content)` builder.
- `src/__tests__/` — cover repair-success and repair-still-fails paths at the `AIProvider` seam.
- One extra provider call only on the parse-failure path; zero added latency on success. Ships as a v0.3.x patch.
