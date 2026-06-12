import { parseArgs, getHelpText } from "../cli/args.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

/** Run parseArgs with a synthetic argv, restoring the real one after. */
function withArgv<T>(argv: string[], fn: () => T): T {
  const saved = process.argv;
  process.argv = ["bun", "index", ...argv];
  try {
    return fn();
  } finally {
    process.argv = saved;
  }
}

async function runTests(): Promise<void> {
  console.log("cliArgsAsk.test.ts");

  // --- parsing ---
  const parsed = withArgv(["--ask", "which of my stars are rust CLI tools"], parseArgs);
  assertEqual(
    parsed.askQuestion,
    "which of my stars are rust CLI tools",
    "--ask captures the question",
  );

  const none = withArgv(["--analyze-only"], parseArgs);
  assertEqual(none.askQuestion, undefined, "no --ask → undefined");

  const withBackend = withArgv(["--backend", "ollama", "--ask", "q"], parseArgs);
  assertEqual(withBackend.askQuestion, "q", "--ask parsed alongside other flags");
  assertEqual(withBackend.backend, "ollama", "backend still parsed");

  // --- help text documents --ask ---
  const help = getHelpText();
  assert(help.includes("--ask"), "help documents --ask");

  console.log("  ✓ all cliArgsAsk assertions passed");
}

await runTests();
