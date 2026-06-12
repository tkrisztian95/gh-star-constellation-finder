import { createEmbeddingsRetriever } from "../retrieval/embeddingsRetriever.js";
import type { AIProvider } from "../ai/types.js";
import type { CorpusEntry } from "../evals/types.js";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function entry(owner: string, name: string, category: string): CorpusEntry {
  return {
    owner,
    name,
    topics: [],
    category,
    killerFeature: "",
    description: "",
    entities: [],
    isArchived: false,
  };
}

// Deterministic stub: maps text content to a planted vector. Orthogonal unit
// vectors per keyword so cosine ranking is predictable. A "shortdim" query
// returns a 2-d vector to exercise the dimension guard.
function vecFor(text: string): number[] {
  if (text.includes("shortdim")) return [1, 0];
  if (text.includes("alpha")) return [1, 0, 0];
  if (text.includes("beta")) return [0, 1, 0];
  if (text.includes("gamma")) return [0, 0, 1];
  return [0, 0, 0];
}

function stubProvider(): AIProvider {
  return {
    modelId: "stub",
    embedderId: "stub:embed",
    embed: async (texts: string[]) => texts.map(vecFor),
    analyze: async () => ({ category: "", killerFeature: "", description: "" }),
    complete: async () => "{}",
  };
}

async function runTests(): Promise<void> {
  console.log("embeddingsRetriever.test.ts\n");
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

  const corpus = [
    entry("org", "alpha", "alpha tools"),
    entry("org", "beta", "beta tools"),
    entry("org", "gamma", "gamma tools"),
  ];

  await test("ranks the matching repo first", async () => {
    const r = await createEmbeddingsRetriever(corpus, stubProvider());
    const out = await r.search("alpha query", 3);
    assertEqual(out[0], "github.com/org/alpha", "alpha ranked first");
  });

  await test("truncates to k", async () => {
    const r = await createEmbeddingsRetriever(corpus, stubProvider());
    const out = await r.search("beta query", 1);
    assertEqual(out.length, 1, "returns exactly k");
    assertEqual(out[0], "github.com/org/beta", "beta ranked first");
  });

  await test("deterministic tie-break by repo key", async () => {
    // Two entries embed to the same vector ("alpha"); ties break by repo key,
    // so a/alpha precedes z/alpha and the order is stable across runs.
    const tied = [entry("z", "alpha", "alpha"), entry("a", "alpha", "alpha")];
    const r = await createEmbeddingsRetriever(tied, stubProvider());
    const first = await r.search("alpha", 2);
    const second = await r.search("alpha", 2);
    assertEqual(first.join(","), "github.com/a/alpha,github.com/z/alpha", "tie-break by key");
    assertEqual(first.join(","), second.join(","), "stable across runs");
  });

  await test("skips corpus vectors whose dimension differs from the query", async () => {
    const r = await createEmbeddingsRetriever(corpus, stubProvider());
    // Query embeds to a 2-d vector; all corpus vectors are 3-d → all skipped.
    const out = await r.search("shortdim query", 3);
    assertEqual(out.length, 0, "dimension mismatch yields no results");
  });

  await test("empty query embedding yields no results", async () => {
    const provider = stubProvider();
    provider.embed = async () => [];
    const r = await createEmbeddingsRetriever(corpus, provider);
    const out = await r.search("anything", 3);
    assertEqual(out.length, 0, "no query vector → empty");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

await runTests();
