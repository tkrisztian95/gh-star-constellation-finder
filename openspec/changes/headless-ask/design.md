## Context

Slice A (#44, merged) added the `AIProvider.embed()` seam, an `embeddings` table in the analysis cache (vector keyed by GitHub node id), the `populateEmbeddings` engine pass, and a corpus-backed embeddings retriever scored by the eval harness. This slice adds the first user-facing consumer: a headless `--ask "<question>"` that retrieves the most relevant stars from the cache and has the AI answer grounded in them.

Two constraints shaped the design. First, the cache is **not yet self-contained for retrieval**: the `embeddings` table stores only `repo_id` (node id) + vector, and the `entries` table is keyed by `nodeId:hash` and stores no `owner`/`name`. So nothing in the cache today can produce a `github.com/<owner>/<name>` citation. Second, the user chose **cache-backed** retrieval (reuse persisted vectors, embed only the query) over re-embedding a corpus each invocation. Both point to the same fix: store the citation/context data alongside the vector.

Project constraints carried in: AI access only through the `AIProvider` seam; zod at external boundaries; headless emits JSON to stdout like `--analyze-only`; logger (not console) for operational logs; Langfuse/PostHog opt-in and no-op without env; cache format not frozen pre-1.0.

## Goals / Non-Goals

**Goals:**
- `--ask "<q>"` answers from the cache alone — no GitHub fetch, no auth — embedding only the query.
- The `embeddings` table becomes a self-contained retrieval store (vector + owner + name + doc).
- Grounded answer that cites real repo URLs or declines; deterministic, backend-agnostic retrieval.

**Non-Goals:**
- Interactive TUI chat REPL / multi-turn history (#21 phase 1).
- MCP `search_stars` / `ask_stars` (#7).
- Multi-angle facet retrieval (#11); query-embedding caching (one embed/ask is cheap enough).

## Decisions

**`--ask` dispatches before authentication — it is offline like `--serve`.** It only needs the cache + the AI backend, never GitHub. Routed in `main.tsx` right after analytics init, before `authenticate()`, so it runs with no token. Keeps the "needs no GitHub fetch" property real and makes `--ask` usable as an AI-tool harness without credentials. Alternative — run it through the normal auth+fetch path — was rejected: it would couple a read-only query to network + auth for no benefit.

**Extend the `embeddings` table with `owner`, `name`, `doc` (MODIFIED embeddings-cache, schema 4→5).** `doc` is exactly the embedding text `populateEmbeddings` already builds (name/topics/category/killer-feature/description). Storing it means `--ask` ranks, cites, and grounds answers from one table with no `entries` join and no node-id→owner/name remap. Alternative — a separate `repo_meta` table or a live stars fetch to map node id → owner/name — adds a join or a network dependency for data we already hold at embed time.

**Schema migration stays drop-and-recreate.** The existing `applySchema` drops `entries` + `embeddings` on any version bump; 4→5 follows suit (re-analyze + re-embed once). An `ALTER TABLE ADD COLUMN` path would avoid re-analysis but mix two migration strategies in one function; pre-1.0 the one-time rebuild is acceptable and already flagged BREAKING.

**Cache-backed retriever mirrors the slice-A retriever, minus the corpus embed.** `createCacheRetriever(cache, provider)` reads `allEmbeddings(embedderId)` (now carrying owner/name/doc), embeds only the query, computes cosine over the in-memory matrix, and fuses with a keyword ranking over the cached `doc` strings via RRF (C=60) — the same fusion that won slice A on MRR. To avoid duplicating math, extract `normalize` / `dot` and the `tokenize` helper into small shared modules (`src/retrieval/vectorMath.ts`, `src/retrieval/tokenize.ts`) used by both the slice-A retriever and this one. The keyword side scores query-token overlap against each repo's `doc`.

**RAG answer asks for structured JSON and validates citations.** `buildAskPrompt(question, retrieved)` builds a numbered context block from the top-k docs and instructs the model to answer using ONLY those repos and return `{ answer, citations: [url] }`. The result is zod-parsed; **citations are intersected with the retrieved URL set** so a hallucinated URL can never appear. If the model returns no relevant repos, `citations` is empty and the answer says so. Uses the existing `provider.complete()` seam (already json-mode for OpenAI; Ollama's known empty-content quirk falls back to `{ answer: <raw text>, citations: [] }`).

**k = 8 retrieved for context.** Enough to cover multi-repo answers ("which of my stars are X") without bloating the prompt. Not user-configurable in this slice.

**Output contract mirrors `--analyze-only`.** One JSON object to stdout: `{ question, answer, citations: string[], retrieved: { url, score }[] }`. Business logic (retriever, answer-builder) lives in `src/retrieval/` + `src/orchestration/`; `src/cli` only wires and serializes.

## Risks / Trade-offs

- **Model hallucinates citation URLs** → citations are intersected with the retrieved set; anything outside it is dropped before output.
- **Ollama returns empty / non-JSON content** (the gemma quirk handled in `complete()`) → zod parse failure falls back to `{ answer: raw, citations: [] }` rather than crashing.
- **Cache populated by a different embedder than the active backend** (analyzed with Ollama, ask with OpenAI) → `embedder_id` mismatch makes `allEmbeddings(activeId)` empty → `--ask` emits the "run analysis first with this backend" message. Message names the active embedder so the cause is obvious.
- **Schema 4→5 rebuild re-analyzes** (drops `entries` too) → one-time cost after upgrade; acceptable pre-1.0, flagged BREAKING. Re-embedding is bounded (<$0.01 / 300 repos OpenAI).
- **Empty cache** → retriever returns empty, handler prints guidance and exits non-zero; never calls the answer step.

## Migration Plan

1. Bump `SCHEMA_VERSION` 4→5; add `owner`/`name`/`doc` to the `embeddings` CREATE; existing caches rebuild via the current version policy.
2. `populateEmbeddings` writes owner/name/doc with each vector; `allEmbeddings` returns them.
3. Add shared `vectorMath` + `tokenize`; refactor the slice-A retriever to use them (behavior-preserving — eval `--check` must still reproduce).
4. Add cache retriever + ask answer module + prompt; wire `--ask` in `args.ts` / `main.tsx`.
5. Rollback: revert the columns + flag; an older binary opening a v5 cache rebuilds it (version policy), so no corruption path.

## Open Questions

- Whether `--ask` should accept `--k`/`--json` toggles or a plain-text output mode. Defer until the TUI chat slice, which will share the retriever + answer modules.
- Whether to persist the query embedding for repeated asks in one process. Not worth it for one-shot headless; revisit for the REPL.
