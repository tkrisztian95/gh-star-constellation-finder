/** The retrieval-relevant fields embedded per repo. Mirrors the fields the
 * keyword baseline retriever tokenizes (see src/evals/baselineRetriever.ts) so
 * the dense and sparse retrievers are compared over equivalent content. */
export interface EmbeddingTextFields {
  name: string;
  topics: string[];
  category: string;
  killerFeature: string;
  description: string;
}

/** Assemble the text embedded for a repo from its searchable fields. Newline
 * separated, empty fields dropped, so the embedder sees only signal. */
export function buildEmbeddingText(fields: EmbeddingTextFields): string {
  return [
    fields.name,
    fields.topics.join(" "),
    fields.category,
    fields.killerFeature,
    fields.description,
  ]
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join("\n");
}
