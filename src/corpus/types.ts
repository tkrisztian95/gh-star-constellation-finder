import { z } from "zod";

import { entitySchema } from "../ai/entityFilter.js";

/**
 * The single source of truth for the corpus contract — repo identity plus the
 * per-repo analysis, wrapped as a `{ meta, entries }` file. Both the
 * `--export-corpus` producer (`./exportCorpus.ts`) and the eval harness
 * (`../evals/`) import these so the shape can never drift between them.
 */
export const corpusEntrySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  topics: z.array(z.string()),
  category: z.string(),
  killerFeature: z.string(),
  description: z.string(),
  /** Technical entities extracted at analysis time; carried so the downstream
   * constellation needs no second NER pass. Defaults to [] for older corpora. */
  entities: z.array(entitySchema).default([]),
  /** GitHub archived flag, captured at build time. Lets health-check queries
   * ("which of my stars are archived?") be scored. */
  isArchived: z.boolean(),
});

export type CorpusEntry = z.infer<typeof corpusEntrySchema>;

/** Provenance for the corpus: which model wrote the analysis, and when. */
export const corpusMetaSchema = z.object({
  model: z.string(),
  generatedAt: z.string(),
});

export type CorpusMeta = z.infer<typeof corpusMetaSchema>;

/** The corpus file is `{ meta, entries }` so provenance travels with the data. */
export const corpusFileSchema = z.object({
  meta: corpusMetaSchema,
  entries: z.array(corpusEntrySchema),
});

export type CorpusFile = z.infer<typeof corpusFileSchema>;
