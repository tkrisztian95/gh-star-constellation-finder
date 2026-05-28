# eval-harness Specification

## Purpose
TBD - created by archiving change eval-harness. Update Purpose after archive.
## Requirements
### Requirement: Frozen public-repo corpus fixture
The system SHALL provide a committed JSON corpus fixture of curated, well-known **public** repositories that the eval harness searches over. Each corpus entry SHALL carry repo identity (`owner`, `name`, `topics`), the per-repo analysis shape the tool produces (`category`, `killerFeature`, `description`), and an `isArchived` boolean captured at build time (so health-check queries can be scored). The corpus SHALL be generated once via a build-time corpus-builder that fetches each repo's public metadata + README and runs the real analyzer, then committed verbatim; the harness SHALL NOT fetch from GitHub or call an AI backend at eval time. The corpus loader SHALL validate the fixture with `zod` at load and fail with a clear error if the shape is invalid.

#### Scenario: Corpus loaded without network or AI
- **WHEN** `bun run evals` runs with no `GITHUB_TOKEN`, no AI backend configured, and no network access
- **THEN** the harness SHALL load the committed corpus fixture from disk and proceed, making zero GitHub or AI API calls

#### Scenario: Corpus entry exposes identity and analysis
- **WHEN** a corpus entry is loaded
- **THEN** it SHALL contain `owner`, `name`, `topics`, `category`, `killerFeature`, `description`, and `isArchived`, and its repo URL SHALL be derivable as `github.com/<owner>/<name>`

#### Scenario: Malformed corpus fails fast
- **WHEN** the corpus fixture is missing a required field or has the wrong type
- **THEN** the harness SHALL exit with a non-zero status and a message naming the offending entry, rather than scoring against partial data

### Requirement: Golden queryset fixture
The system SHALL provide a committed JSON queryset fixture of hand-authored questions. Each query SHALL declare the question text and one or more ground-truth answers expressed as repo URLs (`github.com/<owner>/<name>`). Every ground-truth URL SHALL resolve to a repository present in the frozen corpus. The queryset SHALL cover a range of query styles — at minimum exact-recall, categorical-lookup, health-check, property-based, and logical (AND/OR/negation) — and a range of query lengths from one- or two-word terms to long natural-language sentences. The queryset loader SHALL validate the fixture with `zod`.

#### Scenario: Every ground-truth answer exists in the corpus
- **WHEN** the harness loads the queryset and corpus
- **THEN** for every ground-truth URL across all queries, a matching corpus entry SHALL exist; if any ground-truth URL has no corpus match, the harness SHALL exit non-zero and name the dangling query

#### Scenario: A query may have multiple correct answers
- **WHEN** a query declares more than one ground-truth URL (e.g. "rust JSON parsers")
- **THEN** the harness SHALL treat each listed URL as relevant when computing recall and precision

#### Scenario: Adding a query requires no code change
- **WHEN** a contributor adds or removes one entry in the queryset fixture (referencing a repo already in the corpus)
- **THEN** `bun run evals` SHALL pick up the change with no edits to harness code or plumbing

### Requirement: Deterministic baseline retriever
The system SHALL provide a deterministic baseline retriever that, given a query string, ranks corpus entries by keyword/lexical overlap across the entry's `name`, `topics`, `category`, `killerFeature`, and `description` fields, and returns the top-`k` repo URLs. The retriever SHALL make no AI calls and no network calls, and SHALL produce identical rankings for identical (query, corpus) inputs across runs. The retriever SHALL be exposed behind a small interface so an alternate retriever (e.g. the future embeddings retriever, #44) can be scored by the same harness.

#### Scenario: Identical inputs yield identical rankings
- **WHEN** the baseline retriever is run twice over the same corpus and query
- **THEN** it SHALL return the same ordered list of repo URLs both times

#### Scenario: Retriever returns at most k results
- **WHEN** the retriever is asked for the top-`k` results for a query (`k` defaults to 5)
- **THEN** it SHALL return no more than `k` repo URLs, ranked best-first

#### Scenario: No-match query returns empty
- **WHEN** a query shares no keyword overlap with any corpus entry
- **THEN** the retriever SHALL return an empty result list rather than arbitrary repos

### Requirement: Scorecard metrics
The harness SHALL compute, over the full queryset, **precision@5**, **recall@5**, **mean reciprocal rank (MRR)**, and **no-answer rate**, where `k` defaults to 5 and is configurable. Precision@k SHALL be the fraction of the top-`k` results that are relevant; recall@k SHALL be the fraction of a query's ground-truth answers found in the top-`k`; MRR SHALL be the mean over queries of `1 / rank-of-first-relevant-result` (0 when none of the top-`k` is relevant); no-answer rate SHALL be the fraction of queries for which the retriever returned an empty result list.

#### Scenario: Metrics computed across all queries
- **WHEN** `bun run evals` finishes a run
- **THEN** it SHALL report precision@5, recall@5, MRR, and no-answer rate aggregated over every query in the queryset

#### Scenario: First-relevant rank drives MRR
- **WHEN** a query's first relevant result appears at rank 3 of the top-5
- **THEN** that query SHALL contribute `1/3` to MRR; a query with no relevant result in the top-5 SHALL contribute `0`

### Requirement: Human-readable and machine-readable output
`bun run evals` SHALL print a human-readable scorecard to the terminal and SHALL also emit a machine-readable JSON scorecard (the four aggregate metrics plus per-query results). The JSON output SHALL be stable enough to diff between runs so regressions are detectable.

#### Scenario: Both output forms produced
- **WHEN** `bun run evals` completes
- **THEN** a readable summary SHALL appear on the terminal AND a JSON scorecard SHALL be produced (to a known path or stdout) containing the aggregate metrics and per-query breakdown

### Requirement: Committed baseline scorecard
The system SHALL commit a baseline scorecard alongside the queryset, recording the metrics the deterministic baseline retriever achieves over the committed corpus and queryset. This scorecard is the documented floor that a future retriever (#44) must beat.

#### Scenario: Baseline scorecard is reproducible
- **WHEN** `bun run evals` is run against the committed corpus and queryset on the baseline retriever
- **THEN** the produced aggregate metrics SHALL match the committed baseline scorecard

### Requirement: Evals run as a CI step
The system SHALL run `bun run evals` in CI on pushes to `main` and on pull requests. Because the corpus is frozen and the retriever is deterministic, the run SHALL require no secrets and SHALL be reproducible.

#### Scenario: CI evals need no secrets
- **WHEN** the CI workflow runs the evals step
- **THEN** it SHALL complete without `GITHUB_TOKEN`, AI API keys, or network access to GitHub/AI backends

### Requirement: Documented run and authoring process
The README SHALL document how to run `bun run evals`, how to interpret the scorecard metrics, and how to add or remove a golden query as a single-PR change with no plumbing modifications.

#### Scenario: Reader can run and extend evals from the README
- **WHEN** a contributor reads the README evals section
- **THEN** they SHALL find the command to run evals, an explanation of precision@5 / recall@5 / MRR / no-answer rate, and the steps to add a golden query

