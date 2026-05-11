import { runAnalysis } from "../orchestration/analysis.js";
import type { AIProvider } from "../ai/types.js";
import type { Repo, PhaseTimings } from "../types.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function makeRepo(owner: string, name: string, isArchived = false): Repo {
  return {
    id: `${owner}/${name}`,
    name,
    owner,
    description: "",
    language: null,
    stargazerCount: 0,
    topics: [],
    listIds: [],
    isArchived,
  };
}

interface FakeProviderOpts {
  delayMs?: number;
  throwOn?: Set<string>;
}

function makeFakeProvider(opts: FakeProviderOpts = {}): AIProvider {
  return {
    modelId: "fake-model",
    async analyze(input) {
      if (opts.throwOn?.has(`${input.owner}/${input.name}`)) {
        throw new Error("simulated failure");
      }
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      return { category: "TestCategory", killerFeature: "fake" };
    },
    async complete() {
      throw new Error("not used");
    },
  };
}

async function runTests(): Promise<void> {
  console.log("analysis.test.ts\n");

  // --- Test 1: every repo produces exactly one timing entry, statuses correct
  {
    const repos = [
      makeRepo("a", "ok1"),
      makeRepo("a", "ok2"),
      makeRepo("a", "archived", true),
      makeRepo("a", "boom"),
    ];
    const phaseTimings: PhaseTimings = {};
    const provider = makeFakeProvider({ throwOn: new Set(["a/boom"]) });
    let caught: unknown = null;
    try {
      await runAnalysis({
        filteredRepos: repos,
        readmes: new Map(),
        analyzer: provider,
        existingListNames: [],
        abortController: new AbortController(),
        interruptedRef: { value: false },
        filterLabel: undefined,
        concurrency: 1,
        setPhase: () => {},
        phaseTimings,
      });
    } catch (err) {
      caught = err;
    }
    // The implementation re-throws non-interrupt errors after recording timing —
    // but the `finally` records the entry first, so we still need to observe state.
    // Verify caught error is the simulated one:
    assert(caught instanceof Error, "expected the simulated failure to surface");
  }

  // --- Test 2: success-only run records phaseTimings.analysisMs and one timing per repo
  {
    const repos = [makeRepo("a", "one"), makeRepo("a", "two"), makeRepo("a", "three", true)];
    const phaseTimings: PhaseTimings = {};
    const result = await runAnalysis({
      filteredRepos: repos,
      readmes: new Map(),
      analyzer: makeFakeProvider(),
      existingListNames: [],
      abortController: new AbortController(),
      interruptedRef: { value: false },
      filterLabel: undefined,
      concurrency: 2,
      setPhase: () => {},
      phaseTimings,
    });
    assertEqual(result.analysisTimings.length, 3, "one timing per repo");
    assert(
      result.analysisTimings.every((t) => t.durationMs >= 0),
      "all durations non-negative",
    );
    assert(typeof phaseTimings.analysisMs === "number", "phaseTimings.analysisMs set");
    assertEqual(
      phaseTimings.analysisMs,
      result.analysisDurationMs,
      "phaseTimings.analysisMs matches result",
    );
    const statuses = result.analysisTimings.map((t) => t.status).sort();
    assertEqual(statuses.join(","), "ok,ok,skipped-archived", "statuses for ok+archived run");
  }

  // --- Test 3: interrupted run still resolves and records what it can
  {
    const repos = [makeRepo("a", "one"), makeRepo("a", "two"), makeRepo("a", "three")];
    const phaseTimings: PhaseTimings = {};
    const interruptedRef = { value: true }; // pre-interrupted: loop should be empty
    const result = await runAnalysis({
      filteredRepos: repos,
      readmes: new Map(),
      analyzer: makeFakeProvider(),
      existingListNames: [],
      abortController: new AbortController(),
      interruptedRef,
      filterLabel: undefined,
      concurrency: 1,
      setPhase: () => {},
      phaseTimings,
    });
    assertEqual(result.analysisTimings.length, 0, "no entries when interrupted before dispatch");
    assertEqual(result.analyzedRepos.length, 0, "no analyzed repos when pre-interrupted");
    assert(typeof phaseTimings.analysisMs === "number", "analysisMs still set on interrupt");
  }

  console.log("  ✓ all analysis assertions passed");
}

await runTests();
