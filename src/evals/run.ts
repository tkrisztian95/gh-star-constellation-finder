import { readFileSync, writeFileSync } from "node:fs";

import { logger } from "../logger.js";
import { createProvider, type Backend } from "../ai/index.js";
import { createBaselineRetriever } from "./baselineRetriever.js";
import { createEmbeddingsRetriever } from "../retrieval/embeddingsRetriever.js";
import { crossCheck, FixtureError, loadCorpus, loadQueryset } from "./loaders.js";
import { aggregate, scoreQuery } from "./metrics.js";
import type { QueryResult, Retriever, Scorecard } from "./types.js";

const DEFAULT_CORPUS = "evals/corpus.json";
const DEFAULT_QUERIES = "evals/queries.json";
const DEFAULT_BASELINE = "evals/baseline.json";
const DEFAULT_EMBEDDINGS_SCORECARD = "evals/embeddings.json";
const DEFAULT_K = 5;

type RetrieverKind = "baseline" | "embeddings";

interface EvalOptions {
  corpusPath: string;
  queriesPath: string;
  baselinePath: string;
  k: number;
  /** Write the JSON scorecard here (defaults to the baseline path when --check is off). */
  outPath: string | null;
  /** Compare against the committed baseline and exit non-zero on drift. */
  check: boolean;
  /** Which retriever to score. */
  retriever: RetrieverKind;
  /** Backend for the embeddings retriever (omit to auto-detect from env). */
  backend: Backend | undefined;
}

function parseArgs(argv: string[]): EvalOptions {
  const opts: EvalOptions = {
    corpusPath: DEFAULT_CORPUS,
    queriesPath: DEFAULT_QUERIES,
    baselinePath: DEFAULT_BASELINE,
    k: DEFAULT_K,
    outPath: null,
    check: false,
    retriever: "baseline",
    backend: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => argv[++i] ?? "";
    if (a === "--check") opts.check = true;
    else if (a === "--k") opts.k = Math.max(1, parseInt(next(), 10) || DEFAULT_K);
    else if (a === "--corpus") opts.corpusPath = next();
    else if (a === "--queries") opts.queriesPath = next();
    else if (a === "--baseline") opts.baselinePath = next();
    else if (a === "--out") opts.outPath = next();
    else if (a === "--retriever") {
      const v = next();
      opts.retriever = v === "embeddings" ? "embeddings" : "baseline";
    } else if (a === "--backend") {
      const v = next();
      if (v === "openai" || v === "ollama") opts.backend = v;
    }
  }
  return opts;
}

/** Build the retriever named by the options. The embeddings retriever needs a
 * live provider (it embeds the corpus + each query), so it is constructed via
 * the same provider seam the app uses. */
async function buildRetriever(
  opts: EvalOptions,
  corpus: ReturnType<typeof loadCorpus>,
): Promise<Retriever> {
  if (opts.retriever === "embeddings") {
    const provider = createProvider(opts.backend);
    return createEmbeddingsRetriever(corpus, provider);
  }
  return createBaselineRetriever(corpus);
}

/** Round metrics to 4 decimals so committed scorecards diff cleanly and the
 * baseline-match gate is not defeated by float noise. */
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function roundScorecard(sc: Scorecard): Scorecard {
  return {
    ...sc,
    precisionAtK: round4(sc.precisionAtK),
    recallAtK: round4(sc.recallAtK),
    mrr: round4(sc.mrr),
    noAnswerRate: round4(sc.noAnswerRate),
    perQuery: sc.perQuery.map((r) => ({
      ...r,
      precisionAtK: round4(r.precisionAtK),
      recallAtK: round4(r.recallAtK),
      reciprocalRank: round4(r.reciprocalRank),
    })),
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatScorecard(sc: Scorecard, retrieverName: string): string {
  const lines = [
    "",
    `Eval scorecard — retriever: ${retrieverName}, k=${sc.k}, queries=${sc.queryCount}`,
    "─".repeat(56),
    `  precision@${sc.k}   ${pct(sc.precisionAtK)}`,
    `  recall@${sc.k}      ${pct(sc.recallAtK)}`,
    `  MRR            ${sc.mrr.toFixed(4)}`,
    `  no-answer rate ${pct(sc.noAnswerRate)}`,
    "─".repeat(56),
    "",
  ];
  return lines.join("\n");
}

/** Run a retriever over the queryset and produce a rounded scorecard. */
export async function runEvals(
  retriever: Retriever,
  queryset: ReturnType<typeof loadQueryset>,
  k: number,
): Promise<Scorecard> {
  const perQuery: QueryResult[] = [];
  for (const query of queryset) {
    const returned = await retriever.search(query.question, k);
    perQuery.push(scoreQuery(query, returned, k));
  }
  return roundScorecard(aggregate(perQuery, k, retriever.name));
}

/** Compare two scorecards on retriever identity + the four aggregate metrics. */
function aggregatesMatch(a: Scorecard, b: Scorecard): boolean {
  return (
    a.retriever === b.retriever &&
    a.k === b.k &&
    a.queryCount === b.queryCount &&
    a.precisionAtK === b.precisionAtK &&
    a.recallAtK === b.recallAtK &&
    a.mrr === b.mrr &&
    a.noAnswerRate === b.noAnswerRate
  );
}

export async function main(argv: string[]): Promise<number> {
  const opts = parseArgs(argv);
  try {
    const corpus = loadCorpus(opts.corpusPath);
    const queryset = loadQueryset(opts.queriesPath);
    crossCheck(corpus, queryset);

    const retriever = await buildRetriever(opts, corpus);
    const scorecard = await runEvals(retriever, queryset, opts.k);

    process.stdout.write(formatScorecard(scorecard, retriever.name));

    if (opts.check) {
      // Regression gate: the produced scorecard must reproduce the committed baseline.
      const committed = roundScorecard(
        JSON.parse(readFileSync(opts.baselinePath, "utf8")) as Scorecard,
      );
      if (!aggregatesMatch(scorecard, committed)) {
        process.stdout.write(
          `\nBASELINE MISMATCH — produced metrics differ from ${opts.baselinePath}.\n` +
            `If this change is intentional, re-commit the baseline with: bun run evals --out ${opts.baselinePath}\n`,
        );
        return 1;
      }
      process.stdout.write(`\nBaseline reproduced — matches ${opts.baselinePath}.\n`);
      return 0;
    }

    // Default output path: the embeddings retriever writes its own scorecard so
    // it never clobbers the committed keyword baseline.
    const defaultOut =
      opts.retriever === "embeddings" ? DEFAULT_EMBEDDINGS_SCORECARD : opts.baselinePath;
    const out = opts.outPath ?? defaultOut;
    writeFileSync(out, JSON.stringify(scorecard, null, 2) + "\n");
    process.stdout.write(`Scorecard written to ${out}\n`);
    return 0;
  } catch (err) {
    if (err instanceof FixtureError) {
      process.stderr.write(`eval fixture error: ${err.message}\n`);
      return 2;
    }
    logger.error("evals run failed", { message: err instanceof Error ? err.message : String(err) });
    process.stderr.write(`evals failed: ${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
}
