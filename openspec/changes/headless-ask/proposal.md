Tracks #21

## Why

The analysis pass produces a rich per-repo view (category, killer feature, description, entities) and #44 added the embeddings + retrieval substrate over it. Today that corpus is only used to suggest list changes — it is never queried. Users want to ask natural-language questions over their stars ("which of my stars are Rust CLI tools?", "any archived repos in my AI list?"). This adds the first answer surface: a headless `--ask "<question>"` flag that retrieves the most relevant repos from the cache and has the AI answer the question grounded in them, with citations back to repo URLs. It is phase A of #21 (headless / AI-tool consumable); the interactive TUI chat REPL and MCP server are separate, later slices.

## What Changes

- **Cache becomes a self-contained retrieval store.** Extend the `embeddings` table with `owner`, `name`, and `doc` columns, populated in `populateEmbeddings` (`doc` is the embedding text already built from name/topics/category/killer-feature/description). This lets `--ask` rank, cite, and ground answers from the cache alone — no GitHub fetch, no join against the `entries` row (whose key is `nodeId:hash`, not owner/name). **BREAKING**: cache schema bump 4→5; existing caches rebuild and re-embed on next run (pre-1.0, format not frozen).
- **Cache-backed retriever.** A new retriever in `src/retrieval/` reads persisted vectors + owner/name + doc from the `embeddings` table, embeds **only the query** (one embed call — no corpus re-embedding), cosine-ranks, and fuses with a keyword pass over the cached `doc` text via RRF (mirroring the slice-A retriever). Returns top-k repos with URL, doc, and score.
- **RAG answer.** Build a context block from the top-k docs and call the provider's `complete()` with a prompt instructing it to answer **only** from these starred repos, cite `github.com/<owner>/<name>` URLs, and say so when none are relevant.
- **`--ask` CLI surface.** New `--ask "<question>"` flag with a headless handler that emits JSON `{ question, answer, citations: [url], retrieved: [{ url, score }] }` to stdout, mirroring `--analyze-only`. An empty / unpopulated cache yields a clear "run analysis first" message and a non-zero exit.

### Out of scope

- Interactive TUI chat REPL with multi-turn Q&A (issue #21 phase 1) — later.
- MCP server exposing `search_stars` / `ask_stars` (#7).
- Multi-turn conversation / history, and multi-angle facet retrieval (#11).
- Re-embedding strategy changes beyond what #44 already does.

### Breaking changes

- Embeddings cache schema bumps 4→5 for the new columns. Existing caches rebuild via the current version policy; the first run after upgrade re-embeds. No session-JSON change.

## Capabilities

### New Capabilities
- `ask-retrieval`: the cache-backed retriever — read persisted vectors + owner/name + doc from the `embeddings` table, embed only the query, cosine + RRF keyword fusion over cached docs, return top-k repos with URL/doc/score.
- `ask-rag-answer`: grounded answer generation — assemble a context block from retrieved docs and produce an answer that cites repo URLs or declines when nothing is relevant.
- `ask-headless-cli`: the `--ask "<question>"` flag and its headless JSON output contract, including the unpopulated-cache error path.

### Modified Capabilities
- `embeddings-cache`: the `embeddings` table gains `owner`, `name`, and `doc` columns and a read helper that returns them, so the cache is a self-contained retrieval store; schema version bumps 4→5.

## Impact

- **Code**: `src/cache/analysisCache.ts` (columns + schema bump + read helper), `src/orchestration/analysis.ts` (`populateEmbeddings` writes owner/name/doc), new `src/retrieval/` cache-backed retriever + RAG answer module, `src/cli/args.ts` (flag parsing + help), `src/cli/modes.ts` (headless `--ask` handler), `src/ai/prompts.ts` (ask prompt), new tests under `src/__tests__/`.
- **Dependencies**: none new — retrieval reuses the slice-A pieces; answer uses the existing `AIProvider.complete()` seam.
- **Perf/cost**: one query embedding + one completion per `--ask`; no corpus re-embed. Answer returns in < 2s after cache load on a laptop-sized corpus.
- **Headless parity**: `--ask` is headless-only in this slice; it shares the cache + retriever modules that the future TUI chat and MCP tool will reuse.
- **Observability**: trace the query-embed + answer completion through the existing Langfuse wrapper; capture an `ask` PostHog event consistent with `src/analytics.ts`.
