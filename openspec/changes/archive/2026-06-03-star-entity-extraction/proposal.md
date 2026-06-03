Tracks #53. Part of the v0.3.0 constellation epic (#52).

## Why

The corpus today carries only the distilled `category` / `killerFeature` / `description`. To build a "constellation" — repos linked by shared technical entities (#54) — we need the entities themselves. An A/B experiment (60 real stars) showed README-grounded extraction yields **+68% unique entities** over description-only (real deps like `controller-runtime`, `commons-codec` surface), at the cost of license/badge noise that needs filtering.

The analyzer already reads the full README in `analyze()`, so entities can be extracted in the **same LLM call** that produces the description — no extra pass, no extra cost.

## What Changes

- Add an `entities: { name: string; label: EntityLabel }[]` field to `AnalysisResult`, populated by the existing `analyze()` call. Labels: `LANGUAGE`, `FRAMEWORK`, `TOOL`, `CONCEPT`, `ORG`, `PERSON`, `DOMAIN`.
- Extend the analysis prompt to request entities, with explicit DO-NOT rules excluding license/badge/CI noise.
- Add a deterministic post-parse **entity filter** (stopword list + label sanity) to catch noise the model still emits.
- Migrate the analysis cache schema v2 → v3 (new `entities` JSON column; drop + recreate, same pattern as the v1→v2 `description` add — entries re-analysed once).
- Carry `entities` in the corpus contract (`src/corpus/types.ts`) so `--export-corpus` ships them and the downstream constellation consumes them directly.

## Breaking changes

- **Analysis cache schema v2 → v3.** Existing cache entries are dropped and re-analysed once on first run (no entities to backfill). Same one-time cost as the v1→v2 migration.
- **Corpus contract gains a required `entities` field.** Consumers reading old corpus files without `entities` must treat it as optional/empty; producers always emit it. (Pre-1.0, contract not frozen.)

## Out of scope

- The README-vs-description **source switch** (#59) — entities here always use whatever text `analyze()` already sees (README by default). The switch is a follow-up.
- Graph building (#54), `--constellation` (#55), MCP (#56).
