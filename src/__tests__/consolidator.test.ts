import {
  buildMergeWarnings,
  chunkProposedNames,
  enforcebudget,
} from "../ai/consolidatorDelegator.js";
import {
  consolidateCategories,
  rerouteOrphanRepos,
} from "../orchestration/consolidationCoordinator.js";
import type { AIProvider } from "../ai/types.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function makeThrowingProvider(): AIProvider {
  return {
    modelId: "mock-throwing",
    analyze: async () => {
      throw new Error("mock provider error");
    },
    complete: async () => {
      throw new Error("mock provider error");
    },
  };
}

function makeRecordingProvider(responses: string[]): AIProvider & { calls: string[] } {
  const calls: string[] = [];
  let idx = 0;
  return {
    modelId: "mock-recording",
    calls,
    analyze: async () => ({ category: "Test", killerFeature: "" }),
    complete: async (prompt: string) => {
      calls.push(prompt);
      const response = responses[idx] ?? "{}";
      idx++;
      return response;
    },
  };
}

function makeAnalyzedRepo(category: string, name = "repo"): AnalyzedRepo {
  return {
    repo: {
      id: name,
      name,
      owner: "owner",
      description: "a repo",
      language: "TypeScript",
      topics: ["ts"],
      stargazerCount: 1,
      listIds: [],
      isArchived: false,
    },
    analysis: { category, killerFeature: "does stuff" },
  };
}

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        () => {
          console.log(`  ✓ ${name}`);
          passed++;
        },
        (err: unknown) => {
          console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
          failed++;
        },
      );
    }
    try {
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
    return Promise.resolve();
  }

  console.log("consolidator tests\n");

  const tests: Promise<void>[] = [];

  // --- chunkProposedNames ---

  tests.push(
    test("chunkProposedNames: empty input returns empty array", () => {
      const out = chunkProposedNames([], 25);
      assertEqual(out.length, 0, "no chunks for empty input");
    }),
  );

  tests.push(
    test("chunkProposedNames: single chunk when under size", () => {
      const names = ["A", "B", "C"];
      const out = chunkProposedNames(names, 25);
      assertEqual(out.length, 1, "one chunk");
      assertEqual(out[0].length, 3, "all 3 names in the single chunk");
    }),
  );

  tests.push(
    test("chunkProposedNames: exact multiple splits evenly", () => {
      const names = Array.from({ length: 50 }, (_, i) => `N${i}`);
      const out = chunkProposedNames(names, 25);
      assertEqual(out.length, 2, "two chunks");
      assertEqual(out[0].length, 25, "first chunk full");
      assertEqual(out[1].length, 25, "second chunk full");
    }),
  );

  tests.push(
    test("chunkProposedNames: last chunk is partial when not a multiple", () => {
      const names = Array.from({ length: 60 }, (_, i) => `N${i}`);
      const out = chunkProposedNames(names, 25);
      assertEqual(out.length, 3, "three chunks");
      assertEqual(out[0].length, 25, "first chunk full");
      assertEqual(out[1].length, 25, "second chunk full");
      assertEqual(out[2].length, 10, "last chunk holds remainder");
    }),
  );

  // --- buildMergeWarnings ---

  tests.push(
    test("buildMergeWarnings: no warnings when all names unchanged", () => {
      const remapping = new Map([
        ["CLI Tools", "CLI Tools"],
        ["Vector Databases", "Vector Databases"],
      ]);
      const warnings = buildMergeWarnings(remapping, ["CLI Tools", "Vector Databases"]);
      assertEqual(warnings.length, 0, "should have no warnings");
    }),
  );

  tests.push(
    test("buildMergeWarnings: warning for each remapped name", () => {
      const remapping = new Map([
        ["Rust CLI", "CLI Tools"],
        ["Go CLI", "CLI Tools"],
        ["GraphQL", "GraphQL"],
      ]);
      const warnings = buildMergeWarnings(remapping, ["Rust CLI", "Go CLI", "GraphQL"]);
      assertEqual(warnings.length, 2, "two names were merged");
      assert(warnings[0].includes('"Rust CLI"'), "first warning mentions original name");
      assert(warnings[0].includes('"CLI Tools"'), "first warning mentions canonical name");
    }),
  );

  // --- enforcebudget ---

  tests.push(
    test("enforcebudget: no-op when within budget", () => {
      const remapping = new Map([
        ["A", "Alpha"],
        ["B", "Beta"],
      ]);
      const existing = new Set<string>();
      const { remapping: out, extraWarnings } = enforcebudget(remapping, ["A", "B"], existing, 5);
      assertEqual(out.get("A"), "Alpha", "A unchanged");
      assertEqual(out.get("B"), "Beta", "B unchanged");
      assertEqual(extraWarnings.length, 0, "no extra warnings");
    }),
  );

  tests.push(
    test("enforcebudget: merges excess groups into largest when over budget", () => {
      // 3 groups but budget is 1 — all must collapse into the largest
      const remapping = new Map([
        ["A1", "Alpha"],
        ["A2", "Alpha"],
        ["A3", "Alpha"], // 3 in Alpha (largest)
        ["B1", "Beta"], // 1 in Beta
        ["C1", "Gamma"], // 1 in Gamma
      ]);
      const existing = new Set<string>();
      const { remapping: out, extraWarnings } = enforcebudget(
        remapping,
        ["A1", "A2", "A3", "B1", "C1"],
        existing,
        1,
      );
      // Alpha is the winner (largest group)
      assertEqual(out.get("B1"), "Alpha", "Beta merged into Alpha");
      assertEqual(out.get("C1"), "Alpha", "Gamma merged into Alpha");
      assertEqual(out.get("A1"), "Alpha", "Alpha unchanged");
      assert(extraWarnings.length >= 2, "extra warnings for B1 and C1");
    }),
  );

  tests.push(
    test("enforcebudget: skips names that already map to existing lists", () => {
      // B maps to an existing list — should not count toward new budget
      const remapping = new Map([
        ["A", "New List"],
        ["B", "Existing List"],
      ]);
      const existing = new Set(["existing list"]); // lowercase
      const { remapping: out, extraWarnings } = enforcebudget(remapping, ["A", "B"], existing, 1);
      assertEqual(out.get("A"), "New List", "A maps to new list");
      assertEqual(out.get("B"), "Existing List", "B preserved as existing");
      assertEqual(extraWarnings.length, 0, "no extra warnings — within budget");
    }),
  );

  // --- consolidateCategories identity / error paths ---

  tests.push(
    test("consolidateCategories: returns identity for single proposed name", async () => {
      const result = await consolidateCategories(["CLI Tools"], makeThrowingProvider(), [
        { name: "Existing 1", topics: [] },
      ]);
      assertEqual(result.remapping.get("CLI Tools"), "CLI Tools", "identity remapping");
      assertEqual(result.mergeWarnings.length, 0, "no warnings");
    }),
  );

  tests.push(
    test("consolidateCategories: falls back to identity on provider error", async () => {
      const result = await consolidateCategories(
        ["CLI Tools", "Vector Databases"],
        makeThrowingProvider(),
        [],
      );
      assertEqual(
        result.remapping.get("CLI Tools"),
        "CLI Tools",
        "identity fallback for CLI Tools",
      );
      assertEqual(
        result.remapping.get("Vector Databases"),
        "Vector Databases",
        "identity fallback for VDB",
      );
      assert(result.mergeWarnings.length > 0, "warning present on fallback");
    }),
  );

  // --- rerouteOrphanRepos ---

  tests.push(
    test("rerouteOrphanRepos: returns null map when no orphans provided", async () => {
      const result = await rerouteOrphanRepos(
        [],
        ["HTTP Clients", "CLI Tools"],
        makeThrowingProvider(),
      );
      assertEqual(result.size, 0, "empty map for empty orphans");
    }),
  );

  tests.push(
    test("rerouteOrphanRepos: returns null map when no available targets", async () => {
      const result = await rerouteOrphanRepos(
        [{ category: "Rust HTTP Client" }],
        [],
        makeThrowingProvider(),
      );
      assertEqual(result.get("Rust HTTP Client"), null, "null when no targets");
    }),
  );

  tests.push(
    test("rerouteOrphanRepos: falls back to null map on provider error", async () => {
      const result = await rerouteOrphanRepos(
        [{ category: "Rust HTTP Client" }, { category: "Go CLI Tool" }],
        ["HTTP Clients", "CLI Tools"],
        makeThrowingProvider(),
      );
      assertEqual(result.get("Rust HTTP Client"), null, "null fallback for first orphan");
      assertEqual(result.get("Go CLI Tool"), null, "null fallback for second orphan");
    }),
  );

  // --- Pass 0: distribution summary with analyzedRepos ---

  tests.push(
    test("consolidateCategories with analyzedRepos: distributionContext reaches Pass 2 prompt (2 provider calls only)", async () => {
      const pass1Response = JSON.stringify({
        "CLI Tools": "CLI Tools",
        "Vector Databases": "Vector Databases",
      });
      const pass2Response = JSON.stringify({
        "CLI Tools": "CLI Tools",
        "Vector Databases": "Vector Databases",
      });
      const provider = makeRecordingProvider([pass1Response, pass2Response]);

      const analyzedRepos = [
        makeAnalyzedRepo("CLI Tools", "ripgrep"),
        makeAnalyzedRepo("Vector Databases", "qdrant"),
      ];
      await consolidateCategories(
        ["CLI Tools", "Vector Databases"],
        provider,
        [],
        32,
        "keep-existing",
        null,
        analyzedRepos,
      );

      assertEqual(
        provider.calls.length,
        2,
        `expected 2 provider calls (Pass 1 + Pass 2 only), got ${provider.calls.length}`,
      );
      assert(
        provider.calls[1].includes("DISTRIBUTION CONTEXT"),
        "Pass 2 prompt should contain DISTRIBUTION CONTEXT",
      );
    }),
  );

  tests.push(
    test("consolidateCategories without analyzedRepos: Pass 0 does NOT run (no extra provider call)", async () => {
      const pass1Response = JSON.stringify({
        "CLI Tools": "CLI Tools",
        "Vector Databases": "Vector Databases",
      });
      const pass2Response = JSON.stringify({
        "CLI Tools": "CLI Tools",
        "Vector Databases": "Vector Databases",
      });
      const provider = makeRecordingProvider([pass1Response, pass2Response]);

      await consolidateCategories(["CLI Tools", "Vector Databases"], provider, [], 32);

      assertEqual(
        provider.calls.length,
        2,
        `expected 2 provider calls (Pass 1 + Pass 2 only), got ${provider.calls.length}`,
      );
      assert(
        !provider.calls[1].includes("DISTRIBUTION CONTEXT"),
        "Pass 2 prompt should NOT contain DISTRIBUTION CONTEXT when no analyzedRepos",
      );
    }),
  );

  return Promise.all(tests).then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
