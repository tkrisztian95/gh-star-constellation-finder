## 1. Module scaffold & types

- [ ] 1.1 Create `src/evals/` module dir and decide fixture data location (top-level `evals/` for `corpus.json` / `queries.json` / `baseline.json`; code in `src/evals/`).
- [ ] 1.2 Define the corpus entry type + `zod` schema (`owner`, `name`, `topics`, `category`, `killerFeature`, `description`) and a `repoUrl(entry)` helper (`github.com/<owner>/<name>`).
- [ ] 1.3 Define the queryset type + `zod` schema (`question`, `expected: string[]` of repo URLs) and the scorecard JSON type (aggregate metrics + per-query results).
- [ ] 1.4 Define the `Retriever` interface (`search(query, k) -> repoUrl[]`) so #44's embeddings retriever can implement it later.

## 2. Loaders & validation

- [ ] 2.1 Implement the corpus loader: read + `zod`-parse `corpus.json`; on invalid shape, exit non-zero naming the offending entry.
- [ ] 2.2 Implement the queryset loader: read + `zod`-parse `queries.json`.
- [ ] 2.3 Implement the startup cross-check: every queryset `expected` URL must resolve to a corpus entry; a dangling reference exits non-zero and names the query.

## 3. Baseline retriever

- [ ] 3.1 Implement the deterministic keyword retriever: lowercase + tokenize the query, score each corpus entry by token overlap across `name`, `topics`, `category`, `killerFeature`, `description`.
- [ ] 3.2 Rank best-first with stable tie-breaking by repo URL; return at most `k` URLs (`k` default 5); return empty on zero overlap. No AI, no network, no `Date.now`/random.

## 4. Metrics & scorecard

- [ ] 4.1 Implement precision@k and recall@k (multi-answer aware) per query.
- [ ] 4.2 Implement MRR (`1 / rank-of-first-relevant`, `0` if none in top-`k`) and no-answer rate (empty-result fraction).
- [ ] 4.3 Aggregate the four metrics across the queryset and assemble the machine-readable scorecard (aggregates + per-query breakdown).

## 5. Runner & output

- [ ] 5.1 Implement the `bun run evals` entry point: load corpus + queryset, cross-check, run the baseline retriever over every query, compute metrics.
- [ ] 5.2 Print the human-readable terminal scorecard and emit the JSON scorecard (known path or stdout); make `k` configurable (default 5).
- [ ] 5.3 Add the `evals` script to `package.json`.

## 6. Fixtures & baseline

- [ ] 6.1 Curate a list of ~50 well-known public repos covering varied domains.
- [ ] 6.2 Generate `corpus.json` once via the `--analyze-only` path over the curated list; commit it verbatim.
- [ ] 6.3 Hand-author 50–100 golden queries in `queries.json` spanning exact-recall, categorical-lookup, health-check, and property-based styles; ensure every `expected` URL is present in the corpus.
- [ ] 6.4 Run the harness and commit the resulting `baseline.json` scorecard.

## 7. CI & docs

- [ ] 7.1 Add a CI step running `bun run evals` on pushes to `main` and PRs; assert the produced scorecard matches the committed `baseline.json` (reproducibility + regression gate); confirm no secrets/network needed.
- [ ] 7.2 Add a README section: how to run evals, how to read precision@5 / recall@5 / MRR / no-answer rate, and the single-PR steps to add a golden query.
- [ ] 7.3 File/reframe the follow-up issue (#10) for the deferred multi-model `--compare` runner; link it from the design's future-hooks note.

## 8. Tests & quality gates

- [ ] 8.1 Unit-test the metrics (known retriever output + ground truth → expected precision/recall/MRR/no-answer values) and the baseline retriever's determinism (same input → same ranking).
- [ ] 8.2 Test the queryset↔corpus cross-check fails fast on a dangling URL.
- [ ] 8.3 Run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` — all clean.
