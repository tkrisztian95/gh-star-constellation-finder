import { wantsVersion, getVersionText } from "../cli/args.js";
import pkg from "../../package.json" with { type: "json" };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

async function runTests(): Promise<void> {
  console.log("cliArgsVersion.test.ts");

  // --- wantsVersion ---
  assertEqual(wantsVersion([]), false, "empty argv -> false");
  assertEqual(wantsVersion(["--analyze-only"]), false, "non-version argv -> false");
  assertEqual(wantsVersion(["--version"]), true, "--version -> true");
  assertEqual(wantsVersion(["-v"]), true, "-v -> true");
  assertEqual(wantsVersion(["--limit", "5", "--version"]), true, "--version anywhere -> true");
  assertEqual(wantsVersion(["--backend", "openai", "-v"]), true, "-v anywhere -> true");

  // --- getVersionText ---
  const text = getVersionText();
  assert(text.length > 0, "version text is non-empty");
  assert(text.endsWith("\n"), "version text ends with newline");
  assert(text.includes(pkg.name), `version text includes package name (${pkg.name})`);
  assert(text.includes(pkg.version), `version text includes package version (${pkg.version})`);
  assert(text.includes(`v${pkg.version}`), `version text includes "v${pkg.version}"`);

  // The whole point of this fix (mirrors the --help test): version must not
  // require GITHUB_TOKEN. wantsVersion + getVersionText are pure — verify they
  // run with the env var unset.
  const prevToken = process.env["GITHUB_TOKEN"];
  delete process.env["GITHUB_TOKEN"];
  try {
    assertEqual(wantsVersion(["-v"]), true, "wantsVersion works without GITHUB_TOKEN");
    assert(getVersionText().length > 0, "getVersionText works without GITHUB_TOKEN");
  } finally {
    if (prevToken !== undefined) process.env["GITHUB_TOKEN"] = prevToken;
  }

  console.log("  ✓ all cliArgsVersion assertions passed");
}

await runTests();
