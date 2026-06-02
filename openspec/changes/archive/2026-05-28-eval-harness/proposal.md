Tracks #43

## Why

The project is pivoting to a retrieval surface ("ask a question, get the right starred repos back"), but retrieval quality is currently invisible — there is no way to tell whether a prompt tweak, a ranking change, or the upcoming embeddings layer (#44) makes search _better_ or _worse_. This slice builds the measuring stick: a deterministic eval harness with a committed golden queryset that grades search accuracy with a number, so retrieval can be improved on purpose instead of by guessing. It is the quality gate that MUST precede the retrieval surfaces (#44, #21, #7) — without an objective scorecard, prompt and embedding iteration is blind and there is no regression signal.

## What Changes

- Add a `bun run evals` script (new `src/evals/` module + `package.json` script) that runs a fixed queryset against a baseline retriever over a frozen corpus and emits a scorecard.
- Add a **frozen corpus fixture** — a committed JSON snapshot of ~50–100 well-known **public** repos, each carrying the same per-repo analysis shape the tool produces (`category`, `killerFeature`, `description`, plus repo identity: `owner`, `name`, `topics`). Generated **once** via `--analyze-only` over a curated repo list, then committed verbatim. Not personal stars; not fetched live.
- Add a **golden queryset fixture** — a committed JSON file of 50–100 hand-written questions, each mapping to one or more ground-truth repo URLs that MUST resolve to a repo present in the frozen corpus. Coverage spans exact recall ("rust tool that searches file contents"), categorical lookup ("auth on Next.js"), health checks ("archived repos in my AI list"), and property-based ("smallest dependency-free X").
- Add a **deterministic baseline retriever** — keyword/lexical scoring over the corpus text fields (`name`, `topics`, `category`, `killerFeature`, `description`). This is the floor the embeddings layer (#44) must beat. No AI calls, no network.
- Report metrics per run: **precision@5**, **recall@5**, **MRR**, and **no-answer rate** — emitted in both human-readable (terminal) and machine-readable (JSON) form. `k` defaults to 5.
- Commit a **baseline scorecard** (the score the keyword retriever achieves today) alongside the queryset so future PRs have a concrete number to beat.
- Add a **CI step** that runs `bun run evals` on pushes to `main` (and PRs). Safe to gate on because the corpus is frozen and the retriever is deterministic, so the score is reproducible. Whether to fail CI on a score drop (hard gate) vs. report-only is decided in design.
- Document in the README how to run evals, how to read the scorecard, and how to add a golden query.

## Capabilities

### New Capabilities

- `eval-harness`: a deterministic retrieval evaluation framework — frozen public-repo corpus, hand-authored golden queryset with ground-truth repo URLs, a baseline keyword retriever, and a `bun run evals` runner that grades search accuracy (precision@5, recall@5, MRR, no-answer rate) and emits a committed baseline scorecard.

### Modified Capabilities

_None._ This slice is purely additive: new fixtures, a new runner, and a new CI step. It does not change the behavior of any existing capability — the analysis → consolidation → suggestion pipeline is untouched, and `--analyze-only` is reused only as a one-time fixture generator, not modified.

## Impact

- **Code**: new `src/evals/` module (runner, baseline retriever, metrics, corpus/queryset loaders with `zod` validation at the JSON boundary); new `evals` script in `package.json`; new `bun run evals` entry point. The baseline retriever is structured behind a small interface so the embeddings slice (#44) can plug in a second retriever and be scored by the same harness.
- **Fixtures (committed data)**: `evals/corpus.json` (frozen analyzed public repos), `evals/queries.json` (golden queryset), `evals/baseline.json` (committed scorecard). Exact paths finalized in design.
- **CI**: a new job/step in the GitHub Actions workflow invoking `bun run evals`.
- **Docs**: README section on running and interpreting evals, and the single-PR process for adding a query.
- **Out of scope**: the retrieval surface itself and the embeddings table (`analysis-embeddings`, #44 — next slice); a top-level parallel multi-model compare mode (#10 — noted as a future hook on the retriever interface, but the multi-model runner is NOT built here); LLM-as-judge scoring (start deterministic against ground-truth URLs); any change to the existing categorizer pipeline.
