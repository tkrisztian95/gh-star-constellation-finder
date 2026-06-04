/**
 * Distill a consensus entity golden set from multiple models' outputs.
 *
 * Reads evals/goldset-bakeoff/outputs/<model>.json for each model (claude,
 * chatgpt, gemma by default), where each file is:
 *   { "owner/name": [ {"name","label"}, ... ], ... }
 *
 * Produces:
 *   - goldset.json  — per repo, entities present in >= majority of models
 *   - prints an agreement report (per-model counts, pairwise Jaccard, consensus)
 *
 *   bun run evals/goldset-bakeoff/distill.ts [model1 model2 ...]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Self-contained (no src import) so the kit works regardless of branch/merge order.
interface Entity {
  name: string;
  label: string;
}
const LABELS = new Set(["LANGUAGE", "FRAMEWORK", "TOOL", "CONCEPT", "ORG", "PERSON", "DOMAIN"]);
const STOPWORDS = new Set([
  "library",
  "framework",
  "tool",
  "api",
  "sdk",
  "web",
  "data",
  "code",
  "license",
  "mit",
  "apache 2.0",
  "badge",
  "ci",
  "developers",
  "community",
]);

/** Validate + lightly clean a model's raw entities array. */
function coerceEntities(raw: unknown): Entity[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Entity[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as Record<string, unknown>).name ?? "").trim();
    const label = String((item as Record<string, unknown>).label ?? "").trim().toUpperCase();
    if (!name || name.length > 40 || !LABELS.has(label)) continue;
    const key = name.toLowerCase();
    if (STOPWORDS.has(key) || /^https?:\/\//.test(name) || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, label });
  }
  return out;
}

const here = dirname(fileURLToPath(import.meta.url));
const models = process.argv.slice(2).length ? process.argv.slice(2) : ["claude", "chatgpt", "gemini"];

type ModelOutput = Record<string, Entity[]>;

// Merge all of a model's files: outputs/<model>.json AND batch files
// outputs/<model>-1.json, <model>-2.json, ... (so multi-batch runs need no
// manual stitching — just save each batch reply as its own file).
function loadModel(name: string): ModelOutput | null {
  const dir = join(here, "outputs");
  if (!existsSync(dir)) return null;
  const re = new RegExp(`^${name}(-\\d+)?\\.json$`);
  const files = readdirSync(dir).filter((f) => re.test(f)).sort();
  if (files.length === 0) return null;
  const out: ModelOutput = {};
  for (const file of files) {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>;
    } catch (e) {
      console.error(`  ⚠️  skipping ${file}: invalid JSON (${e instanceof Error ? e.message : e})`);
      continue;
    }
    for (const [repo, ents] of Object.entries(raw)) {
      const merged = [...(out[repo] ?? []), ...coerceEntities(ents)];
      // de-dupe by name+label across batches
      const seen = new Set<string>();
      out[repo] = merged.filter((e) => {
        const k = `${e.name.toLowerCase()}|${e.label}`;
        return seen.has(k) ? false : (seen.add(k), true);
      });
    }
  }
  return out;
}

const loaded = models.map((m) => ({ name: m, data: loadModel(m) })).filter((m) => m.data);
if (loaded.length === 0) {
  console.error("No model outputs found in outputs/. Add <model>.json files first.");
  process.exit(1);
}
console.error(`Models present: ${loaded.map((m) => m.name).join(", ")}\n`);

const norm = (s: string) => s.trim().toLowerCase();
const repos = [...new Set(loaded.flatMap((m) => Object.keys(m.data!)))].sort();
const majority = Math.ceil(loaded.length / 2); // >=2 of 3, or all of <=2

const goldset: Record<string, Array<{ name: string; label: string; votes: number }>> = {};
let consensusTotal = 0;

for (const repo of repos) {
  // votes per normalized name; track surface forms + labels for display
  const votes = new Map<string, { count: number; names: Record<string, number>; labels: Record<string, number> }>();
  for (const m of loaded) {
    const seen = new Set<string>();
    for (const e of m.data![repo] ?? []) {
      const k = norm(e.name);
      if (seen.has(k)) continue; // one vote per model per entity
      seen.add(k);
      const v = votes.get(k) ?? { count: 0, names: {}, labels: {} };
      v.count++;
      v.names[e.name] = (v.names[e.name] ?? 0) + 1;
      v.labels[e.label] = (v.labels[e.label] ?? 0) + 1;
      votes.set(k, v);
    }
  }
  const top = <T extends string>(rec: Record<T, number>): T =>
    (Object.entries(rec) as [T, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const chosen = [...votes.values()]
    .filter((v) => v.count >= majority)
    .map((v) => ({ name: top(v.names), label: top(v.labels), votes: v.count }))
    .sort((a, b) => b.votes - a.votes);
  goldset[repo] = chosen;
  consensusTotal += chosen.length;
}

writeFileSync(join(here, "goldset.json"), JSON.stringify({ models: loaded.map((m) => m.name), majority, entities_per_repo: goldset }, null, 2) + "\n");

// ---- report ----
const nameset = (es: Entity[] = []) => new Set(es.map((e) => norm(e.name)));
function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 1;
}
console.error(`repos: ${repos.length} | majority threshold: ${majority}\n`);
console.error("per-model avg entities/repo:");
for (const m of loaded) {
  const total = repos.reduce((s, r) => s + (m.data![r]?.length ?? 0), 0);
  console.error(`  ${m.name.padEnd(10)} ${(total / repos.length).toFixed(1)}`);
}
console.error("\npairwise agreement (Jaccard, by entity name):");
for (let i = 0; i < loaded.length; i++)
  for (let j = i + 1; j < loaded.length; j++) {
    const js = repos.map((r) => jaccard(nameset(loaded[i].data![r]), nameset(loaded[j].data![r])));
    const avg = js.reduce((a, b) => a + b, 0) / js.length;
    console.error(`  ${loaded[i].name} vs ${loaded[j].name}: ${avg.toFixed(2)}`);
  }
console.error(`\nconsensus goldset: ${consensusTotal} entities, avg ${(consensusTotal / repos.length).toFixed(1)}/repo -> goldset.json`);
