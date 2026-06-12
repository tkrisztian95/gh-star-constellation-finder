## 1. Cache as a self-contained retrieval store

- [x] 1.1 Add `owner TEXT`, `name TEXT`, `doc TEXT` to the `embeddings` table CREATE in `src/cache/analysisCache.ts` and bump `SCHEMA_VERSION` 4→5
- [x] 1.2 Update `saveEmbedding` to accept and persist `owner`, `name`, `doc`; update the `CachedEmbedding` type + `allEmbeddings`/`getEmbedding` to return them
- [x] 1.3 Update slice-A callers (`populateEmbeddings`) and tests for the new `saveEmbedding` signature; `populateEmbeddings` passes `repo.owner`, `repo.name`, and the already-built embed text as `doc`
- [x] 1.4 Unit tests: write→read round-trip carries owner/name/doc; `allEmbeddings` returns them; old-schema (v4) cache rebuilds to v5 and gains the columns

## 2. Shared retrieval helpers (de-dup with slice A)

- [ ] 2.1 Extract `normalize` + `dot` into `src/retrieval/vectorMath.ts`; extract `tokenize` into `src/retrieval/tokenize.ts` (from the eval baseline retriever)
- [ ] 2.2 Refactor `src/retrieval/embeddingsRetriever.ts` and the eval baseline to use the shared helpers — behavior-preserving
- [ ] 2.3 Confirm `bun run evals --check` still reproduces the keyword baseline (proves the refactor changed nothing)

## 3. Cache-backed retriever

- [ ] 3.1 Add `createCacheRetriever(cache, provider)` in `src/retrieval/`: read `allEmbeddings(provider.embedderId)`, embed only the query (one call), cosine-rank, fuse with a keyword ranking over cached `doc` via RRF (C=60), deterministic repo-key tie-break
- [ ] 3.2 Return top-k records `{ url, doc, score }` best-first; empty cache → empty result (no throw)
- [ ] 3.3 Unit tests with a mocked provider + seeded cache: one query embed (no corpus re-embed), ranking, k-truncation, tie-break, stale-embedder exclusion, empty-cache empty result

## 4. RAG answer

- [ ] 4.1 Add `buildAskPrompt(question, retrieved)` in `src/ai/prompts.ts`: numbered context block from docs, instruct "answer ONLY from these starred repos, cite github.com/<owner>/<name>, return JSON `{answer, citations}`"
- [ ] 4.2 Add an answer module (`src/orchestration/ask.ts`) that calls `provider.complete()`, zod-parses `{answer, citations}`, intersects citations with the retrieved URL set, and falls back to `{answer: raw, citations: []}` on parse failure
- [ ] 4.3 Unit tests: citations intersected with retrieved (hallucinated URL dropped); no-relevant-repos → empty citations; malformed model output → graceful fallback

## 5. --ask CLI surface

- [ ] 5.1 Add `--ask "<question>"` parsing + help text to `src/cli/args.ts` (new `askQuestion?: string` on `CliArgs`)
- [ ] 5.2 Route `--ask` in `src/orchestration/main.tsx` before `authenticate()` (offline, cache-only, like `--serve`): load cache, build retriever + answer, emit JSON, exit
- [ ] 5.3 Emit `{ question, answer, citations, retrieved: [{url, score}] }` to stdout; unpopulated cache (no vectors for active embedder) → message to run analysis first + non-zero exit, no answer call
- [ ] 5.4 Trace query-embed + completion via the existing Langfuse wrapper; capture an `ask` PostHog event consistent with `src/analytics.ts` (omit token counts for Ollama)

## 6. Quality gates + manual verification

- [ ] 6.1 `bun run typecheck` clean
- [ ] 6.2 `bun run lint` + `format:check` clean on touched files
- [ ] 6.3 `bun run test` green (new cache/retriever/answer/cli tests included)
- [ ] 6.4 Manual: populate a small cache (`--analyze-only --limit 15`), then `--ask "which of my stars are rust CLI tools"` returns a grounded answer citing real URLs in <2s after cache load, on both OpenAI and Ollama backends
