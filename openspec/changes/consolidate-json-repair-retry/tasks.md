## 1. Repair prompt builder

- [ ] 1.1 Add `buildJsonRepairPrompt(content: string): string` to `src/ai/prompts.ts` — minimal, fence-free instruction to return ONLY the corrected JSON object, followed by the raw content.
- [ ] 1.2 Assert the builder output shape in `src/__tests__/prompts.test.ts` (no code fences, contains the malformed content).

## 2. Repair-retry helper in the coordinator

- [ ] 2.1 Add `parseRemappingWithRepair(provider, content, names, generationName, span)` to `src/orchestration/consolidationCoordinator.ts`: try `parseRemapping`; on throw, log the failure, issue one `provider.complete(buildJsonRepairPrompt(content), \`${generationName}-repair\`, span)`, re-parse; on second failure rethrow the original error.
- [ ] 2.2 Log the repair outcome (`recovered` / `failed`) alongside the existing `logParseFailure`.

## 3. Wire the helper into the three consolidate parse sites

- [ ] 3.1 Single-chunk path — replace the `parseRemapping` call with `parseRemappingWithRepair`, preserving the existing rethrow-to-outer-catch contract.
- [ ] 3.2 Multi-chunk path — use `parseRemappingWithRepair` per chunk so a chunk recovers instead of falling to per-chunk identity; preserve `allSettled` isolation on total failure.
- [ ] 3.3 Reducer step — use `parseRemappingWithRepair`; on total failure keep the existing catch that retains the pre-reducer `composedRemapping`.

## 4. Tests & quality gates

- [ ] 4.1 Mock `AIProvider` returning malformed JSON on the first consolidate call and valid JSON on the `-repair` call → assert the repaired remapping is used (no identity fallback).
- [ ] 4.2 Mock malformed JSON on both calls → assert identity fallback and that exactly one repair call was made.
- [ ] 4.3 Assert the happy path issues no `-repair` call.
- [ ] 4.4 Run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` — all clean.
