Tracks #44

## Why

The analysis pass already produces a rich, structured view of every starred repo (category, killer feature, description, entities), but it is one-shot: analyze → suggest → exit. To let users (and AI tools) ask natural-language questions over their stars — `--ask` (#21) and the MCP server (#7) — that corpus needs a retrieval layer. The eval harness (#43, done) and the retrieval-friendly `description` field (#42, done) are both in place; this change lays the embeddings + retrieval substrate they measure and feed. No user-facing surface yet — this is the load-bearing slice the answer surfaces sit on top of.

## What Changes

- Extend the `AIProvider` seam (`src/ai/types.ts`) with an `embed(texts: string[], signal?, parent?)` method returning one vector per input. OpenAI implements it with `text-embedding-3-small` (1536-dim); Ollama with `nomic-embed-text` (768-dim). Both stay behind the provider abstraction — no SDK calls leak into retrieval or orchestration.
- New `embeddings` table in the analysis cache (`src/cache/analysisCache.ts`): `repo_id` PK, `vector` BLOB, `embedder_id` TEXT, `updated_at` INTEGER. Joined on `repo_id` alongside the existing `entries` row. A row whose `embedder_id` differs from the active embedder is treated as stale and re-embedded; a matching row is a near-zero-cost cache hit. **BREAKING**: cache schema version bump (pre-1.0, format not frozen — acceptable per project policy).
- New `src/retrieval/` module wrapping: embed-query, brute-force cosine-similarity top-k over the cached vectors (in-process, no ANN index), and an opinionated rerank pass over the analyzer output. It implements the existing evals `Retriever` interface unchanged, so the #43 harness scores it with no harness edits.
- The embedding text per repo is assembled from the retrieval-friendly fields (name, topics, category, killer feature, description) — the same fields the baseline keyword retriever bags — so the two retrievers are compared apples-to-apples.

### Out of scope

- `--ask` headless answer surface (#21) and the MCP server (#7) — they consume this layer but are separate changes.
- ANN indexes / SQLite-VSS / dedicated vector stores — deferred until corpus size justifies it (300 stars × 1536 floats ≈ 2 MB fits in-process).
- Multi-angle facet embeddings (#11, v0.3.0).

### Breaking changes

- Analysis cache schema version bumps for the new `embeddings` table. Existing caches re-migrate (drop/recreate per the current cache versioning behavior); first run after upgrade re-embeds. No session-JSON format change.

## Capabilities

### New Capabilities
- `provider-embeddings`: the `embed()` method on the `AIProvider` seam — batch text→vector with per-backend model/dimension selection and an `embedder_id` identity for cache-staleness detection.
- `embeddings-cache`: the `embeddings` table in the analysis cache — persist/read per-repo vectors keyed by `repo_id`, stale-detect on `embedder_id` mismatch, near-zero-cost hit on rerun.
- `embeddings-retrieval`: the `src/retrieval/` module — embed-query + brute-force cosine top-k + a keyword-fusion rerank, implementing the evals `Retriever` interface and matching-or-beating the keyword baseline on recall@5 and MRR. (The originally proposed `precision@5 ≥ 0.6` bar proved unreachable — the golden queryset's expected-count distribution caps mean precision@5 at ≈ 0.268 — so the gate moved to recall@5/MRR; see the `embeddings-retrieval` spec.)

### Modified Capabilities
<!-- No existing spec's REQUIREMENTS change — the AIProvider extension is additive and the cache gains a new table without altering the `entries` contract. -->

## Impact

- **Code**: `src/ai/types.ts` (interface + OpenAI/Ollama impls), `src/cache/analysisCache.ts` (new table + schema bump), new `src/retrieval/` module, analysis orchestration (`src/orchestration/`) to populate embeddings after analysis, new tests under `src/__tests__/`.
- **Eval harness**: `src/evals/` gains an embeddings-retriever wiring so `bun run evals` can score it against the committed queryset; no `Retriever` interface change.
- **Dependencies**: none new — OpenAI embeddings via the existing client; Ollama via its existing HTTP host.
- **Cost/perf**: fresh 300-star OpenAI index < $2; top-k retrieval < 100ms on a 300-repo corpus on a laptop.
- **Headless parity**: embedding population runs in the shared engine so `--analyze-only` and interactive TUI both populate the table identically.
