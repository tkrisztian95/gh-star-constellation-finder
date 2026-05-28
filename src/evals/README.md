# `src/evals/` — retrieval eval harness (code)

The engine behind `bun run evals`. Grades retrieval accuracy over the frozen fixtures in the repo-root [`evals/`](../../evals/) directory and emits a scorecard. See the [Retrieval Evals](../../README.md#-retrieval-evals) README section for usage and metric definitions.

Design intent: a deterministic, offline measuring stick built **before** the retrieval surface it measures (embeddings #44, `--ask` #21, MCP #7), so search changes can be judged by a number instead of guessed.

## Modules

| File | Responsibility |
| --- | --- |
| `types.ts` | zod schemas for the corpus file (`{ meta, entries }`, with `meta` = `model` + `generatedAt`) and queryset, the `Scorecard` shape (carries `retriever`, no date), the `Retriever` interface, and `repoUrl` / `repoKey` helpers (case/protocol/slash-insensitive). |
| `loaders.ts` | Load + zod-validate the corpus (returns `entries`) and queryset; `crossCheck` rejects any ground-truth URL absent from the corpus (`FixtureError`). |
| `baselineRetriever.ts` | Deterministic keyword/token-overlap retriever over `name`, `topics`, `category`, `killerFeature`, `description` (+ an `archived`/`active` token). No AI, no network, no time/random. The floor #44 must beat. |
| `metrics.ts` | Per-query precision@k, recall@k (multi-answer aware), reciprocal rank, no-answer; aggregation into the `Scorecard`. |
| `run.ts` | Orchestration: load → cross-check → score → print + emit JSON. `main(argv)` returns an exit code. |
| `index.ts` | `bun run evals` entry point — calls `main`, sets the process exit code. |
| `buildCorpus.ts` | Build-time corpus generator: curated `owner/name` list → fetch public metadata + README → run the real analyzer → write `corpus.json`. Needs `GITHUB_TOKEN` + a backend. |
| `buildCorpus.entry.ts` | `bun run evals:build-corpus` entry point. |

## Scripts

```bash
bun run evals                 # score baseline retriever, write evals/baseline.json
bun run evals --check         # reproduce committed baseline; non-zero on drift (CI gate)
bun run evals --k 10          # change cutoff (default 5)
bun run evals:build-corpus    # regenerate evals/corpus.json (needs GITHUB_TOKEN + backend)
```

Flags: `--corpus`, `--queries`, `--baseline`, `--out` override fixture paths (used in tests).

## Adding a new retriever (e.g. embeddings, #44)

Implement the `Retriever` interface from `types.ts`:

```ts
interface Retriever {
  readonly name: string;
  search(query: string, k: number): Promise<string[]>; // top-k repo URLs, best-first
}
```

Pass it to `runEvals(retriever, queryset, k)` in `run.ts` and it is scored by the exact same metrics and queryset — the baseline and any future retriever are directly comparable. Running multiple retrievers and diffing their scorecards is the model-compare path tracked in #10.

## Conventions

- Output goes through `process.stdout` / `process.stderr` — the `no-console` ESLint rule applies here (no `console.*`).
- The baseline retriever must stay pure (no `Date.now`, no `Math.random`, stable tie-break by repo key) so the committed baseline reproduces and the CI gate is meaningful.
- All external JSON is zod-validated at the boundary (`loaders.ts`); inside the harness, trust the parsed types.

## Tests

`src/__tests__/evals.test.ts` — metric math, multi-answer recall, URL normalization, aggregation, cross-check failure, loader validation, and retriever determinism.
