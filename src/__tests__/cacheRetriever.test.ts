import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadCache } from "../cache/analysisCache.js";
import { createCacheRetriever } from "../retrieval/cacheRetriever.js";
import type { AIProvider } from "../ai/types.js";

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "cacheret-test-"));
  return fn(dir).finally(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });
}

// Planted-vector provider: maps query text to a vector and counts query embeds.
function makeProvider(embedderId: string, vecFor: (t: string) => number[]) {
  let embedCalls = 0;
  const provider: AIProvider = {
    modelId: "stub",
    embedderId,
    embed: async (texts: string[]) => {
      embedCalls++;
      return texts.map(vecFor);
    },
    analyze: async () => ({ category: "", killerFeature: "", description: "" }),
    complete: async () => "{}",
  };
  return { provider, embeds: () => embedCalls };
}

async function runTests(): Promise<void> {
  console.log("cacheRetriever.test.ts\n");
  let passed = 0;
  let failed = 0;
  async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      passed++;
      console.log(`  ok   ${name}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL ${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const EID = "stub:embed";
  // Orthogonal unit vectors per keyword.
  const vecFor = (t: string): number[] => {
    if (t.includes("alpha")) return [1, 0, 0];
    if (t.includes("beta")) return [0, 1, 0];
    if (t.includes("gamma")) return [0, 0, 1];
    return [0, 0, 0];
  };

  async function seed(dir: string): Promise<Awaited<ReturnType<typeof loadCache>>> {
    const cache = await loadCache(join(dir, "analysis.db"));
    await cache.saveEmbedding("n-a", [1, 0, 0], EID, "org", "alpha", "alpha widget");
    await cache.saveEmbedding("n-b", [0, 1, 0], EID, "org", "beta", "beta gadget");
    await cache.saveEmbedding("n-c", [0, 0, 1], EID, "org", "gamma", "gamma gizmo");
    return cache;
  }

  await test("embeds only the query — one call, no corpus re-embed", async () => {
    await withTempDir(async (dir) => {
      const cache = await seed(dir);
      const { provider, embeds } = makeProvider(EID, vecFor);
      const r = createCacheRetriever(cache, provider);
      assertEqual(embeds(), 0, "no embed at construction (vectors come from cache)");
      await r.search("alpha", 3);
      assertEqual(embeds(), 1, "exactly one embed (the query)");
    });
  });

  await test("ranks the matching repo first", async () => {
    await withTempDir(async (dir) => {
      const cache = await seed(dir);
      const { provider } = makeProvider(EID, vecFor);
      const r = createCacheRetriever(cache, provider);
      const hits = await r.search("alpha widget", 3);
      assertEqual(hits[0]!.url, "github.com/org/alpha", "alpha first");
      assert(hits[0]!.doc.includes("alpha"), "carries doc for grounding");
    });
  });

  await test("truncates to k", async () => {
    await withTempDir(async (dir) => {
      const cache = await seed(dir);
      const { provider } = makeProvider(EID, vecFor);
      const r = createCacheRetriever(cache, provider);
      const hits = await r.search("beta", 1);
      assertEqual(hits.length, 1, "exactly k");
      assertEqual(hits[0]!.url, "github.com/org/beta", "beta first");
    });
  });

  await test("excludes stale vectors from another embedder", async () => {
    await withTempDir(async (dir) => {
      const cache = await seed(dir);
      // Active embedder differs from the one the cache was populated with.
      const { provider } = makeProvider("other:embed", vecFor);
      const r = createCacheRetriever(cache, provider);
      assertEqual(r.size, 0, "no vectors for the active embedder");
      assertEqual((await r.search("alpha", 3)).length, 0, "stale embedder → empty");
    });
  });

  await test("empty cache yields empty result without throwing", async () => {
    await withTempDir(async (dir) => {
      const cache = await loadCache(join(dir, "analysis.db"));
      const { provider, embeds } = makeProvider(EID, vecFor);
      const r = createCacheRetriever(cache, provider);
      assertEqual(r.size, 0, "no rows");
      assertEqual((await r.search("alpha", 3)).length, 0, "empty result");
      assertEqual(embeds(), 0, "no embed when there is nothing to rank");
    });
  });

  await test("deterministic tie-break by repo key", async () => {
    await withTempDir(async (dir) => {
      const cache = await loadCache(join(dir, "analysis.db"));
      // Two repos with the same vector + doc → ties break by repo key.
      await cache.saveEmbedding("n-z", [1, 0, 0], EID, "z", "alpha", "alpha");
      await cache.saveEmbedding("n-a", [1, 0, 0], EID, "a", "alpha", "alpha");
      const { provider } = makeProvider(EID, vecFor);
      const r = createCacheRetriever(cache, provider);
      const first = (await r.search("alpha", 2)).map((h) => h.url);
      const second = (await r.search("alpha", 2)).map((h) => h.url);
      assertEqual(first.join(","), "github.com/a/alpha,github.com/z/alpha", "tie-break by key");
      assertEqual(first.join(","), second.join(","), "stable across runs");
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

await runTests();
