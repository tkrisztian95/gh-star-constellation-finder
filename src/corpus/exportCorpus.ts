import { writeFileSync } from "node:fs";

import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { corpusFileSchema, type CorpusEntry, type CorpusFile } from "./types.js";

// The corpus contract lives in ./types.ts (shared with the eval harness).
// Re-export so existing importers of this module keep working.
export { corpusEntrySchema, corpusMetaSchema, corpusFileSchema } from "./types.js";
export type { CorpusEntry, CorpusFile, CorpusMeta } from "./types.js";

/**
 * The `--export-corpus` producer. Maps the in-memory `AnalyzedRepo[]` to the
 * corpus contract and writes a `{ meta, entries }` file consumed by the
 * constellation prototype (ner-structured) and the eval harness.
 */

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
