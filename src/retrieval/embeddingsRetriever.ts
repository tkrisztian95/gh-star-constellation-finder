import { buildEmbeddingText } from "./embeddingText.js";
import { normalize, dot } from "./vectorMath.js";
import type { AIProvider } from "../ai/types.js";
import { createBaselineRetriever } from "../evals/baselineRetriever.js";
import { repoKey, repoUrl, type CorpusEntry, type Retriever } from "../evals/types.js";

/** Max texts per embed call when building the corpus matrix. */
const EMBED_BATCH_SIZE = 256;

/** Reciprocal-rank-fusion constant. 60 is the value from the original RRF
 * paper (Cormack et al.) and is robust across corpora — it damps the influence
 * of any single retriever's exact ranking while preserving order. */
const RRF_C = 60;

/** Build the embedding text for a corpus entry — identical to the text the
 * analysis engine persists per repo, so eval scores predict production. */
function corpusText(entry: CorpusEntry): string {
  return buildEmbeddingText({
    name: `${entry.owner}/${entry.name}`,
    topics: entry.topics,
    category: entry.category,
    killerFeature: entry.killerFeature,
    description: entry.description,
  });
}

/** Map a best-first ranking to per-url RRF contributions: 1 / (C + rank). */
function rrfContributions(ranking: string[]): Map<string, number> {
  const m = new Map<string, number>();
  ranking.forEach((url, i) => m.set(url, 1 / (RRF_C + i + 1)));
  return m;
}

/**
 * Dense embeddings retriever with a keyword rerank (#44), implementing the eval
 * `Retriever` interface. Embeds every corpus entry once at build, then for each
 * query fuses two rankings via reciprocal rank fusion:
 *   1. dense cosine similarity over the embedding vectors, and
 *   2. the keyword baseline's lexical overlap.
 * Dense supplies semantic recall; the keyword signal sharpens ordering (MRR).
 * Fusion is what lets this retriever match-or-beat the keyword baseline rather
 * than trail it on a weak embedder. Ties break by repo key for determinism.
 */
export async function createEmbeddingsRetriever(
  corpus: CorpusEntry[],
  provider: AIProvider,
): Promise<Retriever> {
  const texts = corpus.map(corpusText);
  const vectors: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const raw = await provider.embed(texts.slice(i, i + EMBED_BATCH_SIZE));
    for (const v of raw) vectors.push(normalize(v));
  }
  const urls = corpus.map((e) => repoUrl(e));
  const keyword = createBaselineRetriever(corpus);

  /** Full dense ranking over the corpus, best-first, with the same repo-key
   * tie-break the baseline uses. */
  async function denseRanking(query: string): Promise<string[]> {
    const [qraw] = await provider.embed([query]);
    if (!qraw) return [];
    const q = normalize(qraw);
    const scored: { url: string; score: number }[] = [];
    for (let i = 0; i < vectors.length; i++) {
      const v = vectors[i]!;
      if (v.length !== q.length) continue; // dimension mismatch → skip
      scored.push({ url: urls[i]!, score: dot(v, q) });
    }
    scored.sort((a, b) => b.score - a.score || (repoKey(a.url) < repoKey(b.url) ? -1 : 1));
    return scored.map((s) => s.url);
  }

  return {
    name: `embeddings-${provider.embedderId}`,
    async search(query: string, k: number): Promise<string[]> {
      // Pull full rankings from both signals so RRF sees every candidate's rank.
      const [dense, lexical] = await Promise.all([
        denseRanking(query),
        keyword.search(query, corpus.length),
      ]);
      const denseRrf = rrfContributions(dense);
      const lexRrf = rrfContributions(lexical);

      const fused = new Map<string, number>();
      for (const url of new Set([...dense, ...lexical])) {
        fused.set(url, (denseRrf.get(url) ?? 0) + (lexRrf.get(url) ?? 0));
      }

      return [...fused.entries()]
        .sort((a, b) => b[1] - a[1] || (repoKey(a[0]) < repoKey(b[0]) ? -1 : 1))
        .slice(0, k)
        .map(([url]) => url);
    },
  };
}
