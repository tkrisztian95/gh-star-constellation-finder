## Context

Per-repo analysis returns `{ category, killerFeature, dataQuality? }`. The next milestone slice embeds repos for semantic search; neither field is a good embedding input. This slice adds a `description` field at the analyzer seam, threads it through the Zod schema, the prompts, and the SQLite analysis cache, and surfaces it in headless + session JSON. The cache schema is currently versioned via `PRAGMA user_version` but never read back — `applySchema` only runs `CREATE TABLE IF NOT EXISTS` and writes the version. Adding a `NOT NULL` column therefore needs explicit migration logic, not just a bump.

## Goals / Non-Goals

**Goals:**
- Add a required `description: string` to `AnalysisResult`, validated by `responseSchema`, lenient on absence (fallback `""`, matching today's `killerFeature` path).
- Instruct the model to emit a retrieval-oriented description (1–2 technical sentences, no marketing).
- Persist `description` in the cache; bump `SCHEMA_VERSION` to `2`; drop+recreate `entries` on a version mismatch.
- Surface `description` in `--analyze-only` JSON and session JSON with zero extra plumbing (flows through `AnalysisResult`).

**Non-Goals:**
- Embedding the description (next slice, `analysis-embeddings`).
- Incremental column migration that preserves v1 rows (we clear instead).
- Any change to `category` / `killerFeature` semantics or the "Other" bucket.

## Decisions

**1. `description` is required in the TS type but lenient in the parser.**
The interface field is non-optional so every downstream consumer can rely on a string. `parseAnalysisResponse` and `responseSchema` default it to `""` when the model omits it — same forgiving contract `killerFeature` already has. Alternative (optional `description?`) rejected: it pushes `?? ""` guards into every consumer (cache write, JSON emit) for no gain.
- Zod: `description: z.string().default("")` so a valid object without the key still parses.
- Fallback branch in `parseAnalysisResponse`: read `raw["description"]` as string-or-`""`, return it alongside `category`/`killerFeature`.

**2. Cache migration = drop-and-recreate on version mismatch.**
On open, read `PRAGMA user_version`; if `< SCHEMA_VERSION`, `DROP TABLE IF EXISTS entries` before `CREATE TABLE`, then set `user_version = 2`. Cheap, deterministic, and re-analysis is the only correctness-safe path since v1 rows have no description to backfill. Alternative (`ALTER TABLE ADD COLUMN description TEXT NOT NULL DEFAULT ''`) rejected: it would silently serve descriptionless cached entries forever, defeating the point of the slice (every repo must get a real description for the embedding slice that follows).

**3. New column is `description TEXT NOT NULL`.**
Mirrors `killer_feature TEXT NOT NULL`. The app always writes a string (possibly empty), so `NOT NULL` holds and keeps the schema uniform. Read path adds `description` to the `SELECT` and the row→`AnalysisResult` mapping; write path adds it to the `INSERT OR REPLACE` column list and bound params.

**4. Headless + session surfacing is automatic.**
Both emit the `AnalysisResult` embedded in `Suggestion.analysis` / analyzed-repo entries. Adding the type field is sufficient; no key plumbing in `src/cli/modes.ts` or `src/session/`. The archived-repo synthetic result in `modes.ts` (which hardcodes `killerFeature: "(archived repository)"`) must also set `description` (e.g. `""` or a short archived note) to satisfy the required field — the one explicit edit outside the analyzer.

## Risks / Trade-offs

- **One-time full re-analysis cost on upgrade** (every v1 cache is dropped) → acceptable, called out as BREAKING in the proposal; pre-1.0, cache not frozen; cost is one AI pass per starred repo, already the cold-start cost.
- **Model ignores the "no marketing" instruction** → not enforceable at parse time; mitigated by prompt examples (positive + negative) and covered by the smoke-test acceptance criterion (≥95% non-empty descriptions), not by hard validation.
- **Archived-repo synthetic result forgotten** → would fail the `NOT NULL` insert / required-type at runtime; tasks.md calls out the `modes.ts` edit explicitly and a fixture covers it.
- **Ollama JSON adherence** weaker than OpenAI → lenient parser already absorbs a missing key as `""`; no new failure mode.

## Migration Plan

1. Land type + schema + parser changes together (one commit) so the build never sees a half-applied shape.
2. Bump `SCHEMA_VERSION` to `2` in the same commit as the migration logic — never bump without the drop path, or v1 dbs serve descriptionless rows.
3. Rollback: revert the branch; a v2 db opened by reverted (v1-expecting) code reads `user_version = 2` which is `> SCHEMA_VERSION(1)` — the old code has no downgrade path and would keep the v2 table, but its `SELECT` omits `description`, so it behaves as before. No data-loss on rollback; worst case is a stale-version field, harmless.

## Open Questions

- Archived-repo synthetic `description`: empty string vs. a short `"Archived repository."` note. Leaning empty string for consistency with the descriptionless-fallback contract; will confirm during apply.
