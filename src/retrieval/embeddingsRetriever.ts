import { buildEmbeddingText } from "./embeddingText.js";
import type { AIProvider } from "../ai/types.js";
import { repoKey, repoUrl, type CorpusEntry, type Retriever } from "../evals/types.js";

/** Max texts per embed call when building the corpus matrix. */
const EMBED_BATCH_SIZE = 256;

/** Unit-normalize so cosine similarity reduces to a dot product. A zero vector
 * stays zero (cosine against it is 0). */
function normalize(vec: number[]): Float32Array {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  const out = new Float32Array(vec.length);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) out[i] = vec[i]! / norm;
  }
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

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

/**
 * Dense embeddings retriever implementing the eval `Retriever` interface (#44).
 * Embeds every corpus entry once at build via the provider, then answers each
 * query by embedding it and ranking corpus vectors by cosine similarity
 * (brute-force, in-process). Tie-break by repo key mirrors the keyword baseline
 * so rankings are deterministic and the two retrievers are comparable.
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

  return {
    name: `embeddings-${provider.embedderId}`,
    async search(query: string, k: number): Promise<string[]> {
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
      return scored.slice(0, k).map((s) => s.url);
    },
  };
}
