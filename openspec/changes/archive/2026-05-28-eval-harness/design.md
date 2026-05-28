## Context

The project is adding a retrieval surface over the per-repo analysis the tool already produces. Retrieval quality is currently unmeasurable: nothing computes how often "ask a question, get the right repos" returns the right repos. This slice builds a deterministic eval harness — the measuring stick that must exist before the embeddings retriever (#44) and the `--ask` / MCP surfaces (#21, #7), so their improvements are provable and regressions are catchable.

A load-bearing constraint surfaced during exploration: the analysis cache (`src/cache/analysisCache.ts`) keys rows by `${nodeId}:${sha256(readme)}` and stores **analysis text only** — no `owner`, `name`, or URL. You cannot derive a repo URL from a cache row. Repo identity lives only in a live GitHub fetch or in the `--analyze-only` JSON output (which already carries `owner`, `name`, `topics`, and the embedded `AnalysisResult`). The eval harness scores against ground-truth repo URLs, so its corpus must be repo-identified — which rules out the raw cache db as the fixture and points at the `--analyze-only` JSON shape instead.

## Goals / Non-Goals

**Goals:**
- A `bun run evals` runner that grades retrieval accuracy with a reproducible number, offline.
- A committed, frozen, repo-identified corpus of curated public repos as the searchable haystack.
- A hand-authored golden queryset whose every ground-truth URL resolves to a corpus repo.
- A deterministic baseline keyword retriever behind an interface that the future embeddings retriever (#44) can implement and be scored identically.
- Metrics: precision@5, recall@5, MRR, no-answer rate — human-readable + JSON.
- A committed baseline scorecard and a secret-free CI step.

**Non-Goals:**
- The retrieval surface itself or the embeddings table (#44, next slice).
- The multi-model **compare runner** (`--compare modelA,modelB` side-by-side table) — see "Future hooks"; tracked in #10.
- LLM-as-judge scoring (start deterministic against ground-truth URLs).
- Any change to the existing analyzer → consolidation → suggestion pipeline.

## Decisions

**1. Corpus = frozen, curated, public repos — generated once via `--analyze-only`, committed as JSON.**
A fixed haystack makes the score reproducible (CI-safe, secret-free, free, fast) and lets query authors reference recognizable public repos guaranteed to be present. Generated once by running the real `--analyze-only` path over a curated repo list, then committed verbatim — so the corpus text matches what the tool actually produces, not idealized hand-written text.
- _Alternative — live fetch each run_: rejected. Non-deterministic (stars + model drift), needs `GITHUB_TOKEN` + AI keys in CI, slow, costs tokens. Cannot be a regression gate.
- _Alternative — snapshot of personal stars_: rejected. Query authors couldn't reference repos shared with reviewers; the fixture would be personal and opaque.
- _Alternative — hand-written analysis text_: rejected for the corpus body. Tedious for 50–100 repos and wouldn't reflect real analyzer output. (Hand-authoring is reserved for the queryset, where ground truth genuinely is a human judgment.)

**2. Fixture format = JSON keyed by `owner/name`, NOT the SQLite cache db.**
The cache key is README-hash-based and carries no repo identity, so it is unusable as a portable, diff-reviewable fixture. A flat JSON array keyed by `owner/name` is durable across README changes, human-reviewable in PRs, and trivially `zod`-validated. The corpus mirrors the `--analyze-only` per-repo shape (`owner`, `name`, `topics`, `category`, `killerFeature`, `description`) so a snapshot can be produced by capturing that output.

**3. Baseline retriever = deterministic keyword/lexical scoring behind a `Retriever` interface.**
Pre-embeddings, the floor is dumb-on-purpose: lowercase + tokenize the query, score each corpus entry by token overlap across `name`, `topics`, `category`, `killerFeature`, `description`, rank, return top-`k` URLs. No AI, no network → identical inputs give identical rankings. The retriever is hidden behind a minimal interface (`search(query, k) -> repoUrl[]`) so the embeddings slice (#44) drops in a second implementation scored by the exact same harness, and so model-compare (#10) is "run the harness with retriever A vs B."
- _Alternative — BM25/TF-IDF now_: deferred. Adds tuning surface and a dependency for a baseline whose only job is "be the floor." Plain overlap is sufficient and obviously beatable.

**4. Metrics: precision@5, recall@5, MRR, no-answer rate; `k` defaults to 5, configurable.**
Queries may declare multiple ground-truth URLs, so recall@k is meaningful (relevant-found-in-top-k ÷ total-relevant). MRR rewards ranking the first correct answer high. No-answer rate captures "returned nothing," which precision/recall alone hide. These are the milestone's chosen metrics and back its `precision@5 ≥ 0.6` success line.

**5. CI gate = reproducibility + regression check against the committed baseline, not an absolute threshold (initially).**
Because the run is deterministic, CI asserts the produced scorecard **matches the committed `baseline.json`**. A drift means either the corpus/queryset/retriever changed (commit the new baseline in the same PR) or non-determinism crept in (a real bug). This is a stricter, clearer signal than an arbitrary floor while the queryset is young. An absolute `precision@5 ≥ X` hard gate can be layered on later once the queryset is proven stable.

**6. Validate fixtures at the JSON boundary with `zod`; cross-check queryset against corpus at startup.**
Per the project's "zod at every external boundary" rule. On load, every ground-truth URL is checked to resolve to a corpus entry; a dangling reference exits non-zero and names the query — this is the most likely authoring mistake and must fail loudly, not silently score 0.

## Risks / Trade-offs

- **Frozen corpus drifts from real analyzer output over time** → acceptable and intentional: the corpus is a fixed test fixture, not live data. Refreshing it is a deliberate, reviewable PR that re-commits `corpus.json` + `baseline.json` together.
- **Baseline keyword retriever scores deceptively high on keyword-y queries** → that is the point (it sets a real floor); queryset coverage of property-based / categorical queries (where keywords fail) keeps the floor honest and leaves room for embeddings to win.
- **Queryset author references a repo not in the corpus** → mitigated by the startup cross-check (Decision 6) that fails fast and names the offending query.
- **CI baseline-match gate is brittle if any non-determinism leaks in** → that brittleness is a feature here: a baseline mismatch is exactly the regression signal we want. The fix is to keep the retriever pure (no `Date.now`, no map-iteration-order dependence, stable tie-breaking by repo URL).
- **Reviewers mistake the eval score for a pass/fail test** → README must frame it as a graded scorecard (better/worse), not a binary assertion.

## Migration Plan

Additive only — no migration of existing data or behavior. Rollout:
1. Land the harness code (`src/evals/`), the `Retriever` interface, the loaders/metrics, and the `evals` script.
2. Curate the public-repo list; generate `corpus.json` once via `--analyze-only`; commit it.
3. Hand-author `queries.json`; run the harness; commit the resulting `baseline.json`.
4. Add the CI step and the README section in the same PR.
Rollback is deleting the `src/evals/` module, the fixtures, the script, and the CI step — nothing else depends on them yet.

## Open Questions

- **Exact fixture paths** (`evals/` at repo root vs `src/evals/fixtures/`) — finalize during apply; leaning a top-level `evals/` data dir with `src/evals/` for code.
- **Corpus size** — start ~50, grow toward 100 as queryset coverage demands; record the actual count in the README.
- **Absolute-threshold hard gate** (`precision@5 ≥ 0.6`) — deferred; ship the baseline-match gate first, add the floor once the queryset is stable.

### Future hooks (explicitly deferred, tracked)

- **Multi-model compare runner (#10).** The `Retriever` interface + reproducible scorecards already make model comparison "run the harness N times, diff the JSON." The deferred convenience is a `--compare A,B` flag that runs several configurations at once and prints a side-by-side table. Two compare axes it will serve: (A) **analyzer models** — regenerate the corpus with model X vs Y, same queryset, diff scores ("does richer analysis text help search?"); (B) **embedder models** (after #44) — same corpus, swap the embedding retriever, diff scores. This slice builds the apparatus; #10 builds the sugar. **A follow-up issue (#10, reframed) MUST remain open to track the compare runner.**
