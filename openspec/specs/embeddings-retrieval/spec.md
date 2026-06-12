# embeddings-retrieval Specification

## Purpose
The `src/retrieval/` module: embed-query + brute-force cosine top-k + a keyword-fusion rerank, implementing the evals `Retriever` interface and matching-or-beating the keyword baseline on recall@5 and MRR. Created by archiving change analysis-embeddings.

## Requirements
### Requirement: Embeddings retriever implements the eval Retriever interface

A new `src/retrieval/` module SHALL export a retriever implementing the existing evals `Retriever` interface (`name` plus `search(query, k): Promise<string[]>`) without modifying that interface. It embeds the query via the provider, scores cached repo vectors by cosine similarity, and returns up to `k` repo URLs (`github.com/<owner>/<name>`) best-first. The same `bun run evals` harness MUST score it with no harness-interface changes.

#### Scenario: Returns best-first repo URLs
- **WHEN** `search("rust tui library", 5)` is called against a populated corpus
- **THEN** it returns at most 5 `github.com/<owner>/<name>` URLs ordered by descending cosine similarity

#### Scenario: Deterministic tie-break
- **WHEN** two repos have equal cosine similarity to the query
- **THEN** their relative order is broken deterministically by repo key so repeated runs are stable

### Requirement: Brute-force in-process cosine search

The retriever SHALL score the query against every cached repo vector with brute-force cosine similarity in-process, with no ANN index or external vector store. Retrieval over a 300-repo corpus MUST complete in under 100ms on a laptop after vectors are loaded.

#### Scenario: Top-k under latency budget
- **WHEN** `search` runs against a 300-repo corpus with vectors loaded
- **THEN** it returns the top-k within 100ms

### Requirement: Retrieval matches or beats the keyword baseline on the golden queryset

Scored by the eval harness against the committed golden queryset, the embeddings retriever SHALL achieve recall@5 and MRR each greater than or equal to the `baseline-keyword` retriever's, and MUST NOT regress either metric.

`precision@5` is NOT a gate metric: 30 of 41 golden queries have a single expected repo, so the mean precision@5 ceiling on this queryset is ≈ 0.268 and the keyword baseline already reaches it. The retrieval quality signal lives in recall@5 (did the relevant repos make the top-k) and MRR (how high), so the gate is expressed in those terms. (The earlier `precision@5 ≥ 0.6` bar was unreachable by construction and is dropped.)

To clear the bar on a weak embedder, the retriever MAY rerank by fusing the dense cosine ranking with the keyword baseline's lexical ranking; the fused result MUST still be deterministic.

#### Scenario: Evals gate passes
- **WHEN** `bun run evals --retriever embeddings` scores the embeddings retriever against the golden queryset
- **THEN** its recall@5 and MRR are each ≥ the committed baseline-keyword scorecard's, with neither metric regressed

### Requirement: Embedding text mirrors the baseline's searchable fields

The text embedded per repo SHALL be assembled from the same retrieval-relevant fields the keyword baseline bags (name, topics, category, killer feature, description) so the two retrievers are compared over equivalent content.

#### Scenario: Field parity with baseline
- **WHEN** a repo's embedding text is built
- **THEN** it draws from name, topics, category, killer feature, and description — the fields the baseline retriever tokenizes
