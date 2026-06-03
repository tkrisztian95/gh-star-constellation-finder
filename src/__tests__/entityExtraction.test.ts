import { parseAnalysisResponse } from "../ai/types.js";
import { coerceEntities, filterEntities, type Entity } from "../ai/entityFilter.js";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function names(entities: Entity[] = []): string {
  return entities.map((e) => `${e.name}:${e.label}`).join(",");
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

  console.log("entityExtraction tests\n");

  // --- parseAnalysisResponse + entities ---
  test("parses entities alongside the three string fields", () => {
    const r = parseAnalysisResponse(
      JSON.stringify({
        category: "Container Tools",
        killerFeature: "Inspect image layers",
        description: "A tool for exploring docker images.",
        entities: [
          { name: "Docker", label: "TOOL" },
          { name: "Go", label: "LANGUAGE" },
        ],
      }),
    );
    assertEqual(r.category, "Container Tools", "category still parsed");
    assertEqual(names(r.entities), "Docker:TOOL,Go:LANGUAGE", "entities parsed");
  });

  test("missing entities field yields [] without failing the analysis", () => {
    const r = parseAnalysisResponse(
      JSON.stringify({ category: "X", killerFeature: "y", description: "z" }),
    );
    assertEqual(r.category, "X", "category parsed");
    assertEqual((r.entities ?? []).length, 0, "entities default to empty");
  });

  test("garbled entities (not an array) does not sink the analysis", () => {
    const r = parseAnalysisResponse(
      JSON.stringify({ category: "X", killerFeature: "y", description: "z", entities: "nope" }),
    );
    assertEqual(r.category, "X", "category still parsed");
    assertEqual((r.entities ?? []).length, 0, "entities empty on garbage");
  });

  test("invalid entity (bad label / empty name) is dropped, valid kept", () => {
    const r = parseAnalysisResponse(
      JSON.stringify({
        category: "X",
        killerFeature: "y",
        description: "z",
        entities: [
          { name: "Rust", label: "LANGUAGE" },
          { name: "Nope", label: "BOGUS" },
          { name: "", label: "TOOL" },
        ],
      }),
    );
    assertEqual(names(r.entities), "Rust:LANGUAGE", "only the valid entity survives");
  });

  // --- filterEntities ---
  test("filter drops license / badge / generic noise", () => {
    const filtered = filterEntities([
      { name: "Apache 2.0", label: "CONCEPT" },
      { name: "badge", label: "TOOL" },
      { name: "library", label: "CONCEPT" },
      { name: "Kubernetes", label: "TOOL" },
    ]);
    assertEqual(names(filtered), "Kubernetes:TOOL", "only the real entity remains");
  });

  test("filter de-duplicates by normalized name+label", () => {
    const filtered = filterEntities([
      { name: "TypeScript", label: "LANGUAGE" },
      { name: "typescript", label: "LANGUAGE" },
    ]);
    assertEqual(filtered.length, 1, "duplicate collapsed");
  });

  test("filter drops URLs and over-long names", () => {
    const filtered = filterEntities([
      { name: "https://img.shields.io/x", label: "TOOL" },
      { name: "x".repeat(60), label: "CONCEPT" },
      { name: "React", label: "FRAMEWORK" },
    ]);
    assertEqual(names(filtered), "React:FRAMEWORK", "only React remains");
  });

  test("coerceEntities validates + filters raw json", () => {
    const out = coerceEntities([
      { name: "Vite", label: "TOOL" },
      { name: "MIT", label: "CONCEPT" }, // license noise
      "garbage",
      { label: "TOOL" }, // missing name
    ]);
    assertEqual(names(out), "Vite:TOOL", "only the valid, non-noise entity survives");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
