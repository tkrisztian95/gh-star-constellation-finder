import { normalize, dot } from "./vectorMath.js";
import { tokenize } from "./tokenize.js";
import { repoKey } from "../evals/types.js";
import type { AIProvider } from "../ai/types.js";
import type { LangfuseParent } from "../ai/tracing.js";
import type { AnalysisCache } from "../cache/analysisCache.js";

/** Reciprocal-rank-fusion constant — matches the slice-A embeddings retriever. */
const RRF_C = 60;

/** A repo retrieved for a question, with the data needed to ground and cite an
 * answer: its `github.com/<owner>/<name>` URL, the `doc` it was embedded from,
 * and its fused relevance score. */
export interface RetrievedRepo {
  url: string;
  doc: string;
  score: number;
}

export interface CacheRetriever {
  /** Embed the query and return up to `k` repos best-first. */
  search(query: string, k: number, parent?: LangfuseParent | null): Promise<RetrievedRepo[]>;
  /** Number of repos available for retrieval (rows for the active embedder). */
  readonly size: number;
}

/** Map a best-first ranking of indices to per-index RRF contributions. */
function rrfContributions(ranking: number[]): Map<number, number> {
  const m = new Map<number, number>();
  ranking.forEach((idx, rank) => m.set(idx, 1 / (RRF_C + rank + 1)));
  return m;
}

/**
 * Cache-backed retriever for `--ask` (#21). Reads persisted vectors + owner/
 * name/doc for the active embedder from the cache (no corpus re-embedding),
 * embeds ONLY the query, and ranks by cosine similarity fused with a keyword
 * pass over the cached `doc` text via RRF — mirroring the slice-A retriever.
 * Returns an empty result when the cache holds no vectors for the active
 * embedder, so the caller can tell the user to run analysis first.
 */
export function createCacheRetriever(cache: AnalysisCache, provider: AIProvider): CacheRetriever {
  // Stored vectors were unit-normalized at write, so cosine is a plain dot
  // product against the normalized query.
  const records = cache.allEmbeddings(provider.embedderId);
  const urls = records.map((r) => `github.com/${r.owner}/${r.name}`);
  const docTokens = records.map((r) => new Set(tokenize(r.doc)));

  return {
    size: records.length,
    async search(
      query: string,
      k: number,
      parent: LangfuseParent | null = null,
    ): Promise<RetrievedRepo[]> {
      if (records.length === 0) return [];

      const [qraw] = await provider.embed([query], undefined, parent);
      if (!qraw) return [];
      const q = normalize(qraw);

      // Dense ranking: cosine of the query against each stored vector.
      const dense: { idx: number; score: number }[] = [];
      for (let i = 0; i < records.length; i++) {
        const v = records[i]!.vector;
        if (v.length !== q.length) continue; // dimension guard
        dense.push({ idx: i, score: dot(q, v) });
      }
      dense.sort(
        (a, b) => b.score - a.score || (repoKey(urls[a.idx]!) < repoKey(urls[b.idx]!) ? -1 : 1),
      );

      // Keyword ranking: query-token overlap against each repo's doc tokens.
      const queryTokens = new Set(tokenize(query));
      const lexical: { idx: number; score: number }[] = [];
      for (let i = 0; i < docTokens.length; i++) {
        let overlap = 0;
        for (const t of queryTokens) if (docTokens[i]!.has(t)) overlap++;
        if (overlap > 0) lexical.push({ idx: i, score: overlap });
      }
      lexical.sort(
        (a, b) => b.score - a.score || (repoKey(urls[a.idx]!) < repoKey(urls[b.idx]!) ? -1 : 1),
      );

      // Fuse the two rankings with RRF.
      const denseRrf = rrfContributions(dense.map((d) => d.idx));
      const lexRrf = rrfContributions(lexical.map((l) => l.idx));
      const fused = new Map<number, number>();
      for (const idx of new Set([...denseRrf.keys(), ...lexRrf.keys()])) {
        fused.set(idx, (denseRrf.get(idx) ?? 0) + (lexRrf.get(idx) ?? 0));
      }

      return [...fused.entries()]
        .sort((a, b) => b[1] - a[1] || (repoKey(urls[a[0]]!) < repoKey(urls[b[0]]!) ? -1 : 1))
        .slice(0, k)
        .map(([idx, score]) => ({ url: urls[idx]!, doc: records[idx]!.doc, score }));
    },
  };
}
