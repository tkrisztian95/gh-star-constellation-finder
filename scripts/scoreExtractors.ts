/**
 * Score entity extractors against the consensus goldset (real precision/recall).
 *
 *   OLLAMA_MODEL=llama3 bun run scripts/scoreExtractors.ts <goldset.json> <corpus_readme.json> <model.onnx> [limit]
 *
 * Variants: LLM (default) | GLiNER | GLiNER+alias | GLiNER+alias+LLM (hybrid).
 * Metrics are micro-averaged across repos, both name-only (identity) and
 * name+label (full correctness).
 */
import { readFileSync } from "node:fs";

import { GlinerExtractor } from "../src/ai/glinerExtractor.js";
import { aliasNormalize } from "../src/ai/aliasMap.js";
import { LlmEntityExtractor } from "../src/ai/entityExtractor.js";
import { LlmNormalizingExtractor } from "../src/ai/entityNormalizer.js";
import { createProvider } from "../src/ai/index.js";
import type { Entity } from "../src/ai/entityFilter.js";

const [goldPath, corpusPath, modelPath, limitArg] = process.argv.slice(2);
const limit = limitArg ? parseInt(limitArg, 10) : 0;

const gold = JSON.parse(readFileSync(goldPath, "utf8")).entities_per_repo as Record<
  string,
  Array<{ name: string; label: string }>
>;
const corpus = JSON.parse(readFileSync(corpusPath, "utf8")).entries as Array<{
  owner: string;
  name: string;
  description?: string;
  killerFeature?: string;
  readme?: string;
  language?: string | null;
  topics?: string[];
}>;

const gliner = new GlinerExtractor({ modelPath, threshold: 0.4 });
const provider = createProvider("ollama");
const llm = new LlmEntityExtractor(provider);
// hybrid = LLM-normalize over a fixed candidate list (GLiNER+alias output per repo)
const hybridFor = (candidates: Entity[]) =>
  new LlmNormalizingExtractor({ extract: async () => candidates }, provider);

type Acc = { tpN: number; tpNL: number; pred: number; gold: number };
const variants = ["LLM", "GLiNER", "GLiNER+alias", "hybrid"] as const;
const acc: Record<string, Acc> = Object.fromEntries(
  variants.map((v) => [v, { tpN: 0, tpNL: 0, pred: 0, gold: 0 }]),
) as Record<string, Acc>;

const nkey = (e: { name: string }) => e.name.trim().toLowerCase();
const nlkey = (e: { name: string; label: string }) => `${e.name.trim().toLowerCase()}|${e.label}`;

function score(variant: string, pred: Entity[], goldEnts: Array<{ name: string; label: string }>) {
  const gN = new Set(goldEnts.map(nkey));
  const gNL = new Set(goldEnts.map(nlkey));
  const a = acc[variant];
  a.pred += pred.length;
  a.gold += goldEnts.length;
  const seenN = new Set<string>();
  for (const e of pred) {
    if (gN.has(nkey(e)) && !seenN.has(nkey(e))) a.tpN++;
    if (gNL.has(nlkey(e))) a.tpNL++;
    seenN.add(nkey(e));
  }
}

let entries = corpus.filter((e) => gold[`${e.owner}/${e.name}`]);
if (limit) entries = entries.slice(0, limit);
console.error(`Scoring ${entries.length} repos against goldset...\n`);

let i = 0;
for (const e of entries) {
  i++;
  const input = {
    owner: e.owner,
    name: e.name,
    description: e.description ?? "",
    language: e.language ?? null,
    topics: e.topics ?? [],
    readme: e.readme ?? "",
  };
  const g = gold[`${e.owner}/${e.name}`];

  const glinerOut = await gliner.extract(input);
  const aliasOut = aliasNormalize(glinerOut);
  const [llmOut, hybridOut] = await Promise.all([
    llm.extract(input),
    hybridFor(aliasOut).extract(input),
  ]);

  score("LLM", llmOut, g);
  score("GLiNER", glinerOut, g);
  score("GLiNER+alias", aliasOut, g);
  score("hybrid", hybridOut as Entity[], g);
  if (i % 20 === 0) console.error(`  ${i}/${entries.length}`);
}

function prf(tp: number, pred: number, gold: number) {
  const p = pred ? tp / pred : 0;
  const r = gold ? tp / gold : 0;
  const f = p + r ? (2 * p * r) / (p + r) : 0;
  return [p, r, f];
}

console.error(`\n${"variant".padEnd(14)} ${"P".padStart(6)} ${"R".padStart(6)} ${"F1".padStart(6)}   (name-only)   |  name+label F1`);
for (const v of variants) {
  const a = acc[v];
  const [p, r, f] = prf(a.tpN, a.pred, a.gold);
  const [, , fNL] = prf(a.tpNL, a.pred, a.gold);
  console.error(
    `${v.padEnd(14)} ${p.toFixed(2).padStart(6)} ${r.toFixed(2).padStart(6)} ${f.toFixed(2).padStart(6)}                |  ${fNL.toFixed(2)}`,
  );
}
