# embeddings-cache Specification

## Purpose
The `embeddings` table in the analysis cache: persist/read per-repo vectors keyed by `repo_id`, stale-detect on `embedder_id` mismatch, near-zero-cost hit on rerun. Created by archiving change analysis-embeddings.

## Requirements
### Requirement: Analysis cache persists per-repo embedding vectors

The analysis cache SHALL include an `embeddings` table keyed by `repo_id` (PRIMARY KEY) with columns `vector` (BLOB), `embedder_id` (TEXT), and `updated_at` (INTEGER). The table sits alongside the existing `entries` row and is joined on `repo_id`. The cache MUST expose read and write helpers for a repo's vector so orchestration can populate and retrieval can consume it.

#### Scenario: Write then read a vector
- **WHEN** a vector is written for `repo_id` X with `embedder_id` E
- **THEN** reading the embedding for X returns the same vector and `embedder_id` E

#### Scenario: Missing embedding
- **WHEN** no embedding row exists for `repo_id` X
- **THEN** the read helper returns null rather than throwing

### Requirement: Stale embeddings are detected by embedder identity

An embedding row whose stored `embedder_id` differs from the active provider's `embedderId` SHALL be treated as stale. The cache MUST surface this mismatch so orchestration re-embeds the repo; a row whose `embedder_id` matches is a cache hit and MUST NOT trigger a re-embed.

#### Scenario: Matching identity is a hit
- **WHEN** the stored `embedder_id` equals the active `embedderId`
- **THEN** the cached vector is reused with no embedding call

#### Scenario: Mismatched identity is stale
- **WHEN** the stored `embedder_id` differs from the active `embedderId`
- **THEN** the repo is reported as needing re-embedding

### Requirement: Embeddings table is versioned with the cache schema

Introducing the `embeddings` table SHALL bump the cache schema version. Opening a cache written under an older schema version MUST follow the existing cache-version migration behavior so a stale cache is rebuilt rather than read with a missing table.

#### Scenario: Old cache opened after upgrade
- **WHEN** a cache file written before this change is opened
- **THEN** the cache is migrated per the existing version policy and the `embeddings` table exists afterward

#### Scenario: Rerun is a near-zero-cost hit
- **WHEN** analysis is rerun over a repo set whose embeddings are already cached under the active `embedder_id`
- **THEN** no embedding network calls are made for those repos
