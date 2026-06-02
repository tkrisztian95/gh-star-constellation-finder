import { repoKey, type Query, type QueryResult, type Scorecard } from "./types.js";

/**
 * Score one query's returned top-k URLs against its ground-truth answers.
 * - precision@k = relevant-in-topk / k
 * - recall@k    = relevant-in-topk / total-relevant (multi-answer aware)
 * - reciprocalRank = 1 / rank-of-first-relevant, or 0 if none in top-k
 * - noAnswer = retriever returned nothing
 */
export function scoreQuery(query: Query, returned: string[], k: number): QueryResult {
  const expectedKeys = new Set(query.expected.map(repoKey));
  const topK = returned.slice(0, k);

  let relevantInTopK = 0;
  let firstRelevantRank = 0;
  topK.forEach((url, i) => {
    if (expectedKeys.has(repoKey(url))) {
      relevantInTopK++;
      if (firstRelevantRank === 0) firstRelevantRank = i + 1;
    }
  });

  return {
    question: query.question,
    expected: query.expected,
    returned: topK,
    precisionAtK: k > 0 ? relevantInTopK / k : 0,
    recallAtK: expectedKeys.size > 0 ? relevantInTopK / expectedKeys.size : 0,
    reciprocalRank: firstRelevantRank > 0 ? 1 / firstRelevantRank : 0,
    noAnswer: returned.length === 0,
  };
}

/** Aggregate per-query results into the committed scorecard shape. */
export function aggregate(perQuery: QueryResult[], k: number, retriever: string): Scorecard {
  const n = perQuery.length;
  const mean = (sel: (r: QueryResult) => number): number =>
    n === 0 ? 0 : perQuery.reduce((acc, r) => acc + sel(r), 0) / n;

  return {
    retriever,
    k,
    queryCount: n,
    precisionAtK: mean((r) => r.precisionAtK),
    recallAtK: mean((r) => r.recallAtK),
    mrr: mean((r) => r.reciprocalRank),
    noAnswerRate: mean((r) => (r.noAnswer ? 1 : 0)),
    perQuery,
  };
}
