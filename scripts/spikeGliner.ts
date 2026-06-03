/**
 * SPIKE (not for merge): run GlinerExtractor over a corpus.json and print the
 * entities, to compare GLiNER (local, ONNX) against the LLM extractor.
 *
 *   bun run scripts/spikeGliner.ts <corpus.json> <model.onnx> [limit]
 */
import { readFileSync } from "node:fs";

import { GlinerExtractor } from "../src/ai/glinerExtractor.js";

const [corpusPath, modelPath, limitArg] = process.argv.slice(2);
if (!corpusPath || !modelPath) {
  console.error("usage: bun run scripts/spikeGliner.ts <corpus.json> <model.onnx> [limit]");
  process.exit(1);
}
const limit = limitArg ? parseInt(limitArg, 10) : 8;

const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as {
  entries: Array<{
    owner: string;
    name: string;
    description?: string;
    killerFeature?: string;
    readme?: string;
    language?: string | null;
    topics?: string[];
  }>;
};

const extractor = new GlinerExtractor({ modelPath, threshold: 0.4 });

const entries = corpus.entries.slice(0, limit);
console.error(`GLiNER spike: ${entries.length} repos (model: ${modelPath})\n`);

let total = 0;
const t0 = Date.now();
for (const e of entries) {
  const started = Date.now();
  const entities = await extractor.extract({
    owner: e.owner,
    name: e.name,
    description: e.description ?? "",
    language: e.language ?? null,
    topics: e.topics ?? [],
    readme: e.readme ?? "",
  });
  total += entities.length;
  console.log(
    `${e.owner}/${e.name} (${Date.now() - started}ms): ` +
      entities.map((x) => `${x.name}:${x.label}`).join(", "),
  );
}
console.error(
  `\n${entries.length} repos, ${total} entities, avg ${(total / entries.length).toFixed(1)}/repo, ` +
    `${((Date.now() - t0) / entries.length / 1000).toFixed(1)}s/repo`,
);
