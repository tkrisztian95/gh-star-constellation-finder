# ask-retrieval Specification

## Purpose
The cache-backed retriever for `--ask`: read persisted vectors + owner/name/doc from the `embeddings` table, embed only the query, cosine + RRF keyword fusion over cached docs, return top-k repos with URL/doc/score. Created by archiving change headless-ask.

## Requirements
### Requirement: Cache-backed retrieval embeds only the query

The cache-backed retriever SHALL read persisted repo vectors and their `owner`, `name`, and `doc` from the `embeddings` table and, for each question, embed ONLY the query — one embedding call. It MUST NOT re-embed the corpus at query time. Vectors whose `embedder_id` does not match the active provider's `embedderId` are excluded as stale.

#### Scenario: One embed call per question
- **WHEN** a question is answered against a populated cache
- **THEN** exactly one embedding request is made (the query), and no repo is re-embedded

#### Scenario: Stale vectors excluded
- **WHEN** the cache holds vectors under an `embedder_id` other than the active one
- **THEN** those rows are not considered for retrieval

### Requirement: Cosine ranking with keyword fusion over cached docs

The retriever SHALL rank repos by cosine similarity between the query vector and the cached repo vectors, and fuse that ranking with a keyword ranking computed over the cached `doc` text using reciprocal rank fusion, mirroring the slice-A embeddings retriever. Ties SHALL break deterministically by repo key. It returns up to `k` repos, each with its `github.com/<owner>/<name>` URL, `doc`, and fused score, best-first.

#### Scenario: Returns ranked repos with citation data
- **WHEN** the retriever answers a query with `k = 8`
- **THEN** it returns at most 8 repos best-first, each carrying its URL, doc, and score

#### Scenario: Deterministic tie-break
- **WHEN** two repos receive equal fused scores
- **THEN** their order is broken by repo key so repeated runs are stable

### Requirement: Empty or unpopulated cache yields no results

When the `embeddings` table has no rows for the active `embedder_id`, the retriever SHALL return an empty result rather than throwing, so the caller can surface a "run analysis first" message.

#### Scenario: No vectors available
- **WHEN** retrieval runs against a cache with no embeddings for the active embedder
- **THEN** it returns an empty list without error
