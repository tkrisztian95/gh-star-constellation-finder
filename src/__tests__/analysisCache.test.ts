import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cacheKey, loadCache } from "../cache/analysisCache.js";
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

function withTempDir<T>(fn: (dir: string) => Promise<T> | T): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "cache-test-"));
  return Promise.resolve(fn(dir)).finally(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });
}

function makeRepo(owner: string, name: string): Repo {
  return {
    id: `${owner}/${name}`,
    name,
    owner,
    description: "",
    language: null,
    stargazerCount: 0,
    topics: [],
    listIds: [],
    isArchived: false,
  };
}

interface RecordingProvider extends AIProvider {
  calls: string[];
}

function makeRecordingProvider(opts: { throwOnAnalyze?: boolean } = {}): RecordingProvider {
  const calls: string[] = [];
  return {
    modelId: "fake-model",
    calls,
    async analyze(input) {
      calls.push(`${input.owner}/${input.name}`);
      if (opts.throwOnAnalyze) throw new Error("analyzer should not have been called");
      return { category: "FreshCategory", killerFeature: "fresh" };
    },
    async complete() {
      throw new Error("not used");
    },
  };
}

async function runTests(): Promise<void> {
  console.log("analysisCache.test.ts\n");

  // --- Test 1 (task 4.1): saveEntry writes .cache/analysis.json with v1 schema
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.json");
    const cache = await loadCache(cachePath);
    await cache.saveEntry("a/repo", "README CONTENTS", {
      category: "Tools",
      killerFeature: "does the thing",
      dataQuality: "full",
    });

    const raw = JSON.parse(readFileSync(cachePath, "utf8"));
    assertEqual(raw.version, 1, "file uses version 1");
    const key = cacheKey("a/repo", "README CONTENTS");
    assert(key in raw.entries, "entry stored under cacheKey(repoId, readme)");
    assertEqual(raw.entries[key].category, "Tools", "category persisted");
    assertEqual(raw.entries[key].killerFeature, "does the thing", "killerFeature persisted");
    assertEqual(raw.entries[key].dataQuality, "full", "dataQuality persisted");
  });

  // --- Test 2: content-based invalidation — same README hits, changed README misses
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.json");
    const cache = await loadCache(cachePath);
    await cache.saveEntry("a/repo", "v1 readme", {
      category: "Original",
      killerFeature: "orig",
      dataQuality: "full",
    });

    const sameReadme = cache.get("a/repo", "v1 readme");
    assert(sameReadme !== null, "cache hit when README matches");
    assertEqual(sameReadme?.category, "Original", "returns saved category");

    const changedReadme = cache.get("a/repo", "v2 readme");
    assertEqual(changedReadme, null, "cache miss when README content changed");

    const differentRepo = cache.get("b/other", "v1 readme");
    assertEqual(differentRepo, null, "cache miss when repoId differs");
  });

  // --- Test 3 (task 4.4): corrupt cache file → empty cache, no throw
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.json");
    mkdirSync(dir, { recursive: true });
    writeFileSync(cachePath, "{ this is not valid json", "utf8");
    const cache = await loadCache(cachePath);
    assertEqual(cache.size, 0, "corrupt file yields empty cache");
    // Cache remains usable after recovery.
    await cache.saveEntry("a/repo", "readme", {
      category: "Recovered",
      killerFeature: "ok",
      dataQuality: "full",
    });
    assertEqual(cache.size, 1, "cache writable after corruption recovery");
    const reloaded = await loadCache(cachePath);
    assertEqual(reloaded.size, 1, "recovered cache persists across loads");
  });

  // --- Test 4: missing cache file → empty cache, no error
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "does", "not", "exist.json"));
    assertEqual(cache.size, 0, "missing file yields empty cache");
  });

  // --- Test 5 (task 4.2): cache hit short-circuits analyzer in runAnalysis
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.json");
    const cache = await loadCache(cachePath);
    await cache.saveEntry("a/cached", "MATCHING README", {
      category: "Cached",
      killerFeature: "stored",
      dataQuality: "full",
    });

    const provider = makeRecordingProvider({ throwOnAnalyze: true });
    const phaseTimings: PhaseTimings = {};
    const result = await runAnalysis({
      filteredRepos: [makeRepo("a", "cached")],
      readmes: new Map([["a/cached", "MATCHING README"]]),
      analyzer: provider,
      existingListNames: [],
      abortController: new AbortController(),
      interruptedRef: { value: false },
      filterLabel: undefined,
      concurrency: 1,
      setPhase: () => {},
      phaseTimings,
      cache,
    });

    assertEqual(provider.calls.length, 0, "analyzer not called on cache hit");
    assertEqual(result.analyzedRepos.length, 1, "repo still recorded as analyzed");
    assertEqual(result.analyzedRepos[0].analysis.category, "Cached", "cached category returned");
  });

  // --- Test 6 (task 4.3): cache=null forces analyzer call even when entry exists on disk
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.json");
    const seed = await loadCache(cachePath);
    await seed.saveEntry("a/repo", "README", {
      category: "Stale",
      killerFeature: "old",
      dataQuality: "full",
    });

    const provider = makeRecordingProvider();
    const phaseTimings: PhaseTimings = {};
    await runAnalysis({
      filteredRepos: [makeRepo("a", "repo")],
      readmes: new Map([["a/repo", "README"]]),
      analyzer: provider,
      existingListNames: [],
      abortController: new AbortController(),
      interruptedRef: { value: false },
      filterLabel: undefined,
      concurrency: 1,
      setPhase: () => {},
      phaseTimings,
      cache: null,
    });

    assertEqual(provider.calls.length, 1, "analyzer called when cache disabled");
    assertEqual(provider.calls[0], "a/repo", "called for the right repo");
  });

  // --- Test 7: cache miss writes a new entry after analyzer runs
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.json");
    const cache = await loadCache(cachePath);
    const provider = makeRecordingProvider();
    const phaseTimings: PhaseTimings = {};
    await runAnalysis({
      filteredRepos: [makeRepo("a", "fresh")],
      readmes: new Map([["a/fresh", "FRESH README"]]),
      analyzer: provider,
      existingListNames: [],
      abortController: new AbortController(),
      interruptedRef: { value: false },
      filterLabel: undefined,
      concurrency: 1,
      setPhase: () => {},
      phaseTimings,
      cache,
    });
    assertEqual(provider.calls.length, 1, "analyzer called on cache miss");
    const reloaded = await loadCache(cachePath);
    const hit = reloaded.get("a/fresh", "FRESH README");
    assert(hit !== null, "fresh analysis persisted to cache file");
    assertEqual(hit?.category, "FreshCategory", "stored category matches analyzer output");
  });

  console.log("  ✓ all analysisCache assertions passed");
}

await runTests();
