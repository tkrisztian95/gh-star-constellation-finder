import {
  LlmEntityExtractor,
  buildEntityPrompt,
  type EntityExtractionInput,
} from "../ai/entityExtractor.js";
import { coerceEntities, filterEntities, type Entity } from "../ai/entityFilter.js";
import type { AIProvider } from "../ai/types.js";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}
function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}

function names(entities: Entity[] = []): string {
  return entities.map((e) => `${e.name}:${e.label}`).join(",");
}

function mockProvider(complete: () => Promise<string>): AIProvider {
  return {
    modelId: "test",
    embedderId: "test:embed",
    embed: async () => [],
    analyze: async () => ({ category: "", killerFeature: "", description: "" }),
    complete,
  };
}

const INPUT: EntityExtractionInput = {
  owner: "o",
  name: "n",
  description: "d",
  language: "Go",
  topics: [],
  readme: "uses Docker and Go",
};

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;
  async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log("entityExtraction tests\n");

  // --- LlmEntityExtractor ---
  await test("extractor returns entities from the provider's JSON", async () => {
    const ex = new LlmEntityExtractor(
      mockProvider(async () =>
        JSON.stringify({
          entities: [
            { name: "Docker", label: "TOOL" },
            { name: "Go", label: "LANGUAGE" },
          ],
        }),
      ),
    );
    assertEqual(names(await ex.extract(INPUT)), "Docker:TOOL,Go:LANGUAGE", "entities extracted");
  });

  await test("extractor filters license/badge noise from the response", async () => {
    const ex = new LlmEntityExtractor(
      mockProvider(async () =>
        JSON.stringify({
          entities: [
            { name: "Apache 2.0", label: "CONCEPT" },
            { name: "Kubernetes", label: "TOOL" },
          ],
        }),
      ),
    );
    assertEqual(names(await ex.extract(INPUT)), "Kubernetes:TOOL", "only real entity kept");
  });

  await test("extractor returns [] on non-JSON output", async () => {
    const ex = new LlmEntityExtractor(mockProvider(async () => "sorry, here you go!"));
    assertEqual((await ex.extract(INPUT)).length, 0, "garbage -> []");
  });

  await test("extractor returns [] when the provider throws", async () => {
    const ex = new LlmEntityExtractor(
      mockProvider(async () => {
        throw new Error("network");
      }),
    );
    assertEqual((await ex.extract(INPUT)).length, 0, "provider error -> []");
  });

  // --- buildEntityPrompt source switch (#59) ---
  await test("entity-source: readme includes README, description omits it", () => {
    const withReadme = buildEntityPrompt(INPUT, "readme");
    const descOnly = buildEntityPrompt(INPUT, "description");
    assert(withReadme.includes("uses Docker and Go"), "readme source includes README content");
    assert(!descOnly.includes("uses Docker and Go"), "description source omits README content");
    assert(descOnly.includes("Description: d"), "description source keeps metadata");
  });

  // --- filterEntities / coerceEntities ---
  await test("filter drops license / badge / generic noise", () => {
    const filtered = filterEntities([
      { name: "Apache 2.0", label: "CONCEPT" },
      { name: "badge", label: "TOOL" },
      { name: "library", label: "CONCEPT" },
      { name: "Kubernetes", label: "TOOL" },
    ]);
    assertEqual(names(filtered), "Kubernetes:TOOL", "only the real entity remains");
  });

  await test("filter de-duplicates by normalized name+label", () => {
    const filtered = filterEntities([
      { name: "TypeScript", label: "LANGUAGE" },
      { name: "typescript", label: "LANGUAGE" },
    ]);
    assertEqual(filtered.length, 1, "duplicate collapsed");
  });

  await test("filter drops URLs and over-long names", () => {
    const filtered = filterEntities([
      { name: "https://img.shields.io/x", label: "TOOL" },
      { name: "x".repeat(60), label: "CONCEPT" },
      { name: "React", label: "FRAMEWORK" },
    ]);
    assertEqual(names(filtered), "React:FRAMEWORK", "only React remains");
  });

  await test("coerceEntities validates + filters raw json", () => {
    const out = coerceEntities([
      { name: "Vite", label: "TOOL" },
      { name: "MIT", label: "CONCEPT" },
      "garbage",
      { label: "TOOL" },
    ]);
    assertEqual(names(out), "Vite:TOOL", "only the valid, non-noise entity survives");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

await runTests();
