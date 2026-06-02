import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createBaselineRetriever } from "../evals/baselineRetriever.js";
import { crossCheck, FixtureError, loadCorpus, loadQueryset } from "../evals/loaders.js";
import { aggregate, scoreQuery } from "../evals/metrics.js";
import type { CorpusEntry, Query } from "../evals/types.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertClose(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function entry(owner: string, name: string, extra: Partial<CorpusEntry> = {}): CorpusEntry {
  return {
    owner,
    name,
    topics: [],
    category: "",
    killerFeature: "",
    description: "",
    isArchived: false,
    ...extra,
  };
}

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "evals-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runTests() {
  let passed = 0;
  let failed = 0;
  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const r = fn();
      if (r instanceof Promise) {
        // tests here are sync; guard anyway
        throw new Error("async test not supported in this harness");
      }
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log("evals tests\n");

  // --- metrics (task 8.1) ---

  test("scoreQuery: first-relevant at rank 3 → RR 1/3, precision 1/5, recall 1/1", () => {
    const q: Query = { question: "x", expected: ["github.com/o/hit"] };
    const returned = [
      "github.com/o/a",
      "github.com/o/b",
      "github.com/o/hit",
      "github.com/o/d",
      "github.com/o/e",
    ];
    const r = scoreQuery(q, returned, 5);
    assertClose(r.reciprocalRank, 1 / 3, "reciprocalRank");
    assertClose(r.precisionAtK, 1 / 5, "precision@5");
    assertClose(r.recallAtK, 1, "recall@5");
    assert(!r.noAnswer, "noAnswer false when results returned");
  });

  test("scoreQuery: multi-answer recall — 1 of 2 found in top-k", () => {
    const q: Query = { question: "x", expected: ["github.com/o/a", "github.com/o/z"] };
    const r = scoreQuery(q, ["github.com/o/a", "github.com/o/b"], 5);
    assertClose(r.recallAtK, 0.5, "recall@5 with 1/2 found");
    assertClose(r.precisionAtK, 1 / 5, "precision counts 1 relevant in 5");
  });

  test("scoreQuery: none relevant → RR 0, precision 0, recall 0", () => {
    const q: Query = { question: "x", expected: ["github.com/o/hit"] };
    const r = scoreQuery(q, ["github.com/o/a", "github.com/o/b"], 5);
    assertClose(r.reciprocalRank, 0, "RR 0");
    assertClose(r.precisionAtK, 0, "precision 0");
    assertClose(r.recallAtK, 0, "recall 0");
  });

  test("scoreQuery: empty results → noAnswer true", () => {
    const q: Query = { question: "x", expected: ["github.com/o/hit"] };
    const r = scoreQuery(q, [], 5);
    assert(r.noAnswer, "noAnswer true on empty result");
    assertClose(r.reciprocalRank, 0, "RR 0 on empty");
  });

  test("scoreQuery: URL forms normalize (https + trailing slash) and match", () => {
    const q: Query = { question: "x", expected: ["https://github.com/O/Hit/"] };
    const r = scoreQuery(q, ["github.com/o/hit"], 5);
    assertClose(r.reciprocalRank, 1, "case/protocol/slash-insensitive match → RR 1");
  });

  test("aggregate: averages the four metrics across queries", () => {
    const perQuery = [
      scoreQuery({ question: "a", expected: ["github.com/o/hit"] }, ["github.com/o/hit"], 5),
      scoreQuery({ question: "b", expected: ["github.com/o/hit"] }, [], 5),
    ];
    const sc = aggregate(perQuery, 5, "test");
    assertClose(sc.mrr, (1 + 0) / 2, "mrr average");
    assertClose(sc.noAnswerRate, 0.5, "no-answer rate average");
    assert(sc.queryCount === 2, "queryCount");
  });

  // --- baseline retriever determinism (task 8.1) runs in determinismCheck() below ---

  // --- cross-check (task 8.2) ---

  test("crossCheck: dangling ground-truth URL fails fast and names the query", () => {
    const corpus = [entry("o", "present")];
    const queryset: Query[] = [{ question: "find missing", expected: ["github.com/o/absent"] }];
    let threw = false;
    try {
      crossCheck(corpus, queryset);
    } catch (err) {
      threw = err instanceof FixtureError && err.message.includes("find missing");
    }
    assert(threw, "crossCheck throws FixtureError naming the dangling query");
  });

  test("crossCheck: all-present queryset passes", () => {
    const corpus = [entry("o", "present")];
    crossCheck(corpus, [{ question: "ok", expected: ["github.com/o/present"] }]);
    assert(true, "no throw when every expected URL is in corpus");
  });

  test("loadCorpus: invalid shape throws FixtureError", () => {
    withTempDir((dir) => {
      const p = join(dir, "corpus.json");
      writeFileSync(p, JSON.stringify([{ owner: "o" }]));
      let threw = false;
      try {
        loadCorpus(p);
      } catch (err) {
        threw = err instanceof FixtureError;
      }
      assert(threw, "malformed corpus → FixtureError");
    });
  });

  test("loadQueryset: query with empty expected[] is rejected", () => {
    withTempDir((dir) => {
      const p = join(dir, "queries.json");
      writeFileSync(p, JSON.stringify([{ question: "q", expected: [] }]));
      let threw = false;
      try {
        loadQueryset(p);
      } catch (err) {
        threw = err instanceof FixtureError;
      }
      assert(threw, "empty expected[] → FixtureError");
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Determinism check runs separately (async).
async function determinismCheck(): Promise<void> {
  const corpus = [
    entry("BurntSushi", "ripgrep", {
      topics: ["cli", "search", "rust"],
      category: "Rust CLI Tools",
      killerFeature: "Search file contents fast",
      description: "A line-oriented search tool that recursively searches directories for a regex.",
    }),
    entry("ollama", "ollama", {
      topics: ["llm", "local"],
      category: "LLM Inference Engines",
      killerFeature: "Run large language models locally",
      description: "Get up and running with large language models locally.",
    }),
    // tie candidate: shares 'search' token, lower owner key for tie-break check
    entry("aaa", "searchbox", {
      topics: ["search"],
      category: "Search",
      killerFeature: "search",
      description: "search search",
    }),
  ];
  const r = createBaselineRetriever(corpus);
  const a = await r.search("rust search tool", 5);
  const b = await r.search("rust search tool", 5);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`retriever non-deterministic: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
  if (a[0] !== "github.com/BurntSushi/ripgrep") {
    throw new Error(`expected ripgrep first for 'rust search tool', got ${a[0] ?? "(none)"}`);
  }
  const none = await r.search("kubernetes helm chart", 5);
  if (none.length !== 0) {
    throw new Error(`expected empty result for no-overlap query, got ${JSON.stringify(none)}`);
  }
  console.log("  ✓ baseline retriever: deterministic, ranks overlap, empty on no-match");
}

runTests();
await determinismCheck();
console.log("evals.test.ts: all assertions passed");
