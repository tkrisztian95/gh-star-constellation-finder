import { repoKey, repoUrl, type CorpusEntry, type Retriever } from "./types.js";

/** Lowercase, split on non-alphanumerics, drop empties. Deterministic. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Searchable token bag for a corpus entry, across all text fields. */
function entryTokens(entry: CorpusEntry): Set<string> {
  const fields = [
    entry.name,
    entry.topics.join(" "),
    entry.category,
    entry.killerFeature,
    entry.description,
  ];
  return new Set(tokenize(fields.join(" ")));
}

interface Scored {
  url: string;
  score: number;
}

/**
 * Deterministic baseline retriever: ranks corpus entries by how many distinct
 * query tokens appear in the entry's combined text fields. No AI, no network,
 * no time/random — identical (query, corpus) inputs yield identical rankings.
 * This is the floor the embeddings retriever (#44) must beat.
 */
export function createBaselineRetriever(corpus: CorpusEntry[]): Retriever {
  // Precompute token bags once; ranking reads only from these + the query.
  const bags = corpus.map((entry) => ({ url: repoUrl(entry), tokens: entryTokens(entry) }));

  return {
    name: "baseline-keyword",
    search(query: string, k: number): Promise<string[]> {
      const queryTokens = new Set(tokenize(query));
      const scored: Scored[] = [];
      for (const { url, tokens } of bags) {
        let score = 0;
        for (const qt of queryTokens) {
          if (tokens.has(qt)) score++;
        }
        if (score > 0) scored.push({ url, score });
      }
      // Best-first; stable tie-break by repo key so ranking is fully deterministic.
      scored.sort((a, b) => b.score - a.score || (repoKey(a.url) < repoKey(b.url) ? -1 : 1));
      return Promise.resolve(scored.slice(0, k).map((s) => s.url));
    },
  };
}
