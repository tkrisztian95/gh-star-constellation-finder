## 1. Schema & types

- [ ] 1.1 Add `EntityLabel` zod enum (`LANGUAGE|FRAMEWORK|TOOL|CONCEPT|ORG|PERSON|DOMAIN`) and `entitySchema` (`{name, label}`) in `src/ai/types.ts`
- [ ] 1.2 Add `entities` to `responseSchema` with `.default([])`
- [ ] 1.3 Add `entities: Entity[]` to the `AnalysisResult` interface
- [ ] 1.4 Extend `parseAnalysisResponse` to extract/validate entities leniently (default `[]`, drop invalid, never throw)

## 2. Prompt

- [ ] 2.1 Add an `entities` field + label definitions to `BASE_SYSTEM_PROMPT` in `src/ai/prompts.ts`
- [ ] 2.2 Add DO-NOT rules excluding license/badge/CI/marketing noise
- [ ] 2.3 Update the JSON-keys line in `buildAnalyzeRepoPrompt`

## 3. Entity filter

- [ ] 3.1 Add `filterEntities()` in `src/ai/entityFilter.ts` — stopword + label sanity + dedup, deterministic
- [ ] 3.2 Apply it in `parseAnalysisResponse` (or right after) so all call sites get filtered entities

## 4. Cache migration

- [ ] 4.1 Bump `SCHEMA_VERSION` 2 → 3 and add `entities TEXT` column in `src/cache/analysisCache.ts`
- [ ] 4.2 Serialize entities on `saveEntry`, parse on `get` with `[]` fallback

## 5. Corpus contract

- [ ] 5.1 Add `entitySchema` + `entities` to `corpusEntrySchema` in `src/corpus/types.ts`
- [ ] 5.2 Map `analysis.entities` in `toCorpusEntry` (`src/corpus/exportCorpus.ts`)

## 6. Tests

- [ ] 6.1 `parseAnalysisResponse`: entities parsed; missing/garbled → `[]`; invalid entity dropped
- [ ] 6.2 `filterEntities`: stopwords removed, dedup, empty/overlong dropped
- [ ] 6.3 cache round-trip with entities (save → get)
- [ ] 6.4 `toCorpusEntry` includes entities; corpus schema validates

## 7. Verify

- [ ] 7.1 `bun run typecheck`, `bun run lint`, all test files pass
- [ ] 7.2 `bun run evals --check` still reproduces baseline (corpus schema change is additive)
- [ ] 7.3 Smoke: `--export-corpus` on a few real stars emits `entities` per entry
