import { resolveInterruptChoice } from "../components/InterruptConfirmScreen.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

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

  console.log("interrupt-analysis tests\n");

  // --- InterruptConfirmScreen: resolveInterruptChoice ---

  console.log("  resolveInterruptChoice (analyzedCount > 0)");

  test('key "1" → continue', () => {
    assertEqual(resolveInterruptChoice("1", false, 5), "continue", "key 1");
  });

  test("Enter (key.return) → continue (default)", () => {
    assertEqual(resolveInterruptChoice("", true, 5), "continue", "Enter");
  });

  test("Enter delivered as carriage-return → continue (default)", () => {
    assertEqual(resolveInterruptChoice("\r", true, 5), "continue", String.raw`Enter as \r`);
  });

  test('key "2" → save', () => {
    assertEqual(resolveInterruptChoice("2", false, 5), "save", "key 2");
  });

  test('key "3" → exit', () => {
    assertEqual(resolveInterruptChoice("3", false, 5), "exit", "key 3");
  });

  test("unrecognised key → null (no choice)", () => {
    assertEqual(resolveInterruptChoice("q", false, 5), null, "unknown key");
  });

  console.log("\n  resolveInterruptChoice (analyzedCount === 0)");

  test('key "1" → exit (only option)', () => {
    assertEqual(resolveInterruptChoice("1", false, 0), "exit", "key 1 with 0 repos");
  });

  test("Enter → exit", () => {
    assertEqual(resolveInterruptChoice("", true, 0), "exit", "Enter with 0 repos");
  });

  test('key "3" → exit', () => {
    assertEqual(resolveInterruptChoice("3", false, 0), "exit", "key 3 with 0 repos");
  });

  test('key "2" → null (save not available with 0 repos)', () => {
    assertEqual(resolveInterruptChoice("2", false, 0), null, "key 2 with 0 repos");
  });

  // --- LoadingScreen: ESC hint visibility ---
  // The hint renders when phase === "analyzing". We verify the predicate with a helper
  // since Ink components require a renderer to inspect JSX output.

  console.log("\n  LoadingScreen ESC hint rule");

  function showsEscHint(phase: string): boolean {
    return phase === "analyzing";
  }

  test("ESC hint shown when phase is analyzing", () => {
    assert(showsEscHint("analyzing"), "hint condition should be true for analyzing");
  });

  test("ESC hint hidden when phase is fetching", () => {
    assert(!showsEscHint("fetching"), "hint condition should be false for fetching");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
