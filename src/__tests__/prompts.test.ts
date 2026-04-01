import {
  buildAnalyzeRepoPrompt,
  buildConsolidationPrompt,
  buildReroutingPrompt,
} from "../ai/prompts.js";
import type { RepoInput } from "../ai/types.js";

function makeInput(overrides: Partial<RepoInput> = {}): RepoInput {
  return {
    name: "test-repo",
    owner: "owner",
    description: "",
    language: null,
    topics: [],
    readme: "",
    isArchived: false,
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
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

  console.log("prompts tests\n");

  test("buildUserMessage includes Archived: no for active repos", () => {
    const msg = buildAnalyzeRepoPrompt(makeInput({ isArchived: false }));
    assert(msg.includes("Archived: no"), 'should contain "Archived: no"');
  });

  test("buildUserMessage includes Archived: yes for archived repos", () => {
    const msg = buildAnalyzeRepoPrompt(makeInput({ isArchived: true }));
    assert(msg.includes("Archived: yes"), 'should contain "Archived: yes"');
  });

  // buildConsolidationPrompt — budget awareness

  test("buildConsolidationPrompt fresh account: budget is 32, no existing lists", () => {
    const prompt = buildConsolidationPrompt(["CLI Tools", "Vector Databases"], [], 32);
    assert(prompt.includes("already has 0"), "should show 0 existing lists");
    assert(prompt.includes("at most 32 distinct new"), "should state budget of 32");
    assert(prompt.includes("(none)"), "should show no existing lists");
  });

  test("buildConsolidationPrompt partial account: correct budget computed", () => {
    const prompt = buildConsolidationPrompt(
      ["CLI Tools", "Vector Databases"],
      [
        { name: "React Hooks", topics: [] },
        { name: "GraphQL Clients", topics: [] },
        { name: "LLM Tools", topics: [] },
      ],
      32,
    );
    assert(prompt.includes("already has 3"), "should show 3 existing lists");
    assert(prompt.includes("at most 29 distinct new"), "should compute budget of 29");
    assert(prompt.includes('"React Hooks"'), "should list existing list names");
  });

  test("buildConsolidationPrompt zero budget: instructs no new lists", () => {
    const thirtyTwo = Array.from({ length: 32 }, (_, i) => ({ name: `List ${i + 1}`, topics: [] }));
    const prompt = buildConsolidationPrompt(["New Category"], thirtyTwo, 32);
    assert(prompt.includes("already has 32"), "should show 32 existing lists");
    assert(prompt.includes("at most 0 distinct new"), "should state budget of 0");
  });

  test("buildConsolidationPrompt includes proposed names in input section", () => {
    const prompt = buildConsolidationPrompt(["Rust CLI Tools", "Go CLI Tools"], [], 32);
    assert(prompt.includes('"Rust CLI Tools"'), "should include first proposed name");
    assert(prompt.includes('"Go CLI Tools"'), "should include second proposed name");
  });

  // buildConsolidationPrompt — distributionContext

  test("buildConsolidationPrompt: DISTRIBUTION CONTEXT section present when distributionContext provided", () => {
    const ctx = "CLI Tools: 15 repos, top topics: cli, terminal";
    const prompt = buildConsolidationPrompt(["CLI Tools"], [], 32, "keep-existing", ctx);
    assert(prompt.includes("DISTRIBUTION CONTEXT"), "should contain DISTRIBUTION CONTEXT header");
    assert(prompt.includes(ctx), "should contain the distribution context content");
  });

  test("buildConsolidationPrompt: no DISTRIBUTION CONTEXT section when distributionContext omitted", () => {
    const prompt = buildConsolidationPrompt(["CLI Tools"], [], 32);
    assert(
      !prompt.includes("DISTRIBUTION CONTEXT"),
      "should NOT contain DISTRIBUTION CONTEXT header",
    );
  });

  test("buildConsolidationPrompt: DISTRIBUTION CONTEXT appears before NOW PROCESS THIS INPUT", () => {
    const ctx = "CLI Tools: 3 repos, top topics: cli";
    const prompt = buildConsolidationPrompt(["CLI Tools"], [], 32, "keep-existing", ctx);
    const ctxIdx = prompt.indexOf("DISTRIBUTION CONTEXT");
    const inputIdx = prompt.indexOf("NOW PROCESS THIS INPUT");
    assert(ctxIdx < inputIdx, "DISTRIBUTION CONTEXT must appear before NOW PROCESS THIS INPUT");
  });

  // buildReroutingPrompt

  test("buildReroutingPrompt includes orphan categories in output", () => {
    const prompt = buildReroutingPrompt(
      [{ category: "Rust HTTP Client" }, { category: "Go CLI Tool" }],
      ["HTTP Clients", "CLI Tools"],
    );
    assert(prompt.includes('"Rust HTTP Client"'), "should include first orphan category");
    assert(prompt.includes('"Go CLI Tool"'), "should include second orphan category");
  });

  test("buildReroutingPrompt includes available target list names", () => {
    const prompt = buildReroutingPrompt(
      [{ category: "Rust HTTP Client" }],
      ["HTTP Clients", "Vector Databases"],
    );
    assert(prompt.includes('"HTTP Clients"'), "should include first target");
    assert(prompt.includes('"Vector Databases"'), "should include second target");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
