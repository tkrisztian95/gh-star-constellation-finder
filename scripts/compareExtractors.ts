/**
 * Compare entity-extraction variants on the same repos.
 *
 *   A) LLM-full       — LLM reads the whole README (reference / silver standard)
 *   B) GLiNER-raw     — local NER only
 *   C) GLiNER+alias   — + deterministic canonicalization
 *   D) GLiNER+alias+LLM-normalize — the layered pipeline (composes via the seam)
 *
 * No hand-labeled goldset yet, so A is treated as the REFERENCE and we report
 * agreement (precision/recall vs A), not absolute accuracy. Raw counts show
 * recall/noise; agreement shows graph-readiness (does it match the clean run).
 *
 *   OLLAMA_MODEL=llama3 bun run scripts/spikeEntityEval.ts <corpus_with_readme.json> <llm_full_entities.json> <model.onnx> [limit]
 */
import { readFileSync } from "node:fs";

import { GlinerExtractor } from "../src/ai/glinerExtractor.js";
import { AliasNormalizingExtractor, aliasNormalize } from "../src/ai/aliasMap.js";
import { LlmNormalizingExtractor } from "../src/ai/entityNormalizer.js";
import { createProvider } from "../src/ai/index.js";
import type { Entity } from "../src/ai/entityFilter.js";

const [corpusPath, llmFullPath, modelPath, limitArg] = process.argv.slice(2);
const limit = limitArg ? parseInt(limitArg, 10) : 10;

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
const llmFull = JSON.parse(readFileSync(llmFullPath, "utf8")).entities_per_repo as Record<
  string,
  Array<{ name: string; label: string }>
>;

const gliner = new GlinerExtractor({ modelPath, threshold: 0.4 });
const provider = createProvider("ollama");
const layered = new LlmNormalizingExtractor(new AliasNormalizingExtractor(gliner), provider);

const nameset = (es: Array<{ name: string }>): Set<string> =>
  new Set(es.map((e) => e.name.trim().toLowerCase()));

const agg: Record<string, { count: number; inter: number; varTotal: number }> = {
  "B gliner-raw": { count: 0, inter: 0, varTotal: 0 },
  "C gliner+alias": { count: 0, inter: 0, varTotal: 0 },
  "D gliner+alias+llm": { count: 0, inter: 0, varTotal: 0 },
};
let refTotal = 0;

const entries = corpus.entries.slice(0, limit);
console.error(`Entity eval: ${entries.length} repos | reference = LLM-full\n`);

for (const e of entries) {
  const input = {
    owner: e.owner,
    name: e.name,
    description: e.description ?? "",
    language: e.language ?? null,
    topics: e.topics ?? [],
    readme: e.readme ?? "",
  };
  const ref = nameset(llmFull[`${e.owner}/${e.name}`] ?? []);
  refTotal += ref.size;

  const raw = await gliner.extract(input);
  const alias = aliasNormalize(raw);
  const deep = await layered.extract(input);

  const variants: Record<string, Entity[]> = {
    "B gliner-raw": raw,
    "C gliner+alias": alias,
    "D gliner+alias+llm": deep,
  };
  for (const [k, ents] of Object.entries(variants)) {
    const ns = nameset(ents);
    agg[k].count += ns.size;
    agg[k].varTotal += ns.size;
    for (const n of ns) if (ref.has(n)) agg[k].inter++;
  }
  console.log(
    `${e.owner}/${e.name}  ref=${ref.size}  B=${raw.length} C=${alias.length} D=${deep.length}`,
  );
}

console.error(`\n${"variant".padEnd(22)} ${"avg/repo".padStart(9)} ${"agree-P".padStart(8)} ${"agree-R".padStart(8)}`);
console.error(`${"A llm-full (ref)".padEnd(22)} ${(refTotal / entries.length).toFixed(1).padStart(9)} ${"1.00".padStart(8)} ${"1.00".padStart(8)}`);
for (const [k, v] of Object.entries(agg)) {
  const p = v.varTotal ? v.inter / v.varTotal : 0;
  const r = refTotal ? v.inter / refTotal : 0;
  console.error(
    `${k.padEnd(22)} ${(v.count / entries.length).toFixed(1).padStart(9)} ${p.toFixed(2).padStart(8)} ${r.toFixed(2).padStart(8)}`,
  );
}
