import { wantsHelp, getHelpText } from "../cli/args.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

async function runTests(): Promise<void> {
  console.log("cliArgsHelp.test.ts");

  // --- wantsHelp ---
  assertEqual(wantsHelp([]), false, "empty argv -> false");
  assertEqual(wantsHelp(["--analyze-only"]), false, "non-help argv -> false");
  assertEqual(wantsHelp(["--help"]), true, "--help -> true");
  assertEqual(wantsHelp(["-h"]), true, "-h -> true");
  assertEqual(wantsHelp(["--limit", "5", "--help"]), true, "--help anywhere -> true");
  assertEqual(wantsHelp(["--backend", "openai", "-h"]), true, "-h anywhere -> true");

  // --- getHelpText ---
  const help = getHelpText();
  assert(help.length > 0, "help text is non-empty");
  assert(help.includes("Usage:"), "help text includes Usage section");
  assert(help.includes("Options:"), "help text includes Options section");

  // Every documented CLI flag must appear in --help output, or the help is lying.
  const expectedFlags = [
    "--backend",
    "--limit",
    "--concurrency",
    "--analyze-only",
    "--output",
    "--no-cache",
    "--no-analytics",
    "--help",
    "-h",
  ];
  for (const flag of expectedFlags) {
    assert(help.includes(flag), `help text mentions ${flag}`);
  }

  // The whole point of this fix: help must not imply GITHUB_TOKEN is needed
  // to read it. The env-var section can describe it, but the flag itself must
  // be runnable token-less. Smoke-test: wantsHelp + getHelpText executed
  // without touching process.env.
  const prevToken = process.env["GITHUB_TOKEN"];
  delete process.env["GITHUB_TOKEN"];
  try {
    assertEqual(wantsHelp(["--help"]), true, "wantsHelp works without GITHUB_TOKEN");
    assert(getHelpText().length > 0, "getHelpText works without GITHUB_TOKEN");
  } finally {
    if (prevToken !== undefined) process.env["GITHUB_TOKEN"] = prevToken;
  }

  console.log("  ✓ all cliArgsHelp assertions passed");
}

await runTests();
