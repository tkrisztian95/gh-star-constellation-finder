/**
 * SPIKE: GLiNER extract → LLM normalize the candidate LIST (not the README).
 *
 *   OLLAMA_MODEL=llama3 bun run scripts/spikeGlinerLlm.ts <corpus.json> <model.onnx> [limit]
 */
import { readFileSync } from "node:fs";

import { GlinerExtractor } from "../src/ai/glinerExtractor.js";
import { LlmNormalizingExtractor } from "../src/ai/entityNormalizer.js";
import { createProvider } from "../src/ai/index.js";

const [corpusPath, modelPath, limitArg] = process.argv.slice(2);
const limit = limitArg ? parseInt(limitArg, 10) : 6;

const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as {
  entries: Array<{
    owner: string;
    name: string;
    description?: string;
    readme?: string;
    language?: string | null;
    topics?: string[];
  }>;
};

const gliner = new GlinerExtractor({ modelPath, threshold: 0.4 });
const provider = createProvider("ollama");
const hybrid = new LlmNormalizingExtractor(gliner, provider);

const entries = corpus.entries.slice(0, limit);
console.error(`GLiNER→LLM-normalize spike: ${entries.length} repos (provider: ${provider.modelId})\n`);

const t0 = Date.now();
let total = 0;
for (const e of entries) {
  const started = Date.now();
  const entities = await hybrid.extract({
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
