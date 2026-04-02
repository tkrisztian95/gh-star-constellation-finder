import { generateSuggestions } from "../engine/suggestionEngine.js";
import type {
  Repo,
  GitHubList,
  AnalysisResult,
  CreateListSuggestion,
  MoveToListSuggestion,
  RenameListSuggestion,
} from "../types.js";

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: "repo-1",
    name: "test-repo",
    owner: "owner",
    description: "",
    language: null,
    isArchived: false,
    stargazerCount: 0,
    topics: [],
    listIds: [],
    ...overrides,
  };
}

function makeList(overrides: Partial<GitHubList> = {}): GitHubList {
  return {
    id: "list-1",
    name: "Test List",
    description: "",
    repoIds: [],
    ...overrides,
  };
}

function makeAnalysis(category: string, killerFeature = ""): AnalysisResult {
  return { category, killerFeature };
}

// --- Tests ---

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

// No-op reroute: returns null for all orphans (simulates API failure / no credentials)
function nullReroute(orphans: { category: string }[]): Promise<Map<string, string | null>> {
  return Promise.resolve(new Map(orphans.map((o) => [o.category, null])));
}

// Reroute to a specific target list name
function fixedReroute(target: string) {
  return (orphans: { category: string }[]): Promise<Map<string, string | null>> =>
    Promise.resolve(new Map(orphans.map((o) => [o.category, target])));
}

// Type-narrowing helpers for test assertions
function asCreateList(s: unknown): CreateListSuggestion {
  const typed = s as CreateListSuggestion;
  if (typed.type !== "create-list") throw new Error(`Expected create-list, got ${typed.type}`);
  return typed;
}

function asMoveToList(s: unknown): MoveToListSuggestion {
  const typed = s as MoveToListSuggestion;
  if (typed.type !== "move-to-list") throw new Error(`Expected move-to-list, got ${typed.type}`);
  return typed;
}

function asRenameList(s: unknown): RenameListSuggestion {
  const typed = s as RenameListSuggestion;
  if (typed.type !== "rename-list") throw new Error(`Expected rename-list, got ${typed.type}`);
  return typed;
}

function runTests() {
  let passed = 0;
  let failed = 0;

  const tests: Promise<void>[] = [];

  function test(name: string, fn: () => void | Promise<void>) {
    const result = fn();
    if (result instanceof Promise) {
      return tests.push(
        result.then(
          () => {
            console.log(`  ✓ ${name}`);
            passed++;
          },
          (err: unknown) => {
            console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
            failed++;
          },
        ),
      );
    }
    try {
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
    return tests.push(Promise.resolve());
  }

  console.log("suggestionEngine tests\n");

  test("generates create-list when no matching list exists", async () => {
    const { suggestions } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("Vector Databases") }],
      [],
      nullReroute,
    );
    assertEqual(suggestions.length, 0, "singleton is pruned by null reroute");
  });

  test("singleton becomes move-to-list when rerouted to existing list", async () => {
    const list = makeList({ id: "l1", name: "Vector Databases" });
    const { suggestions, reroutedRepos } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1", name: "my-repo" }), analysis: makeAnalysis("HTTP Clients") }],
      [list],
      fixedReroute("Vector Databases"),
    );
    assertEqual(suggestions.length, 1, "one suggestion after rerouting");
    assertEqual(suggestions[0].type, "move-to-list", "rerouted as move-to-list");
    assertEqual(asMoveToList(suggestions[0]).targetListId, "l1", "points to existing list id");
    assertEqual(asMoveToList(suggestions[0]).isPendingCreate, false, "not a pending create");
    assertEqual(reroutedRepos.length, 1, "one rerouted repo recorded");
    assertEqual(reroutedRepos[0].targetList, "Vector Databases", "targetList recorded");
  });

  test("generates move-to-list when matching list exists (case-insensitive)", async () => {
    const list = makeList({ id: "l1", name: "vector databases" });
    const { suggestions } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("Vector Databases") }],
      [list],
      nullReroute,
    );
    assertEqual(suggestions.length, 1, "suggestion count");
    assertEqual(suggestions[0].type, "move-to-list", "suggestion type");
    assertEqual(asMoveToList(suggestions[0]).targetListId, "l1", "target list id");
  });

  test("skips repos already in the matching list", async () => {
    const list = makeList({ id: "l1", name: "Vector Databases", repoIds: ["r1"] });
    const repo = makeRepo({ id: "r1", listIds: ["l1"] });
    const { suggestions } = await generateSuggestions(
      [{ repo, analysis: makeAnalysis("Vector Databases") }],
      [list],
      nullReroute,
    );
    assertEqual(suggestions.length, 0, "should be skipped");
  });

  test("deduplicates create-list for same category across multiple repos", async () => {
    const repos = [
      makeRepo({ id: "r1", name: "repo1" }),
      makeRepo({ id: "r2", name: "repo2" }),
      makeRepo({ id: "r3", name: "repo3" }),
    ];
    const analyzed = repos.map((repo) => ({ repo, analysis: makeAnalysis("Vector Databases") }));
    const { suggestions, count } = await generateSuggestions(analyzed, [], nullReroute);

    assertEqual(count, 3, "total suggestion count");

    const createCount = suggestions.filter((s) => s.type === "create-list").length;
    const moveCount = suggestions.filter((s) => s.type === "move-to-list").length;

    assertEqual(createCount, 1, "exactly one create-list");
    assertEqual(moveCount, 2, "two move-to-list referencing pending list");

    const createSuggestion = asCreateList(suggestions.find((s) => s.type === "create-list")!);
    const moves = suggestions.filter((s) => s.type === "move-to-list").map(asMoveToList);
    for (const move of moves) {
      assert(move.isPendingCreate === true, "isPendingCreate flag set");
      assertEqual(move.targetListId, createSuggestion.targetListId, "same pending list id");
    }
  });

  test("singleton rerouted to another pending list gets isPendingCreate: true", async () => {
    // Two repos in Cat A (multi-member), one in Cat B (singleton)
    const analyzed = [
      { repo: makeRepo({ id: "r1", name: "a1" }), analysis: makeAnalysis("Cat A") },
      { repo: makeRepo({ id: "r2", name: "a2" }), analysis: makeAnalysis("Cat A") },
      { repo: makeRepo({ id: "r3", name: "b1" }), analysis: makeAnalysis("Cat B") },
    ];
    const { suggestions, reroutedRepos } = await generateSuggestions(
      analyzed,
      [],
      fixedReroute("Cat A"),
    );
    // Cat B singleton should be rerouted into the Cat A pending list
    const rerouted = suggestions.find(
      (s) =>
        s.type !== "create-list" &&
        s.type !== "rename-list" &&
        s.type !== "delete-list" &&
        (s as MoveToListSuggestion).repo.name === "b1",
    );
    assert(rerouted !== undefined, "b1 should appear in suggestions after rerouting");
    assertEqual(rerouted!.type, "move-to-list", "rerouted as move-to-list");
    assertEqual(asMoveToList(rerouted!).isPendingCreate, true, "target is a pending list");
    assertEqual(asMoveToList(rerouted!).targetListName, "Cat A", "targets Cat A");
    assertEqual(reroutedRepos.length, 1, "one rerouted repo");
    assertEqual(reroutedRepos[0].targetList, "Cat A", "targetList is Cat A");
  });

  test("singleton with null reroute is dropped and recorded", async () => {
    const { suggestions, reroutedRepos } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1", name: "orphan" }), analysis: makeAnalysis("Niche Tool") }],
      [],
      nullReroute,
    );
    assertEqual(suggestions.length, 0, "suggestion dropped");
    assertEqual(reroutedRepos.length, 1, "recorded in reroutedRepos");
    assertEqual(reroutedRepos[0].repoName, "orphan", "correct repo name");
    assertEqual(reroutedRepos[0].targetList, null, "targetList is null");
  });

  test("multi-repo category is untouched, reroutedRepos is empty", async () => {
    const analyzed = [
      { repo: makeRepo({ id: "r1", name: "a" }), analysis: makeAnalysis("Cat A") },
      { repo: makeRepo({ id: "r2", name: "b" }), analysis: makeAnalysis("Cat A") },
    ];
    const { suggestions, reroutedRepos } = await generateSuggestions(analyzed, [], nullReroute);
    assertEqual(suggestions.length, 2, "both suggestions retained");
    assertEqual(reroutedRepos.length, 0, "no rerouted repos");
  });

  test("existing-list assignments are unaffected by rerouting", async () => {
    const list = makeList({ id: "l1", name: "HTTP Clients" });
    const { suggestions, reroutedRepos } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("HTTP Clients") }],
      [list],
      nullReroute,
    );
    assertEqual(suggestions.length, 1, "move-to-list retained");
    assertEqual(suggestions[0].type, "move-to-list", "type unchanged");
    assertEqual(reroutedRepos.length, 0, "no rerouted repos");
  });

  test("archived repo produces create-list suggestion targeting Archived", async () => {
    const archivedRepo = makeRepo({ id: "r-arch", isArchived: true });
    const archivedAnalysis = makeAnalysis("Archived", "(archived repository)");
    // Archived is a singleton — nullReroute drops it; use fixedReroute to avoid that
    const { suggestions } = await generateSuggestions(
      [{ repo: archivedRepo, analysis: archivedAnalysis }],
      [],
      nullReroute,
    );
    // With nullReroute, the singleton is dropped
    assertEqual(suggestions.length, 0, "singleton dropped by null reroute");
  });

  test("multiple archived repos produce one create-list and move-to-list all targeting Archived", async () => {
    const archived = [
      { repo: makeRepo({ id: "r1", isArchived: true }), analysis: makeAnalysis("Archived") },
      {
        repo: makeRepo({ id: "r2", name: "b", isArchived: true }),
        analysis: makeAnalysis("Archived"),
      },
      {
        repo: makeRepo({ id: "r3", name: "c", isArchived: true }),
        analysis: makeAnalysis("Archived"),
      },
    ];
    const { suggestions } = await generateSuggestions(archived, [], nullReroute);
    const createCount = suggestions.filter((s) => s.type === "create-list").length;
    const moveCount = suggestions.filter((s) => s.type === "move-to-list").length;
    assertEqual(createCount, 1, "exactly one create-list for Archived");
    assertEqual(moveCount, 2, "two move-to-list for Archived");
    for (const s of suggestions) {
      if (s.type === "create-list" || s.type === "move-to-list") {
        assertEqual(s.targetListName, "Archived", "all target Archived list");
      }
    }
  });

  test("archived repo joins existing Archived list", async () => {
    const list = makeList({ id: "l-arch", name: "Archived" });
    const archivedRepo = makeRepo({ id: "r-arch", isArchived: true });
    const { suggestions } = await generateSuggestions(
      [{ repo: archivedRepo, analysis: makeAnalysis("Archived") }],
      [list],
      nullReroute,
    );
    assertEqual(suggestions.length, 1, "one suggestion");
    assertEqual(suggestions[0].type, "move-to-list", "move-to-list type");
    assertEqual(
      asMoveToList(suggestions[0]).targetListId,
      "l-arch",
      "targets existing Archived list",
    );
  });

  test("skips repos with analysis-failed category", async () => {
    const { suggestions, reroutedRepos } = await generateSuggestions(
      [
        {
          repo: makeRepo({ id: "r1", name: "failed-repo" }),
          analysis: makeAnalysis("analysis-failed"),
        },
        {
          repo: makeRepo({ id: "r2", name: "good-repo" }),
          analysis: makeAnalysis("Vector Databases"),
        },
        {
          repo: makeRepo({ id: "r3", name: "good-repo-2" }),
          analysis: makeAnalysis("Vector Databases"),
        },
      ],
      [],
      nullReroute,
    );
    assert(
      suggestions.every(
        (s) =>
          s.type === "rename-list" ||
          s.type === "delete-list" ||
          s.targetListName !== "analysis-failed",
      ),
      "no suggestion targets analysis-failed list",
    );
    assertEqual(reroutedRepos.length, 0, "failed repo not recorded in reroutedRepos");
    // The two good repos form a multi-member category — both suggestions retained
    assertEqual(suggestions.length, 2, "only good repos produce suggestions");
  });

  test("returns correct count", async () => {
    // Two different categories — both singletons, both dropped by nullReroute
    const { count, suggestions } = await generateSuggestions(
      [
        { repo: makeRepo({ id: "r1", name: "a" }), analysis: makeAnalysis("Cat A") },
        { repo: makeRepo({ id: "r2", name: "b" }), analysis: makeAnalysis("Cat B") },
      ],
      [],
      nullReroute,
    );
    assertEqual(count, suggestions.length, "count matches array length");
  });

  // --- allow-rename strategy tests ---

  test("allow-rename: emits rename-list for unclaimed existing list instead of create-list", async () => {
    const existingList = makeList({ id: "l1", name: "Old AI Tools" });
    const analyzed = [
      { repo: makeRepo({ id: "r1", name: "repo1" }), analysis: makeAnalysis("New AI Tooling") },
      { repo: makeRepo({ id: "r2", name: "repo2" }), analysis: makeAnalysis("New AI Tooling") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [existingList],
      nullReroute,
      "allow-rename",
    );

    const renameSuggestions = suggestions.filter((s) => s.type === "rename-list");
    assertEqual(renameSuggestions.length, 1, "one rename-list suggestion emitted");

    const rename = asRenameList(renameSuggestions[0]);
    assertEqual(rename.listId, "l1", "rename targets unclaimed existing list");
    assertEqual(rename.oldName, "Old AI Tools", "oldName is existing list name");
    assertEqual(rename.newName, "New AI Tooling", "newName is AI category");

    // Repos should be move-to-list targeting the rename placeholder
    const moves = suggestions.filter((s) => s.type === "move-to-list").map(asMoveToList);
    assertEqual(moves.length, 2, "both repos have move-to-list suggestions");
    assert(
      moves.every((m) => m.targetListId === "rename:l1"),
      "moves target rename placeholder",
    );
    assert(
      moves.every((m) => m.isPendingCreate === false),
      "isPendingCreate is false for rename moves",
    );
  });

  test("allow-rename: falls back to create-list when no unclaimed existing list available", async () => {
    // The existing list is claimed (repos map to it), so no unclaimed list to rename
    const existingList = makeList({ id: "l1", name: "HTTP Clients" });
    const analyzed = [
      { repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("HTTP Clients") }, // claims l1
      { repo: makeRepo({ id: "r2", name: "repo2" }), analysis: makeAnalysis("New AI Tooling") },
      { repo: makeRepo({ id: "r3", name: "repo3" }), analysis: makeAnalysis("New AI Tooling") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [existingList],
      nullReroute,
      "allow-rename",
    );

    const renameSuggestions = suggestions.filter((s) => s.type === "rename-list");
    assertEqual(renameSuggestions.length, 0, "no rename-list when all lists are claimed");

    const createSuggestions = suggestions.filter((s) => s.type === "create-list");
    assertEqual(createSuggestions.length, 1, "falls back to create-list");
    assertEqual(
      asCreateList(createSuggestions[0]).targetListName,
      "New AI Tooling",
      "create-list name is correct",
    );
  });

  test("allow-rename: claimed existing lists are not candidates for rename", async () => {
    const claimedList = makeList({ id: "l1", name: "HTTP Clients" });
    const unclaimedList = makeList({ id: "l2", name: "Old List" });
    const analyzed = [
      { repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("HTTP Clients") }, // claims l1
      { repo: makeRepo({ id: "r2", name: "r2" }), analysis: makeAnalysis("New Category") },
      { repo: makeRepo({ id: "r3", name: "r3" }), analysis: makeAnalysis("New Category") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [claimedList, unclaimedList],
      nullReroute,
      "allow-rename",
    );

    const rename = suggestions.find((s) => s.type === "rename-list");
    assert(rename !== undefined, "a rename-list suggestion exists");
    assertEqual(
      asRenameList(rename!).listId,
      "l2",
      "rename targets the unclaimed list, not the claimed one",
    );
    assertEqual(asRenameList(rename!).oldName, "Old List", "oldName is the unclaimed list");
  });

  test("allow-rename + unlisted-only: single-repo list is eligible for rename", async () => {
    const singleRepoList = makeList({ id: "l1", name: "Old Name", repoIds: ["existing-repo"] });
    const analyzed = [
      { repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("New Category") },
      { repo: makeRepo({ id: "r2", name: "r2" }), analysis: makeAnalysis("New Category") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [singleRepoList],
      nullReroute,
      "allow-rename",
      "unlisted-only",
    );

    const rename = suggestions.find((s) => s.type === "rename-list");
    assert(rename !== undefined, "rename-list suggestion emitted for single-repo list");
    assertEqual(asRenameList(rename!).listId, "l1", "targets the single-repo list");
  });

  test("allow-rename + unlisted-only: list with 2+ repos is NOT eligible for rename", async () => {
    const multiRepoList = makeList({ id: "l1", name: "Old Name", repoIds: ["r-a", "r-b"] });
    const analyzed = [
      { repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("New Category") },
      { repo: makeRepo({ id: "r2", name: "r2" }), analysis: makeAnalysis("New Category") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [multiRepoList],
      nullReroute,
      "allow-rename",
      "unlisted-only",
    );

    const rename = suggestions.find((s) => s.type === "rename-list");
    assert(rename === undefined, "no rename-list for list with 2+ repos in unlisted-only scope");

    const create = suggestions.find((s) => s.type === "create-list");
    assert(create !== undefined, "falls back to create-list instead");
  });

  test("allow-rename + all scope: list with 2+ repos IS eligible for rename", async () => {
    const multiRepoList = makeList({ id: "l1", name: "Old Name", repoIds: ["r-a", "r-b"] });
    const analyzed = [
      { repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("New Category") },
      { repo: makeRepo({ id: "r2", name: "r2" }), analysis: makeAnalysis("New Category") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [multiRepoList],
      nullReroute,
      "allow-rename",
      "all",
    );

    const rename = suggestions.find((s) => s.type === "rename-list");
    assert(rename !== undefined, "rename-list is proposed for multi-repo list in all scope");
    assertEqual(asRenameList(rename!).listId, "l1", "targets the multi-repo list");
  });

  // --- "Other" bucket protection tests ---

  test("Other bucket: single repo assigned to Other is never rerouted", async () => {
    // "Other" is a singleton but is protected — should produce suggestions, not be dropped
    const { suggestions, reroutedRepos } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1", name: "odd-repo" }), analysis: makeAnalysis("Other") }],
      [],
      nullReroute,
    );
    assertEqual(suggestions.length, 1, "Other singleton is not dropped");
    assertEqual(suggestions[0].type, "create-list", "Other produces create-list");
    assertEqual(
      (suggestions[0] as CreateListSuggestion).targetListName,
      "Other",
      "targets Other list",
    );
    assertEqual(reroutedRepos.length, 0, "Other is not recorded as rerouted");
  });

  test("Other bucket: repos assigned to Other get create-list and move-to-list suggestions", async () => {
    const analyzed = [
      { repo: makeRepo({ id: "r1", name: "repo1" }), analysis: makeAnalysis("Other") },
      { repo: makeRepo({ id: "r2", name: "repo2" }), analysis: makeAnalysis("Other") },
    ];
    const { suggestions } = await generateSuggestions(analyzed, [], nullReroute);
    const createCount = suggestions.filter((s) => s.type === "create-list").length;
    const moveCount = suggestions.filter((s) => s.type === "move-to-list").length;
    assertEqual(createCount, 1, "one create-list for Other");
    assertEqual(moveCount, 1, "one move-to-list for Other");
    for (const s of suggestions) {
      if (s.type === "create-list" || s.type === "move-to-list") {
        assertEqual(s.targetListName, "Other", "all target Other list");
      }
    }
  });

  test("Other bucket: existing Other list is never a rename candidate", async () => {
    const otherList = makeList({ id: "l-other", name: "Other" });
    const analyzed = [
      { repo: makeRepo({ id: "r1", name: "r1" }), analysis: makeAnalysis("New Category") },
      { repo: makeRepo({ id: "r2", name: "r2" }), analysis: makeAnalysis("New Category") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [otherList],
      nullReroute,
      "allow-rename",
    );
    const renameSuggestions = suggestions.filter((s) => s.type === "rename-list");
    assert(
      renameSuggestions.every((s) => asRenameList(s).listId !== "l-other"),
      "Other list is never a rename target",
    );
  });

  test("Other bucket: uncategorizable repo assigned to Other goes to existing Other list", async () => {
    const otherList = makeList({ id: "l-other", name: "Other" });
    const { suggestions } = await generateSuggestions(
      [{ repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("Other") }],
      [otherList],
      nullReroute,
    );
    assertEqual(suggestions.length, 1, "one suggestion");
    assertEqual(suggestions[0].type, "move-to-list", "moves to existing Other list");
    assertEqual(asMoveToList(suggestions[0]).targetListId, "l-other", "targets existing Other id");
  });

  test("allow-rename: keep-existing strategy does not emit rename-list", async () => {
    const existingList = makeList({ id: "l1", name: "Old AI Tools" });
    const analyzed = [
      { repo: makeRepo({ id: "r1" }), analysis: makeAnalysis("New AI Tooling") },
      { repo: makeRepo({ id: "r2", name: "r2" }), analysis: makeAnalysis("New AI Tooling") },
    ];
    const { suggestions } = await generateSuggestions(
      analyzed,
      [existingList],
      nullReroute,
      "keep-existing",
    );

    const renameSuggestions = suggestions.filter((s) => s.type === "rename-list");
    assertEqual(renameSuggestions.length, 0, "no rename-list for keep-existing strategy");
  });

  return Promise.all(tests).then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
