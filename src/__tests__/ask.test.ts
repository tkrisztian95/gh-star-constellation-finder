import { answerQuestion } from "../orchestration/ask.js";
import type { AIProvider } from "../ai/types.js";
import type { RetrievedRepo } from "../retrieval/cacheRetriever.js";

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function providerReturning(content: string): AIProvider {
  return {
    modelId: "stub",
    embedderId: "stub:embed",
    embed: async () => [],
    analyze: async () => ({ category: "", killerFeature: "", description: "" }),
    complete: async () => content,
  };
}

const RETRIEVED: RetrievedRepo[] = [
  { url: "github.com/a/one", doc: "one doc", score: 0.9 },
  { url: "github.com/b/two", doc: "two doc", score: 0.5 },
];

async function runTests(): Promise<void> {
  console.log("ask.test.ts\n");
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

  await test("citations are intersected with retrieved — hallucinated URL dropped", async () => {
    const provider = providerReturning(
      JSON.stringify({
        answer: "Use one.",
        citations: ["github.com/a/one", "github.com/evil/hallucinated"],
      }),
    );
    const out = await answerQuestion("q", RETRIEVED, provider);
    assertEqual(out.citations.join(","), "github.com/a/one", "only retrieved URL survives");
    assertEqual(out.answer, "Use one.", "answer passed through");
  });

  await test("citations normalized across URL forms", async () => {
    const provider = providerReturning(
      JSON.stringify({ answer: "x", citations: ["https://github.com/B/Two/"] }),
    );
    const out = await answerQuestion("q", RETRIEVED, provider);
    assertEqual(out.citations.join(","), "github.com/b/two", "matched despite scheme/case/slash");
  });

  await test("no retrieved repos → declines, empty citations, no provider call", async () => {
    let called = false;
    const provider = providerReturning("{}");
    provider.complete = async () => {
      called = true;
      return "{}";
    };
    const out = await answerQuestion("q", [], provider);
    assertEqual(out.citations.length, 0, "no citations");
    assert(!called, "provider not called when nothing retrieved");
    assert(out.answer.toLowerCase().includes("match"), "declines clearly");
  });

  await test("malformed model output → graceful fallback to raw text", async () => {
    const provider = providerReturning("not json at all");
    const out = await answerQuestion("q", RETRIEVED, provider);
    assertEqual(out.answer, "not json at all", "raw text surfaced");
    assertEqual(out.citations.length, 0, "no citations on parse failure");
  });

  await test("answer with no relevant repos returns empty citations", async () => {
    const provider = providerReturning(
      JSON.stringify({ answer: "None of your stars match.", citations: [] }),
    );
    const out = await answerQuestion("q", RETRIEVED, provider);
    assertEqual(out.citations.length, 0, "empty citations preserved");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

await runTests();
