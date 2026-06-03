# Entity extraction architecture

How the project turns a starred repo into a set of technical **entities**
(LANGUAGE / FRAMEWORK / TOOL / CONCEPT / ORG / PERSON / DOMAIN) — the building
blocks of the v0.3.0 constellation graph.

## The seam

Entity extraction is deliberately **separate** from analysis. Analysis
(`category` / `killerFeature` / `description`) is a generative/judgment task;
entity extraction is span extraction. Mixing them into one prompt dilutes both,
so they live behind different interfaces.

```
AIProvider.analyze()          -> { category, killerFeature, description }   (generative)
EntityExtractor.extract(input) -> Entity[]                                    (extraction)
```

`EntityExtractor` (`src/ai/entityExtractor.ts`):

```ts
interface EntityExtractor {
  extract(input: EntityExtractionInput, parent?): Promise<Entity[]>;
}
```

Anything implementing it can produce entities; the rest of the pipeline (cache,
corpus export, constellation) doesn't care which engine ran.

## Implementations

| Engine | File | What | Cost |
|--------|------|------|------|
| **LLM** (default) | `entityExtractor.ts` → `LlmEntityExtractor` | prompts the configured `AIProvider.complete()`; normalized, graph-ready entities | one LLM call / repo |
| **GLiNER** (opt-in) | `glinerExtractor.ts` → `GlinerExtractor` | local zero-shot ONNX NER, no Python, no LLM | ~0.1s/repo, local |
| **Alias** (wrapper) | `aliasMap.ts` → `AliasNormalizingExtractor` | deterministic canonicalization of known variants (TS→TypeScript) | free |
| **LLM-normalize** (wrapper) | `entityNormalizer.ts` → `LlmNormalizingExtractor` | LLM cleans a base extractor's candidate **list** (not the README) | small LLM call |

Wrappers compose, so the layered pipeline is just nesting:

```ts
new LlmNormalizingExtractor(
  new AliasNormalizingExtractor(new GlinerExtractor({ modelPath })),
  provider,
)
// GLiNER (recall, reads README) → alias (free, known variants) → LLM (cleans the tail)
```

A deterministic `filterEntities()` (`entityFilter.ts`) runs in every path to drop
license/badge/CI/generic/URL noise and de-duplicate.

## Default & opt-in

- **Default is LLM.** It returns canonical, correctly-labeled entities with no
  post-processing — graph-ready out of the box.
- **GLiNER is dormant by default.** `gliner` + `onnxruntime-node` are
  `optionalDependencies`; `GlinerExtractor` loads them via dynamic `import()` only
  when actually used. The ~183MB ONNX model is a constructor arg (lazy, gitignored,
  fetched on use). Nothing is pulled unless GLiNER is selected.

## Why these choices (measured)

A README A/B (60 repos) showed README-grounded extraction yields **+68% unique
entities** over description-only — so entities are extracted where the README
already lives. A GLiNER-vs-LLM comparison (`scripts/compareExtractors.ts`) showed
GLiNER is ~20× faster but emits raw, unnormalized spans that would fragment the
graph; the layered pipeline recovers precision. The cost story favors the
GLiNER+LLM-normalize hybrid on **cloud** (LLM sees a short list, not the README),
not on local (LLM latency floor).

The definitive comparison needs a ground-truth goldset — see
[`evals/goldset-bakeoff/`](../evals/goldset-bakeoff/), which distills a consensus
goldset from multiple frontier models. Until then, `compareExtractors.ts` reports
agreement vs the LLM-full run as a proxy.

## Persistence & contract

Extracted entities flow downstream unchanged:

- **Cache** (`analysisCache.ts`, schema v3): an `entities` JSON column; entities
  survive a cache round-trip so they're computed once per repo.
- **Corpus contract** (`corpus/types.ts`): `corpusEntrySchema.entities` — so
  `--export-corpus` ships entities and the constellation consumer needs no second
  extraction pass.

## Related

- Issue #53 (entity extraction), #54 (graph), #59 (readme-vs-description source switch)
- Prototype: the `ner-structured` repo (the original Python constellation spike)
