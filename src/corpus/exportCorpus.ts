import { writeFileSync } from "node:fs";

import { z } from "zod";

import type { AnalyzedRepo } from "../engine/suggestionEngine.js";

/**
 * The cross-project corpus contract. A `{ meta, entries }` file describing each
 * analyzed star: repo identity plus the per-repo analysis. This is the producer
 * side of the contract consumed by the constellation prototype (ner-structured)
 * and the eval harness (#43) — keep this shape identical to `src/evals/types.ts`.
 */
export const corpusEntrySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  topics: z.array(z.string()),
  category: z.string(),
  killerFeature: z.string(),
  description: z.string(),
  isArchived: z.boolean(),
});

export type CorpusEntry = z.infer<typeof corpusEntrySchema>;

export const corpusMetaSchema = z.object({
  model: z.string(),
  generatedAt: z.string(),
});

export const corpusFileSchema = z.object({
  meta: corpusMetaSchema,
  entries: z.array(corpusEntrySchema),
});

export type CorpusFile = z.infer<typeof corpusFileSchema>;

/** Map the in-memory analysis result for one repo to a frozen corpus entry. */
export function toCorpusEntry(analyzed: AnalyzedRepo): CorpusEntry {
  const { repo, analysis } = analyzed;
  return {
    owner: repo.owner,
    name: repo.name,
    topics: repo.topics ?? [],
    category: analysis.category,
    killerFeature: analysis.killerFeature,
    description: analysis.description,
    isArchived: repo.isArchived,
  };
}

/** Build the `{ meta, entries }` corpus file from analyzed repos. */
export function buildCorpusFile(
  analyzedRepos: AnalyzedRepo[],
  model: string,
  generatedAt: string = new Date().toISOString(),
): CorpusFile {
  return {
    meta: { model, generatedAt },
    entries: analyzedRepos.map(toCorpusEntry),
  };
}

/** Build, validate, and write the corpus file to disk. Returns the entry count. */
export function writeCorpusFile(
  path: string,
  analyzedRepos: AnalyzedRepo[],
  model: string,
): number {
  const file = corpusFileSchema.parse(buildCorpusFile(analyzedRepos, model));
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, "utf-8");
  return file.entries.length;
}
