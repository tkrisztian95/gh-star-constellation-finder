/** Lowercase, split on non-alphanumerics, drop empties. Deterministic — the
 * shared tokenizer for keyword scoring across the eval baseline retriever and
 * the cache-backed retriever's keyword-fusion pass. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}
