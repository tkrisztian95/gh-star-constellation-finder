Tracks #42

## Why

Today's per-repo `AnalysisResult` carries `category` (the list name) and `killerFeature` (one compelling reason). Both are great for human-readable labels but weak as embedding inputs: `category` is a short noun phrase shared by many repos, and `killerFeature` is a single selling point, not a description of what the repo *is*. The next milestone slice (`analysis-embeddings`) needs a denser, retrieval-friendly summary per repo to embed for semantic search. This slice adds that field. Second slice of the [v0.2.0 milestone](../../../docs/milestone-v0.2.0.md); README reframe (#41) already landed so the new field is documented in the right narrative.

## What Changes

- Add a `description: string` field to `AnalysisResult` — 1–2 technical sentences describing what the repo does, written for semantic search rather than marketing.
- Extend the analyzer `responseSchema` (Zod) and `parseAnalysisResponse` to accept and validate `description`, with graceful fallback to an empty string when the model omits it (mirrors today's `killerFeature` lenient path).
- Update the analyze prompts (`BASE_SYSTEM_PROMPT`, `buildAnalyzeRepoPrompt`) to instruct the model to emit `description` as a third JSON field: 1–2 factual technical sentences, no marketing fluff, optimised for retrieval.
- Add a `description TEXT NOT NULL` column to the analysis cache and bump `SCHEMA_VERSION` to `2`. **BREAKING**: existing v1 cache entries lack the column; on a schema-version mismatch the cache SHALL drop and recreate the `entries` table (the next run re-analyses). The cache file format is not frozen pre-1.0.
- Surface `description` in the `--analyze-only` JSON output (each analyzed-repo entry) and in the interactive session JSON, flowing automatically from the enriched `AnalysisResult`.

## Capabilities

### New Capabilities

_None._ This slice enriches existing capabilities; it introduces no new spec.

### Modified Capabilities

- `ai-analysis`: `AnalysisResult` gains a required `description` field; `responseSchema` validates it and `parseAnalysisResponse` falls back to `""` when absent.
- `repo-analysis-prompt`: the analyze prompts instruct the model to return `description` as a third JSON field with retrieval-oriented wording constraints.
- `analysis-cache`: the cache schema gains a `description` column, `SCHEMA_VERSION` bumps to `2`, and a version-mismatch on open drops + recreates the table instead of silently keeping a stale-shape table.
- `analyze-only-output`: each analyzed-repo entry in the headless JSON includes the `description` field.

## Impact

- **Code**: `src/ai/types.ts` (type + schema + parser), `src/ai/prompts.ts` (prompt wording), `src/cache/analysisCache.ts` (column, version bump, migration), `--analyze-only` JSON assembly and session JSON serialization (both read from `AnalysisResult` and need the new key threaded through).
- **Data**: existing `.cache/analysis.db` v1 files are dropped on first run under v2 (one-time full re-analysis; cost is one AI pass per starred repo).
- **Out of scope**: embedding the description (`analysis-embeddings`, next slice); multi-angle facets (#11, v0.3.0); any change to `category` / `killerFeature` semantics.
