import { buildCorpusFile, corpusFileSchema, toCorpusEntry } from "../corpus/exportCorpus.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import type { Repo } from "../types.js";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function makeRepo(over: Partial<Repo> = {}): Repo {
  return {
    id: "R_1",
    name: "deno",
    owner: "denoland",
    description: "A modern runtime",
    language: "TypeScript",
    stargazerCount: 1,
    topics: ["typescript", "runtime"],
    listIds: [],
    isArchived: false,
    ...over,
  };
}

function makeAnalyzed(over: Partial<AnalyzedRepo> = {}): AnalyzedRepo {
  return {
    repo: makeRepo(),
    analysis: {
      category: "JavaScript Runtime",
      killerFeature: "Secure by default",
      description: "A secure TypeScript/JavaScript runtime.",
      entities: [{ name: "TypeScript", label: "LANGUAGE" }],
    },
    ...over,
  };
}

function runTests() {
  let passed = 0;
  let failed = 0;
  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  test("toCorpusEntry maps repo identity + analysis", () => {
    const e = toCorpusEntry(makeAnalyzed());
    assertEqual(e.owner, "denoland", "owner");
    assertEqual(e.name, "deno", "name");
    assertEqual(e.category, "JavaScript Runtime", "category");
    assertEqual(e.killerFeature, "Secure by default", "killerFeature");
    assertEqual(e.description, "A secure TypeScript/JavaScript runtime.", "description");
    assertEqual(e.isArchived, false, "isArchived");
    assertEqual(e.topics.join(","), "typescript,runtime", "topics");
    assertEqual(
      (e.entities ?? []).map((x) => `${x.name}:${x.label}`).join(","),
      "TypeScript:LANGUAGE",
      "entities carried into the corpus",
    );
  });

  test("entities default to [] when analysis has none", () => {
    const e = toCorpusEntry(
      makeAnalyzed({ analysis: { category: "X", killerFeature: "", description: "" } }),
    );
    assertEqual((e.entities ?? []).length, 0, "entities default empty");
  });

  test("missing topics fall back to empty array", () => {
    const analyzed = makeAnalyzed({ repo: makeRepo({ topics: undefined as unknown as string[] }) });
    const e = toCorpusEntry(analyzed);
    assertEqual(e.topics.length, 0, "topics empty");
  });

  test("buildCorpusFile attaches meta and validates against the contract schema", () => {
    const file = buildCorpusFile([makeAnalyzed()], "ollama/llama3", "2026-01-01T00:00:00.000Z");
    assertEqual(file.meta.model, "ollama/llama3", "meta.model");
    assertEqual(file.meta.generatedAt, "2026-01-01T00:00:00.000Z", "meta.generatedAt");
    assertEqual(file.entries.length, 1, "entry count");
    // Must satisfy the frozen contract shape.
    corpusFileSchema.parse(file);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
