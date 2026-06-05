import { parseAnalysisResponse } from "../ai/types.js";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
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

  console.log("analysisParser tests\n");

  test("full response parses category, killerFeature, and description", () => {
    const result = parseAnalysisResponse(
      JSON.stringify({
        category: "CLI Tools",
        killerFeature: "Search files fast",
        description: "A Rust command-line tool that searches file contents using regexes.",
      }),
    );
    assertEqual(result.category, "CLI Tools", "category parsed");
    assertEqual(result.killerFeature, "Search files fast", "killerFeature parsed");
    assertEqual(
      result.description,
      "A Rust command-line tool that searches file contents using regexes.",
      "description parsed",
    );
  });

  test("response omitting description defaults to empty string", () => {
    const result = parseAnalysisResponse(
      JSON.stringify({ category: "CLI Tools", killerFeature: "Search files fast" }),
    );
    assertEqual(result.category, "CLI Tools", "category parsed");
    assertEqual(result.description, "", "description falls back to empty string");
  });

  test("lenient fallback (non-string category) still yields description empty string", () => {
    // category is a number → schema.parse throws → lenient branch → final fallback path.
    const result = parseAnalysisResponse(JSON.stringify({ category: 42, killerFeature: "x" }));
    assertEqual(result.description, "", "description empty in fallback path");
  });

  test("malformed (non-JSON) response yields empty description", () => {
    const result = parseAnalysisResponse("Rust CLI Tools");
    assertEqual(result.category, "Rust CLI Tools", "category falls back to trimmed content");
    assertEqual(result.killerFeature, "", "killerFeature empty on malformed input");
    assertEqual(result.description, "", "description empty on malformed input");
  });

  test("JSON-blob / overlong content does not leak into category", () => {
    const blob = parseAnalysisResponse('{"foo": "bar", "data": [1,2,3]}');
    assertEqual(blob.category, "analysis-failed", "JSON blob → fallback, not raw content");
    const longText = parseAnalysisResponse("x".repeat(200));
    assertEqual(longText.category, "analysis-failed", "overlong content → fallback");
    // a normal short label is still kept
    assertEqual(
      parseAnalysisResponse("Vector Databases").category,
      "Vector Databases",
      "short label kept",
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
