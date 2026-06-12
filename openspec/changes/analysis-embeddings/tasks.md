## 1. Provider embed seam

- [ ] 1.1 Add `embed(texts: string[], signal?: AbortSignal, parent?: LangfuseParent | null): Promise<number[][]>` and `embedderId: string` to the `AIProvider` interface in `src/ai/types.ts`
- [ ] 1.2 Implement `embed()` + `embedderId` (`openai:text-embedding-3-small`, 1536-dim) on the OpenAI provider via the existing client; batch call, vectors in input order; empty input returns `[]` with no network call; abort rejects
- [ ] 1.3 Implement `embed()` + `embedderId` (`ollama:nomic-embed-text`, 768-dim) on the Ollama provider over its existing host; loop per-text internally, same batch signature
- [ ] 1.4 Unit tests at the provider seam: mock the client, assert order preservation, empty-input short-circuit, abort rejection, and distinct `embedderId` per backend

## 2. Embeddings cache table

- [ ] 2.1 Add the `embeddings` table (`repo_id` PK, `vector` BLOB, `embedder_id` TEXT, `updated_at` INTEGER) to `src/cache/analysisCache.ts` and bump `SCHEMA_VERSION`
- [ ] 2.2 Add write helper: store a vector as float32 LE BLOB (normalized to unit length at write) with `embedder_id` + `updated_at`
- [ ] 2.3 Add read helper: decode BLOB to `Float32Array`, return null on miss, treat `embedder_id` mismatch or wrong vector length as a miss/stale
- [ ] 2.4 Add a "needs (re)embed" predicate comparing stored `embedder_id` to the active `embedderId`
- [ ] 2.5 Unit tests: write→read round-trip, missing row returns null, identity match is a hit, mismatch is stale, old-schema cache rebuilds and gains the table

## 3. Populate embeddings in the shared engine

- [ ] 3.1 After an `entries` row is written during analysis, build the embedding text (name + topics + category + killerFeature + description) and, if the repo needs (re)embedding, call `provider.embed()` and persist the vector
- [ ] 3.2 Batch the embed calls where the engine already batches repos; skip cache hits so reruns make zero embedding calls
- [ ] 3.3 Verify headless parity: `--analyze-only` and interactive TUI both populate the table via the shared engine path (no duplicate logic)
- [ ] 3.4 Add a `logger.info`/`debug` line at the embed phase boundary (debug for per-repo); omit token counts for the Ollama backend

## 4. Retrieval module

- [ ] 4.1 Create `src/retrieval/` with `createEmbeddingsRetriever(corpus, cache, provider)` implementing the evals `Retriever` interface (`name`, `search(query, k)`)
- [ ] 4.2 Preload corpus vectors into an in-memory matrix once; `search()` embeds the query, dot-products against the normalized matrix, sorts best-first with a deterministic repo-key tie-break matching the baseline
- [ ] 4.3 Return up to `k` `github.com/<owner>/<name>` URLs; guard against vectors whose dimension ≠ the active embedder
- [ ] 4.4 Unit tests with a mocked provider (deterministic stub vectors): ordering, k-truncation, tie-break determinism, dimension-mismatch skip

## 5. Evals wiring + gate

- [ ] 5.1 Add an embeddings-retriever option to `src/evals/run.ts` so `bun run evals` can score it against the committed golden queryset (no `Retriever` interface change)
- [ ] 5.2 Run `bun run evals` against a real backend locally; record precision@5 and confirm it is ≥ 0.6 and strictly beats `baseline-keyword`
- [ ] 5.3 If under 0.6: tune embedding text / add a light rerank pass, re-score, document the chosen approach in design Open Questions
- [ ] 5.4 Commit the embeddings scorecard alongside the baseline scorecard for comparison

## 6. Quality gates

- [ ] 6.1 `bun run typecheck` clean
- [ ] 6.2 `bun run lint` + `bun run format:check` clean
- [ ] 6.3 `bun run test` green (new provider/cache/retrieval tests included)
- [ ] 6.4 Sanity-check cost: a fresh 300-star OpenAI index stays under $2; confirm rerun is a near-zero-cost cache hit
