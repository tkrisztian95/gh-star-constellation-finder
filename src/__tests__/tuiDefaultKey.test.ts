import { resolveScopeChoice } from "../components/ScopeScreen.js";
import { resolveStrategyChoice } from "../components/StrategyScreen.js";
import { resolveConfirmChoice } from "../components/ConfirmScreen.js";
import { resolveSummaryConfirmChoice } from "../components/SummaryScreen.js";

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

  console.log("tui-default-key tests\n");

  // --- ScopeScreen: resolveScopeChoice ---

  console.log("  resolveScopeChoice");

  test("Enter (key.return) → all (default)", () => {
    assertEqual(resolveScopeChoice("", true), "all", "Enter selects default scope");
  });

  test("Enter delivered as carriage-return → all", () => {
    assertEqual(resolveScopeChoice("\r", true), "all", String.raw`Enter as \r`);
  });

  test('key "1" → all', () => {
    assertEqual(resolveScopeChoice("1", false), "all", "digit 1");
  });

  test('key "2" → unlisted-only', () => {
    assertEqual(resolveScopeChoice("2", false), "unlisted-only", "digit 2");
  });

  test("unrecognised key → null", () => {
    assertEqual(resolveScopeChoice("q", false), null, "unknown key");
  });

  // --- StrategyScreen: resolveStrategyChoice ---

  console.log("\n  resolveStrategyChoice (hasLists = true)");

  test("Enter (key.return) → keep-existing (default)", () => {
    assertEqual(
      resolveStrategyChoice("", true, true),
      "keep-existing",
      "Enter selects default strategy",
    );
  });

  test("Enter delivered as carriage-return → keep-existing", () => {
    assertEqual(resolveStrategyChoice("\r", true, true), "keep-existing", String.raw`Enter as \r`);
  });

  test('key "1" → keep-existing', () => {
    assertEqual(resolveStrategyChoice("1", false, true), "keep-existing", "digit 1");
  });

  test('key "2" → recreate', () => {
    assertEqual(resolveStrategyChoice("2", false, true), "recreate", "digit 2");
  });

  test('key "3" → allow-rename', () => {
    assertEqual(resolveStrategyChoice("3", false, true), "allow-rename", "digit 3");
  });

  test("unrecognised key → null", () => {
    assertEqual(resolveStrategyChoice("q", false, true), null, "unknown key");
  });

  console.log("\n  resolveStrategyChoice (hasLists = false)");

  test("Enter still selects keep-existing when no lists exist", () => {
    assertEqual(
      resolveStrategyChoice("", true, false),
      "keep-existing",
      "Enter with no lists → keep-existing",
    );
  });

  test('key "2" → null when no lists (recreate unavailable)', () => {
    assertEqual(resolveStrategyChoice("2", false, false), null, "digit 2 unavailable");
  });

  test('key "3" → null when no lists (allow-rename unavailable)', () => {
    assertEqual(resolveStrategyChoice("3", false, false), null, "digit 3 unavailable");
  });

  // --- ConfirmScreen: resolveConfirmChoice ---

  console.log("\n  resolveConfirmChoice");

  test("Enter (key.return) → false (default N)", () => {
    assertEqual(resolveConfirmChoice("", true), false, "Enter selects default no");
  });

  test("Enter delivered as carriage-return → false", () => {
    assertEqual(resolveConfirmChoice("\r", true), false, String.raw`Enter as \r`);
  });

  test('key "y" → true', () => {
    assertEqual(resolveConfirmChoice("y", false), true, "y → confirm");
  });

  test('key "Y" → true', () => {
    assertEqual(resolveConfirmChoice("Y", false), true, "uppercase Y → confirm");
  });

  test('key "n" → false', () => {
    assertEqual(resolveConfirmChoice("n", false), false, "n → reject");
  });

  test('key "N" → false', () => {
    assertEqual(resolveConfirmChoice("N", false), false, "uppercase N → reject");
  });

  test("unrecognised key → null", () => {
    assertEqual(resolveConfirmChoice("q", false), null, "unknown key");
  });

  // --- SummaryScreen: resolveSummaryConfirmChoice ---

  console.log("\n  resolveSummaryConfirmChoice");

  test("Enter (key.return) → false (default N)", () => {
    assertEqual(resolveSummaryConfirmChoice("", true), false, "Enter selects default no");
  });

  test("Enter delivered as carriage-return → false", () => {
    assertEqual(resolveSummaryConfirmChoice("\r", true), false, String.raw`Enter as \r`);
  });

  test('key "y" → true', () => {
    assertEqual(resolveSummaryConfirmChoice("y", false), true, "y → confirm");
  });

  test('key "n" → false', () => {
    assertEqual(resolveSummaryConfirmChoice("n", false), false, "n → reject");
  });

  test("unrecognised key → null", () => {
    assertEqual(resolveSummaryConfirmChoice("q", false), null, "unknown key");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
