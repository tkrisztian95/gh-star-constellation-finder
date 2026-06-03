# Design

## Separate EntityExtractor seam (revised decision)

Initial plan bundled `entities` into the `analyze()` JSON as a fourth field (one call). We reversed this: entity extraction lives behind its own `EntityExtractor` interface (`src/ai/entityExtractor.ts`), and `analyze()` returns only the three generative fields.

Why the reversal:
- **Different task types.** category/killerFeature/description are generative/judgment; entities are span extraction. A single overloaded prompt dilutes both, especially on small local models.
- **Swappability.** The seam lets the entity engine change — LLM today (`LlmEntityExtractor` via the provider's `complete()`), a local zero-shot NER (GLiNER) or a dictionary matcher later — without touching the analysis prompt.
- **Independent tuning + eval.** Entity rules can change without risking category/description regressions, and each engine can be measured on its own.

Trade-off accepted: a second LLM call per cache-miss repo. For an occasionally-built graph this is acceptable, and cache hits pay nothing (entities are stored in the cache row).

The deterministic `filterEntities()` noise pass and the cache/corpus changes are unchanged by this revision.

## Label set

`LANGUAGE`, `FRAMEWORK`, `TOOL`, `CONCEPT`, `ORG`, `PERSON`, `DOMAIN` — the scheme proven in `ner-structured`. Mapped via a zod enum so the parser rejects unknown labels.

## Parsing & resilience

The existing `parseAnalysisResponse` is lenient (regex JSON extract + fallback). We extend it: `entities` defaults to `[]` when missing or malformed, and each entity is validated; invalid entities are dropped, never thrown. A missing/garbled `entities` field never fails an analysis that otherwise parsed.

## Noise filter

The experiment showed the model emits license/badge/CI junk (`apache 2.0`, `creative commons …`, `css`, `android`, shield URLs). A deterministic `filterEntities()` runs after parse:
- drop entities whose normalized name is in a STOPWORD set (license names, "badge", "ci", generic words),
- drop entities with empty/overlong names,
- de-duplicate by normalized (name,label).

Filtering is deterministic and unit-tested; it does not call the model.

## Cache migration

`SCHEMA_VERSION` 2 → 3. New column `entities TEXT` storing `JSON.stringify(entities)`. Follow the existing drop-and-recreate path in `applySchema` (v1→v2 already does this for `description`). On read, `JSON.parse` with a safe fallback to `[]`.

## Corpus contract

`corpusEntrySchema` (single source in `src/corpus/types.ts`) gains `entities: z.array(entitySchema)`. `toCorpusEntry` maps `analysis.entities`. The eval harness re-exports the same schema, so it stays in sync automatically.
