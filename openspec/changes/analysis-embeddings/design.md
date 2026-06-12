## Context

The analysis pipeline writes per-repo results (`category`, `killerFeature`, `description`, `entities`) to a bun:sqlite cache (`src/cache/analysisCache.ts`) and can export them as a corpus. Issue #43 shipped a deterministic eval harness (`src/evals/`) with a golden queryset and a `baseline-keyword` retriever implementing a `Retriever` seam — built deliberately before the embeddings retriever it measures. Issue #42 added the retrieval-friendly `description` field. Both blockers are closed, so this change adds the embeddings + retrieval substrate that `--ask` (#21) and the MCP server (#7) will consume.

Constraints from the project: AI access goes through the `AIProvider` seam only (no vendor SDKs in retrieval/orchestration); validation with zod at external boundaries; headless and TUI share one engine; Ollama reports no token counts; cache format is not frozen pre-1.0 so a schema bump is acceptable if called out.

## Goals / Non-Goals

**Goals:**
- A provider-agnostic `embed()` seam producing per-backend vectors with a stable `embedderId`.
- Persistent per-repo vectors in the cache, with stale-detection on model change and near-zero-cost reruns.
- An in-process cosine retriever implementing the existing `Retriever` interface, scored unchanged by `bun run evals`, beating the keyword baseline at precision@5 ≥ 0.6.

**Non-Goals:**
- `--ask` answer surface (#21) and MCP server (#7) — consumers, separate changes.
- ANN indexes / SQLite-VSS / external vector stores — deferred until corpus size justifies.
- Multi-angle facet embeddings (#11).
- Re-embedding strategy beyond "model changed" (e.g. content-hash invalidation) — `embedder_id` identity is enough for v0.2.0; README/description edits already invalidate the parent `entries` row via the existing `cacheKey`.

## Decisions

**Embed on the existing `AIProvider` interface (not a parallel `Embedder` abstraction).** The issue calls for extending the seam, and orchestration already holds a provider. Adds `embed(texts, signal?, parent?)` + `embedderId`. Alternative — a standalone embedder seam — was rejected: it would duplicate backend selection (`--backend`, env vars) that the provider already owns.

**Batch text→vector, vectors returned in input order.** Mirrors how analysis iterates repos. OpenAI's embeddings endpoint is natively batch; Ollama's `nomic-embed-text` is per-text, so the Ollama impl loops internally but presents the same batch signature. Empty input short-circuits with no network call.

**`embedder_id` string as the staleness key, not a content hash.** Format `"<backend>:<model>"` (e.g. `openai:text-embedding-3-small`). A row whose `embedder_id` ≠ the active provider's `embedderId` is stale → re-embed. Content changes are already caught upstream: the `entries` row keys on `cacheKey(repoId, readme)`, so a changed README/analysis rewrites the entry, and we re-embed whenever we (re)write an entry. So `embedder_id` only needs to guard the model-swap case. Alternative — store a hash of the embedded text — adds a column and comparison for a case the entry cache already covers.

**Vector stored as a BLOB of float32 little-endian.** 1536 × 4 B = 6 KB/repo OpenAI, 768 × 4 B = 3 KB Ollama. 300 repos ≈ 2 MB. Decode to `Float32Array` on read. Alternative — JSON array of floats — roughly 5× larger and slower to parse; rejected.

**Brute-force cosine in-process, vectors normalized at write time.** Storing unit-normalized vectors turns cosine into a dot product at query time — one pass, no per-query normalization of the corpus. 300 × 1536 dot products is well under the 100ms budget. ANN (hnsw / SQLite-VSS) is explicitly deferred; revisit when corpus > a few thousand.

**Retriever loads all vectors once, reads query vector per call.** `createEmbeddingsRetriever(corpus, cache, provider)` preloads the corpus vectors into memory; `search()` embeds the query (one network call), dot-products against the preloaded matrix, sorts best-first with a deterministic repo-key tie-break (matching the baseline's tie-break for fair comparison).

**Embedding text = the baseline's bagged fields.** name + topics + category + killerFeature + description, joined. Keeps the embeddings vs keyword comparison apples-to-apples; the eval delta then reflects representation (dense vs sparse), not which fields each retriever saw.

## Risks / Trade-offs

- **Evals depend on a live embedding backend → flaky/cost in CI.** → The unit tests mock the provider's `embed()` (deterministic stub vectors) at the provider seam, same as `analyze()`. The real-backend `bun run evals` gate is run locally/manually for the precision number, not in the always-on CI lane.
- **Embeddings retriever might not beat baseline at precision@5 ≥ 0.6.** → The harness produces a number either way; if it underperforms, that's a finding, not a silent pass. Rerank pass + embedding-text tuning are the levers. The proposal's threshold is the graduation bar, surfaced in the scorecard.
- **Dimension mismatch across backends in one cache** (switch OpenAI↔Ollama). → `embedder_id` mismatch marks every row stale on switch; reads guard on vector length matching the active dimension and treat a mismatch as a miss.
- **Schema bump rebuilds existing caches → users re-embed once.** → Acceptable pre-1.0; called out as BREAKING in the proposal. First post-upgrade run re-embeds; cost bounded (< $2 / 300 stars OpenAI, free Ollama).
- **Ollama per-text loop is slower for large sets.** → Indexing is a cache-once cost; reruns hit the cache. Acceptable; no batching API to exploit.

## Migration Plan

1. Land the `embed()` seam + `embedderId` on both providers (additive — no caller breaks).
2. Add the `embeddings` table and bump `SCHEMA_VERSION`; existing caches rebuild via the current version policy.
3. Wire embedding population into the shared analysis engine so TUI and `--analyze-only` both write vectors after each repo's entry is written.
4. Add `src/retrieval/` and wire an embeddings-retriever option into `src/evals/run.ts`.
5. Rollback: revert the table + seam; an older binary opening a newer cache rebuilds it (version policy), so no data-corruption path.

## Resolved during apply

- **Gate metric.** `precision@5 ≥ 0.6` was unreachable: 30/41 golden queries have a single expected repo, capping mean precision@5 at ≈ 0.268, and the keyword baseline already sits at 0.2634. Moved the gate to recall@5 ≥ baseline and MRR ≥ baseline (the metrics that actually move on this queryset). Spec updated accordingly.
- **Rerank shape.** Cosine-only with Ollama `nomic-embed-text` tied the baseline on precision but trailed it on recall (0.976 vs 0.992) and MRR (0.917 vs 0.925). Added a reciprocal-rank-fusion (RRF, C=60) rerank combining the dense cosine ranking with the keyword baseline's lexical ranking. Fused result beats the baseline on every metric (recall@5 1.000, MRR 0.9329, precision@5 0.2683 = the ceiling). RRF chosen over a weighted linear blend because it is parameter-light and scale-free across the two heterogeneous score distributions.
- **Recorded scorecard.** `evals/embeddings.json` is a recorded result (embedder-dependent), not a CI regression gate — only the deterministic keyword `baseline.json` is `--check`-gated. The committed number was produced with `nomic-embed-text`; OpenAI `text-embedding-3-small` was unavailable (no key) and would likely score at least as well.

## Open Questions

- Whether to expose a `--reembed` flag to force re-embedding without nuking the whole cache. Defer to #21 unless trivial.
