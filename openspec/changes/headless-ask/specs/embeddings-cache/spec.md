## MODIFIED Requirements

### Requirement: Analysis cache persists per-repo embedding vectors

The analysis cache SHALL include an `embeddings` table keyed by `repo_id` (PRIMARY KEY) with columns `vector` (BLOB), `embedder_id` (TEXT), `updated_at` (INTEGER), and the retrieval-store columns `owner` (TEXT), `name` (TEXT), and `doc` (TEXT). The table sits alongside the existing `entries` row and is joined on `repo_id`. The cache MUST expose read and write helpers for a repo's vector together with its `owner`, `name`, and `doc`, so orchestration can populate them and a cache-backed retriever can rank, cite (`github.com/<owner>/<name>`), and ground answers from the `embeddings` table alone — without a GitHub fetch or a join against the `entries` row.

#### Scenario: Write then read a vector with repo metadata
- **WHEN** a vector is written for `repo_id` X with `embedder_id` E, `owner` O, `name` N, and `doc` D
- **THEN** reading the embedding for X returns the same vector, `embedder_id` E, `owner` O, `name` N, and `doc` D

#### Scenario: Missing embedding
- **WHEN** no embedding row exists for `repo_id` X
- **THEN** the read helper returns null rather than throwing

#### Scenario: Bulk read for retrieval
- **WHEN** all embeddings for the active `embedder_id` are read for retrieval
- **THEN** each returned record carries the vector, `owner`, `name`, and `doc` needed to rank and cite without any further lookup
