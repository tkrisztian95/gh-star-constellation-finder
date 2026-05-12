import path from "path";
import {
  buildDefaultSavePath,
  formatTimestamp,
  sanitizeSegment,
} from "../session/defaultPath.js";

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

  console.log("default-save-path tests\n");

  console.log("  sanitizeSegment");

  test("openai/gpt-4o-mini → openai-gpt-4o-mini", () => {
    assertEqual(sanitizeSegment("openai/gpt-4o-mini"), "openai-gpt-4o-mini", "slash sanitized");
  });

  test("collapses runs of separators", () => {
    assertEqual(sanitizeSegment("foo//bar  baz"), "foo-bar-baz", "runs collapsed");
  });

  test("empty → unknown", () => {
    assertEqual(sanitizeSegment("   "), "unknown", "blank becomes unknown");
  });

  test("preserves dots and underscores", () => {
    assertEqual(sanitizeSegment("claude-3.5_sonnet"), "claude-3.5_sonnet", "dots and underscores");
  });

  test("strips leading and trailing separators", () => {
    assertEqual(sanitizeSegment("--foo--"), "foo", "trimmed");
  });

  console.log("\n  formatTimestamp");

  test("zero-pads each component", () => {
    const stamp = formatTimestamp(new Date("2026-05-12T03:04:05"));
    assertEqual(stamp.length, 15, "format YYYYMMDD-HHMMSS");
    assertEqual(stamp.slice(0, 8), "20260512", "date portion");
    assertEqual(stamp.charAt(8), "-", "separator");
  });

  console.log("\n  buildDefaultSavePath");

  test("joins output/<model>/<filename>", () => {
    const now = new Date("2026-05-12T03:04:05");
    const result = buildDefaultSavePath({ modelId: "openai/gpt-4o-mini", now });
    assertEqual(
      result,
      path.join("output", "openai-gpt-4o-mini", `session-${formatTimestamp(now)}.json`),
      "default path",
    );
  });

  test("respects custom baseDir", () => {
    const now = new Date("2026-05-12T03:04:05");
    const result = buildDefaultSavePath({ modelId: "x", now, baseDir: "out2" });
    assertEqual(result.startsWith(path.join("out2", "x")), true, "custom base used");
  });

  test("falls back to unknown segment for blank modelId", () => {
    const now = new Date("2026-05-12T03:04:05");
    const result = buildDefaultSavePath({ modelId: "", now });
    assertEqual(result, path.join("output", "unknown", `session-${formatTimestamp(now)}.json`), "blank model");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
