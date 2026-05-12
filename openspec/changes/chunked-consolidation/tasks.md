## 1. Chunking primitives

- [x] 1.1 Add `CONSOLIDATION_CHUNK_SIZE` constant (25) to `src/ai/consolidatorDelegator.ts` next to `GITHUB_MAX_LISTS`
- [x] 1.2 Add `chunkProposedNames(names: string[], size: number): string[][]` pure helper to `src/ai/consolidatorDelegator.ts`
- [x] 1.3 Unit test `chunkProposedNames` for: empty input, exact multiple, last partial chunk, single chunk under size

## 2. Chunked map step

- [x] 2.1 In `src/orchestration/consolidationCoordinator.ts`, replace the pass-2 IIFE with a new helper `runChunkedConsolidation(deduplicatedNames, provider, effectiveExistingLists, effectiveMaxLists, strategy, distributionContext, consolidationSpan)`
- [x] 2.2 Single-chunk fast path: if `deduplicatedNames.length <= CONSOLIDATION_CHUNK_SIZE`, behave identically to the old pass-2 (one `provider.complete` call, same prompt, same span name `consolidate-categories`)
- [x] 2.3 Multi-chunk path: build one prompt per chunk via `buildConsolidationPrompt`, pass through `provider.complete` with span name `consolidate-categories-chunk-${i}`, run via `Promise.allSettled`
- [x] 2.4 Per-chunk error handling: on rejection or parse failure, identity-map that chunk's names AND emit the existing `logger.warn("consolidation JSON parse failed", { phase: "consolidate-categories", … })` shape
- [x] 2.5 Compose per-chunk remappings into one map covering all `deduplicatedNames`
- [x] 2.6 Emit `logger.info("consolidation chunks complete", { chunkCount, chunkSize, failedChunks })` after the map step

## 3. Reducer step

- [x] 3.1 Add `buildConsolidationReducerPrompt(canonicalNames: string[], existingLists: ExistingListContext[], maxLists: number): string` to `src/ai/prompts.ts` — minimal variant of `buildConsolidationPrompt` with input being just the over-budget canonical set
- [x] 3.2 Unit test the reducer prompt: must include canonical names, must include the budget number, must NOT include distribution context
- [x] 3.3 In `runChunkedConsolidation`, after composing per-chunk maps, compute the set of distinct canonical names that are not in `effectiveExistingLists`
- [x] 3.4 If that set fits `effectiveMaxLists`, skip reducer; emit `logger.info("consolidation reducer skipped", { canonicalCount, budget })`
- [x] 3.5 If over budget, call `provider.complete(reducerPrompt, "consolidate-categories-reduce", consolidationSpan)` once; parse with `parseRemapping`
- [x] 3.6 Compose chunk-canonical → reducer-final into the returned remapping
- [x] 3.7 On reducer failure (rejection or parse error): emit `logger.warn` matching the same shape, fall through with chunk-canonical (may slightly exceed budget — accept this as a graceful degrade rather than identity-mapping everything)
- [x] 3.8 Emit `logger.info("consolidation reducer applied", { canonicalsIn, canonicalsOut })` on reducer success

## 4. Tests

- [ ] 4.1 In `src/__tests__/consolidator.test.ts`, add test: 30 proposed names with chunk size 25 → 2 provider.complete calls (no reducer if union fits)
- [ ] 4.2 Add test: 60 proposed names with mock provider that returns identity per chunk → composed remapping equals identity for all 60
- [ ] 4.3 Add test: 60 proposed names, chunk 2 mock provider rejects → other chunks' remappings preserved, chunk 2 falls back to identity, run completes
- [ ] 4.4 Add test: chunks return distinct canonical sets that exceed `effectiveMaxLists` → reducer call is issued and the final remapping respects the budget
- [ ] 4.5 Add test: single-chunk fast path (10 proposed names, chunk size 25) → exactly 1 provider.complete call, no reducer
- [ ] 4.6 In `src/__tests__/prompts.test.ts`, add tests for `buildConsolidationReducerPrompt` shape

## 5. Quality gates and integration

- [ ] 5.1 `bun run typecheck` clean
- [ ] 5.2 `bun run lint` clean
- [ ] 5.3 All `src/__tests__/consolidator.test.ts` tests pass (old 12 + new ~5)
- [ ] 5.4 All `src/__tests__/prompts.test.ts` tests pass (old 11 + new ~2)
- [ ] 5.5 `bun run format:check` clean for edited files
- [ ] 5.6 Verify headless `--analyze-only` still works (no flag changes, smoke test against a small fixture)

## 6. Wrap-up

- [ ] 6.1 Run `/opsx:archive` to move change folder under `openspec/changes/archive/` and promote spec delta into `openspec/specs/category-consolidation/spec.md`
- [ ] 6.2 Open PR with title `feat(chunked-consolidation): map-reduce pass 2`, body ending with `Closes #32`
