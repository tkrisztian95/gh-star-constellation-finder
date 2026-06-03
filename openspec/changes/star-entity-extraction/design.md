# Design

## Single-call extraction (no second pass)

`analyze()` already builds a prompt containing name + description + language + topics + README and returns `{category, killerFeature, description}`. We add `entities` as a fourth field of the same JSON response. This reuses the README context for free and keeps one LLM call per repo.

Rejected: a separate NER pass (as in the `ner-structured` prototype). It doubles per-repo cost and re-fetches/re-reads the same README. The producer-side single call is strictly better here.

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
