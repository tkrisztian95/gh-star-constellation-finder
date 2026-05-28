import { z } from "zod";

/**
 * A frozen corpus entry: repo identity plus the per-repo analysis shape the
 * tool produces. Generated once via the `--analyze-only` path over a curated
 * public-repo list, then committed verbatim. See design.md decision 1–2.
 */
export const corpusEntrySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  topics: z.array(z.string()),
  category: z.string(),
  killerFeature: z.string(),
  description: z.string(),
  /** GitHub archived flag, captured at build time. Lets health-check queries
   * ("which of my stars are archived?") be scored. */
  isArchived: z.boolean(),
});

export type CorpusEntry = z.infer<typeof corpusEntrySchema>;

export const corpusSchema = z.array(corpusEntrySchema);

/**
 * A golden query: a hand-authored question and one or more ground-truth repo
 * URLs. Every `expected` URL MUST resolve to a corpus entry (cross-checked at
 * load). `style` is documentation-only coverage metadata.
 */
export const querySchema = z.object({
  question: z.string().min(1),
  expected: z.array(z.string().min(1)).min(1),
  style: z
    .enum(["exact-recall", "categorical", "health-check", "property-based", "logical"])
    .optional(),
});

export type Query = z.infer<typeof querySchema>;

export const querysetSchema = z.array(querySchema);

/** Per-query result captured in the machine-readable scorecard. */
export interface QueryResult {
  question: string;
  expected: string[];
  /** Top-k repo URLs the retriever returned, best-first. */
  returned: string[];
  precisionAtK: number;
  recallAtK: number;
  /** 1 / rank-of-first-relevant within the top-k, or 0 if none relevant. */
  reciprocalRank: number;
  /** True when the retriever returned no results at all. */
  noAnswer: boolean;
}

/** Aggregate metrics plus per-query breakdown — the committed scorecard shape. */
export interface Scorecard {
  k: number;
  queryCount: number;
  precisionAtK: number;
  recallAtK: number;
  mrr: number;
  noAnswerRate: number;
  perQuery: QueryResult[];
}

/**
 * Retrieval seam. The baseline keyword retriever implements this; the future
 * embeddings retriever (#44) implements the same interface so it is scored by
 * the identical harness. Async to accommodate a query-time embedding call.
 */
export interface Retriever {
  readonly name: string;
  /** Return up to `k` repo URLs (`github.com/<owner>/<name>`), best-first. */
  search(query: string, k: number): Promise<string[]>;
}

/** Canonical repo URL for a corpus entry. */
export function repoUrl(entry: Pick<CorpusEntry, "owner" | "name">): string {
  return `github.com/${entry.owner}/${entry.name}`;
}

/**
 * Normalize a repo URL/reference to a lowercase `owner/name` key for
 * comparison. Accepts `https://github.com/o/n`, `github.com/o/n`, `o/n`, and
 * tolerates a trailing slash or `.git` suffix. GitHub owner/name are
 * case-insensitive, so keys are lowercased.
 */
export function repoKey(ref: string): string {
  let s = ref.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^github\.com\//, "");
  s = s.replace(/\.git$/, "");
  s = s.replace(/\/+$/, "");
  return s;
}
