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
    embedderId: "fake:embed",
    embed: async () => [],
    calls,
    async analyze(input) {
      calls.push(`${input.owner}/${input.name}`);
      if (opts.throwOnAnalyze) throw new Error("analyzer should not have been called");
      return { category: "FreshCategory", killerFeature: "fresh", description: "" };
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
      description: "A command-line tool that does the thing.",
      dataQuality: "full",
    });

    // Open the DB independently and inspect the schema + row directly.
    const db = new Database(cachePath, { readonly: true });
    try {
      const userVersion = db
        .query<{ user_version: number }, []>("PRAGMA user_version")
        .get()?.user_version;
      assertEqual(userVersion, 4, "PRAGMA user_version is 4");

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
            description: string;
            data_quality: string | null;
            updated_at: number;
          },
          [string]
        >(
          "SELECT key, category, killer_feature, description, data_quality, updated_at FROM entries WHERE key = ?",
        )
        .get(key);
      assert(row !== null, "row stored under cacheKey(repoId, readme)");
      assertEqual(row?.category, "Tools", "category persisted");
      assertEqual(row?.killer_feature, "does the thing", "killer_feature persisted");
      assertEqual(
        row?.description,
        "A command-line tool that does the thing.",
        "description persisted",
      );
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
      description: "Original tool description.",
      dataQuality: "full",
    });

    const sameReadme = cache.get("a/repo", "v1 readme");
    assert(sameReadme !== null, "cache hit when README matches");
    assertEqual(sameReadme?.category, "Original", "returns saved category");
    assertEqual(
      sameReadme?.description,
      "Original tool description.",
      "description round-trips through cache API",
    );

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
      description: "Recovered tool description.",
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
      description: "Cached tool description.",
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
      description: "Stale tool description.",
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
          description: `description-${i}`,
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

  // --- Test 9 (task 3.3): opening a v1-schema db drops the table and starts empty
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");

    // Hand-build a v1-shaped db: old schema (no description column), user_version = 1.
    const v1 = new Database(cachePath);
    v1.exec(`
      CREATE TABLE entries (
        key            TEXT PRIMARY KEY,
        category       TEXT NOT NULL,
        killer_feature TEXT NOT NULL,
        data_quality   TEXT,
        updated_at     INTEGER NOT NULL
      ) WITHOUT ROWID;
    `);
    v1.query(
      "INSERT INTO entries (key, category, killer_feature, data_quality, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("legacy:key", "Legacy", "old feature", "full", 1);
    v1.exec("PRAGMA user_version = 1;");
    v1.close();

    const cache = await loadCache(cachePath);
    assertEqual(cache.size, 0, "v1 entries dropped on open under v2 schema");

    const db = new Database(cachePath, { readonly: true });
    try {
      const userVersion = db
        .query<{ user_version: number }, []>("PRAGMA user_version")
        .get()?.user_version;
      assertEqual(userVersion, 4, "user_version bumped to 4 after migration");

      // The new columns must exist on the recreated table.
      const cols = db
        .query<{ name: string }, []>("PRAGMA table_info(entries)")
        .all()
        .map((c) => c.name);
      assert(cols.includes("description"), "recreated table has description column");
      assert(cols.includes("entities"), "recreated table has entities column");
    } finally {
      db.close();
    }
  });

  // --- Test 10 (task 3.3): a v2 db preserves its entries across reopen
  await withTempDir(async (dir) => {
    const cachePath = join(dir, "analysis.db");
    const cache = await loadCache(cachePath);
    await cache.saveEntry("a/keep", "readme", {
      category: "Keep",
      killerFeature: "kept",
      description: "Kept across reopen.",
      dataQuality: "full",
    });

    const reopened = await loadCache(cachePath);
    assertEqual(reopened.size, 1, "v2 db preserves entries on reopen (no drop)");
    const hit = reopened.get("a/keep", "readme");
    assertEqual(hit?.description, "Kept across reopen.", "description survives reopen");
  });

  // --- Test 11 (star-entity-extraction): entities survive a save → get round-trip
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "analysis.db"));
    await cache.saveEntry("a/ent", "readme", {
      category: "Container Tools",
      killerFeature: "Inspect layers",
      description: "Explore docker images.",
      entities: [
        { name: "Docker", label: "TOOL" },
        { name: "Go", label: "LANGUAGE" },
      ],
    });
    const hit = cache.get("a/ent", "readme");
    assertEqual(
      (hit?.entities ?? []).map((e) => `${e.name}:${e.label}`).join(","),
      "Docker:TOOL,Go:LANGUAGE",
      "entities survive the cache round-trip",
    );
  });

  // --- Test 12 (analysis-embeddings 2.5): embedding write → read round-trip,
  // unit-normalized so cosine becomes a dot product
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "analysis.db"));
    await cache.saveEmbedding("node-1", [3, 4], "openai:test");
    const vec = cache.getEmbedding("node-1", "openai:test");
    assert(vec !== null, "embedding round-trips");
    assertEqual(vec!.length, 2, "vector length preserved");
    // [3,4] has norm 5 → normalized to [0.6, 0.8]
    assert(Math.abs(vec![0]! - 0.6) < 1e-6, "first component normalized");
    assert(Math.abs(vec![1]! - 0.8) < 1e-6, "second component normalized");
  });

  // --- Test 13: missing row returns null; needsEmbed true
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "analysis.db"));
    assertEqual(cache.getEmbedding("absent", "openai:test"), null, "missing → null");
    assert(cache.needsEmbed("absent", "openai:test"), "missing → needsEmbed");
  });

  // --- Test 14: identity match is a hit, mismatch is stale
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "analysis.db"));
    await cache.saveEmbedding("node-2", [1, 0], "openai:v1");
    assert(cache.getEmbedding("node-2", "openai:v1") !== null, "matching identity is a hit");
    assert(!cache.needsEmbed("node-2", "openai:v1"), "matching identity does not need embed");
    assertEqual(cache.getEmbedding("node-2", "openai:v2"), null, "mismatched identity is stale");
    assert(cache.needsEmbed("node-2", "openai:v2"), "mismatched identity needs embed");
  });

  // --- Test 15: allEmbeddings returns only the active embedder's vectors
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "analysis.db"));
    await cache.saveEmbedding("a", [1, 0], "openai:v1");
    await cache.saveEmbedding("b", [0, 1], "openai:v1");
    await cache.saveEmbedding("c", [1, 1], "openai:v2");
    const all = cache.allEmbeddings("openai:v1");
    assertEqual(all.length, 2, "only v1 vectors returned");
    assertEqual(
      all
        .map((e) => e.repoId)
        .sort()
        .join(","),
      "a,b",
      "correct repo ids",
    );
  });

  // --- Test 16: an old-schema cache rebuilds and gains the embeddings table
  await withTempDir(async (dir) => {
    const dbPath = join(dir, "analysis.db");
    // Write a v3-style db: entries table only, user_version = 3.
    const seed = new Database(dbPath);
    seed.exec(
      "CREATE TABLE entries (key TEXT PRIMARY KEY, category TEXT NOT NULL, killer_feature TEXT NOT NULL, description TEXT NOT NULL, entities TEXT NOT NULL DEFAULT '[]', data_quality TEXT, updated_at INTEGER NOT NULL) WITHOUT ROWID;",
    );
    seed.exec("PRAGMA user_version = 3;");
    seed.close();

    const cache = await loadCache(dbPath);
    // Table exists and is usable after migration.
    await cache.saveEmbedding("node-x", [1, 0], "openai:test");
    assert(
      cache.getEmbedding("node-x", "openai:test") !== null,
      "embeddings table usable post-migration",
    );
  });

  // --- Test 17 (analysis-embeddings 3.x): runAnalysis populates embeddings,
  // and a rerun over the already-embedded repo makes zero embed calls
  await withTempDir(async (dir) => {
    const cache = await loadCache(join(dir, "analysis.db"));
    let embedCalls = 0;
    const provider: AIProvider = {
      modelId: "fake-model",
      embedderId: "fake:embed-v1",
      embed: async (texts) => {
        embedCalls++;
        // One deterministic 2-d vector per input.
        return texts.map((_, i) => [i + 1, 1]);
      },
      analyze: async () => ({ category: "Tools", killerFeature: "k", description: "d" }),
      complete: async () => "[]",
    };
    const params = {
      filteredRepos: [makeRepo("a", "one"), makeRepo("b", "two")],
      readmes: new Map([
        ["a/one", "readme one"],
        ["b/two", "readme two"],
      ]),
      analyzer: provider,
      existingListNames: [],
      abortController: new AbortController(),
      interruptedRef: { value: false },
      filterLabel: undefined,
      concurrency: 2,
      setPhase: () => {},
      phaseTimings: {} as PhaseTimings,
      cache,
    };

    await runAnalysis(params);
    assert(embedCalls >= 1, "embed called during first analysis");
    const all = cache.allEmbeddings("fake:embed-v1");
    assertEqual(all.length, 2, "both repos embedded");
    assert(cache.getEmbedding("a/one", "fake:embed-v1") !== null, "repo a embedded");

    // Rerun: entries + embeddings are warm, so no new embed calls.
    const callsBefore = embedCalls;
    await runAnalysis({ ...params, phaseTimings: {} as PhaseTimings });
    assertEqual(embedCalls, callsBefore, "rerun makes zero embed calls (cache hit)");
  });

  console.log("  ✓ all analysisCache assertions passed");
}

await runTests();
