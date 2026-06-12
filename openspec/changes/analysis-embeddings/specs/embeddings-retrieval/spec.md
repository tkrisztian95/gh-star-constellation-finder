## ADDED Requirements

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

### Requirement: Retrieval beats the keyword baseline on the golden queryset

Scored by the eval harness against the committed golden queryset, the embeddings retriever SHALL achieve precision@5 ≥ 0.6 and MUST score strictly higher than the `baseline-keyword` retriever on precision@5.

#### Scenario: Evals gate passes
- **WHEN** `bun run evals` scores the embeddings retriever against the golden queryset
- **THEN** its precision@5 is ≥ 0.6 and exceeds the baseline-keyword precision@5

### Requirement: Embedding text mirrors the baseline's searchable fields

The text embedded per repo SHALL be assembled from the same retrieval-relevant fields the keyword baseline bags (name, topics, category, killer feature, description) so the two retrievers are compared over equivalent content.

#### Scenario: Field parity with baseline
- **WHEN** a repo's embedding text is built
- **THEN** it draws from name, topics, category, killer feature, and description — the fields the baseline retriever tokenizes
