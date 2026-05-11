import { buildSessionJson } from "../session/json.js";
import type { PhaseTimings } from "../types.js";
import type { AnalysisTiming } from "../orchestration/analysis.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const phaseTimings: PhaseTimings = {
  fetchStarsListsMs: 120,
  fetchReadmesMs: 350,
  analysisMs: 8200,
  consolidationMs: 1500,
  suggestionsMs: 90,
};

const analysisTimings: AnalysisTiming[] = [
  { owner: "a", name: "ok", durationMs: 800, status: "ok" },
  { owner: "a", name: "boom", durationMs: 120, status: "failed" },
  { owner: "a", name: "old", durationMs: 0, status: "skipped-archived" },
];

// --- analyze-only-style payload
{
  const json = buildSessionJson({
    runId: "test-run",
    summary: {
      starredCount: 3,
      analyzedCount: 3,
      suggestionCount: 0,
      durationMs: 12_000,
      analysisDurationMs: 8200,
      phaseTimings,
      model: "fake",
      githubUser: "tester",
    },
    suggestions: [],
    errors: [{ repo: "boom", owner: "a" }],
    analysisTimings,
  });
  const parsed = JSON.parse(json);
  assertEqual(parsed.runId, "test-run", "runId top-level");
  assert(parsed.summary.phaseTimings.fetchStarsListsMs === 120, "phaseTimings preserved");
  assertEqual(parsed.summary.analysisDurationMs, 8200, "analysisDurationMs preserved");
  assertEqual(
    parsed.summary.phaseTimings.analysisMs,
    parsed.summary.analysisDurationMs,
    "analysisMs equals analysisDurationMs",
  );
  assertEqual(parsed.analysisTimings.length, 3, "analysisTimings.length");
  assert(parsed.analysisTimings[1].status === "failed", "failed status present");
  // ordering: runId, summary, suggestions, errors, analysisTimings
  const keys = Object.keys(parsed);
  assertEqual(
    keys.slice(0, 5).join(","),
    "runId,summary,suggestions,errors,analysisTimings",
    "top-level key ordering",
  );
}

// --- interrupt-save partial payload
{
  const partial: PhaseTimings = {
    fetchStarsListsMs: 100,
    fetchReadmesMs: 200,
    analysisMs: 5000,
  };
  const json = buildSessionJson({
    runId: "partial-run",
    summary: {
      starredCount: 10,
      analyzedCount: 5,
      suggestionCount: 0,
      interrupted: true,
      githubUser: "tester",
      phaseTimings: partial,
    },
    suggestions: [],
    errors: [],
    analysisTimings: analysisTimings.slice(0, 2),
  });
  const parsed = JSON.parse(json);
  assert(
    parsed.summary.phaseTimings.consolidationMs === undefined,
    "no consolidation on interrupt",
  );
  assert(parsed.summary.phaseTimings.applyMs === undefined, "no apply on interrupt");
  assertEqual(parsed.analysisTimings.length, 2, "partial analysisTimings length");
}

console.log("sessionJson.test.ts: all assertions passed");
