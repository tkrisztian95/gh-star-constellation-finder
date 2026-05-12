import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
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

  // --- Test 1 (task 4.1): saveEntry writes .cache/analysis.db with the v1 schema
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
    const cache = await loadCache(cachePath);
    await cache.saveEntry("a/repo", "README CONTENTS", {
      category: "Tools",
      killerFeature: "does the thing",
      dataQuality: "full",
    });

    // Open the DB independently and inspect the schema + row directly.
    const db = new Database(cachePath, { readonly: true });
    try {
      const userVersion = db
        .query<{ user_version: number }, []>("PRAGMA user_version")
        .get()?.user_version;
      assertEqual(userVersion, 1, "PRAGMA user_version is 1");

      const tables = db
        .query<
          { name: string },
          []
        >("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'")
        .all();
      assertEqual(tables.length, 1, "entries table exists");

      const key = cacheKey("a/repo", "README CONTENTS");
      const row = db
        .query<
          {
            key: string;
            category: string;
            killer_feature: string;
            data_quality: string | null;
            updated_at: number;
          },
          [string]
        >(
          "SELECT key, category, killer_feature, data_quality, updated_at FROM entries WHERE key = ?",
        )
        .get(key);
      assert(row !== null, "row stored under cacheKey(repoId, readme)");
      assertEqual(row?.category, "Tools", "category persisted");
      assertEqual(row?.killer_feature, "does the thing", "killer_feature persisted");
      assertEqual(row?.data_quality, "full", "data_quality persisted");
      assert(typeof row?.updated_at === "number" && row.updated_at > 0, "updated_at populated");
    } finally {
      db.close();
    }
  });

  // --- Test 2: content-based invalidation — same README hits, changed README misses
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
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

  // --- Test 3 (task 4.5): corrupt SQLite file → quarantine + fresh empty cache, no throw
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
    mkdirSync(dir, { recursive: true });
    writeFileSync(cachePath, "this is definitely not a sqlite database", "utf8");

    const cache = await loadCache(cachePath);
    assertEqual(cache.size, 0, "corrupt file yields empty cache");

    const files = readdirSync(dir);
    const brokenSibling = files.find((f) => f.startsWith("analysis.db.broken."));
    assert(
      brokenSibling !== undefined,
      `broken file preserved as analysis.db.broken.<timestamp>; got: ${files.join(", ")}`,
    );

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
    const cache = await loadCache(join(dir, "does", "not", "exist.db"));
    assertEqual(cache.size, 0, "missing file yields empty cache");
  });

  // --- Test 5 (task 4.3): cache hit short-circuits analyzer in runAnalysis
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
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

  // --- Test 6 (task 4.4): cache=null forces analyzer call even when entry exists on disk
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
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
    const cachePath = join(dir, "analysis.db");
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
    assert(hit !== null, "fresh analysis persisted to cache db");
    assertEqual(hit?.category, "FreshCategory", "stored category matches analyzer output");
  });

  // --- Test 8 (task 3.4): concurrent saveEntry calls all persist; SQLite serializes writes
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
    const cache = await loadCache(cachePath);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        cache.saveEntry(`a/repo-${i}`, `readme-${i}`, {
          category: `cat-${i}`,
          killerFeature: `feature-${i}`,
          dataQuality: "full",
        }),
      ),
    );
    assertEqual(cache.size, 10, "all 10 concurrent saves landed");

    const reloaded = await loadCache(cachePath);
    assertEqual(reloaded.size, 10, "all 10 entries durable across reload");
    for (let i = 0; i < 10; i++) {
      const hit = reloaded.get(`a/repo-${i}`, `readme-${i}`);
      assertEqual(hit?.category, `cat-${i}`, `entry ${i} category persisted`);
    }
  });

  console.log("  ✓ all analysisCache assertions passed");
}

await runTests();
