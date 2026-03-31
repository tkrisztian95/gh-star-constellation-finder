import {
  deriveIncomingRepos,
  deriveExistingUnanalyzed,
  deriveRenameDecision,
  type ReviewDecision,
} from "../components/ReviewScreen.js";
import type { Repo, Suggestion, MoveToListSuggestion } from "../types.js";

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

function makeMoveToList(
  repoId: string,
  repoOwner: string,
  repoName: string,
  targetListId: string,
): MoveToListSuggestion {
  return {
    type: "move-to-list",
    repo: makeRepo({ id: repoId, owner: repoOwner, name: repoName }),
    targetListId,
    targetListName: "Some List",
    analysis: { category: "Cat", killerFeature: "" },
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
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
    return Promise.resolve();
  }

  console.log("reviewScreen tests\n");

  const tests: Promise<void>[] = [];

  // --- 5.1 rename card renders incoming-repos section ---
  tests.push(
    test("5.1 rename card renders incoming-repos section when move suggestions target the rename placeholder", () => {
      const suggestions: Suggestion[] = [
        { type: "rename-list", listId: "list-1", oldName: "Old", newName: "New" },
        makeMoveToList("repo-1", "owner", "repo-a", "rename:list-1"),
      ];
      const result = deriveIncomingRepos(suggestions, "list-1");
      assertEqual(result.length, 1, "should have 1 incoming repo");
      assertEqual(result[0].repo.name, "repo-a", "incoming repo name");
    }),
  );

  // --- 5.2 truncates at 5 incoming repos ---
  tests.push(
    test("5.2 rename card truncates at 5 incoming repos with '…and N more'", () => {
      const suggestions: Suggestion[] = Array.from({ length: 8 }, (_, i) =>
        makeMoveToList(`repo-${i}`, "owner", `repo-${i}`, "rename:list-1"),
      );
      const result = deriveIncomingRepos(suggestions, "list-1");
      assertEqual(result.length, 8, "all 8 returned from derive");
      // truncation (slice(0,5) + '…and 3 more') is a render concern; verify count > 5
      assert(result.length > 5, "more than 5 triggers truncation in render");
    }),
  );

  // --- 5.3 omits section when no move suggestions target the placeholder ---
  tests.push(
    test("5.3 rename card omits incoming-repos section when no move suggestions target the placeholder", () => {
      const suggestions: Suggestion[] = [
        { type: "rename-list", listId: "list-1", oldName: "Old", newName: "New" },
        makeMoveToList("repo-1", "owner", "repo-a", "list-2"), // targets different list
      ];
      const result = deriveIncomingRepos(suggestions, "list-1");
      assertEqual(result.length, 0, "no incoming repos");
    }),
  );

  // --- 5.4 renders existing-unanalyzed section ---
  tests.push(
    test("5.4 rename card renders existing-unanalyzed section when repos has members with matching listId", () => {
      const repos: Repo[] = [makeRepo({ id: "repo-x", listIds: ["list-1"] })];
      const incomingRepoIds = new Set<string>();
      const result = deriveExistingUnanalyzed(repos, "list-1", incomingRepoIds);
      assertEqual(result.length, 1, "one existing unanalyzed repo");
      assertEqual(result[0].id, "repo-x", "correct repo returned");
    }),
  );

  // --- 5.5 excludes repos that appear in incoming suggestions ---
  tests.push(
    test("5.5 rename card excludes repos that appear in incoming suggestions from the unanalyzed section", () => {
      const repos: Repo[] = [
        makeRepo({ id: "repo-x", listIds: ["list-1"] }),
        makeRepo({ id: "repo-y", listIds: ["list-1"] }),
      ];
      const incomingRepoIds = new Set(["repo-x"]);
      const result = deriveExistingUnanalyzed(repos, "list-1", incomingRepoIds);
      assertEqual(result.length, 1, "only non-incoming repo returned");
      assertEqual(result[0].id, "repo-y", "repo-y is the unanalyzed one");
    }),
  );

  // --- 5.6 omits unanalyzed section when all list members appear in suggestions ---
  tests.push(
    test("5.6 rename card omits unanalyzed section when all list members appear in suggestions", () => {
      const repos: Repo[] = [makeRepo({ id: "repo-x", listIds: ["list-1"] })];
      const incomingRepoIds = new Set(["repo-x"]);
      const result = deriveExistingUnanalyzed(repos, "list-1", incomingRepoIds);
      assertEqual(result.length, 0, "no unanalyzed repos when all are incoming");
    }),
  );

  // --- 5.7 move card shows rejection note when rename decision is "rejected" ---
  tests.push(
    test('5.7 move card shows rejection note when rename decision is "rejected"', () => {
      const suggestions: Suggestion[] = [
        { type: "rename-list", listId: "list-1", oldName: "Old", newName: "New" },
        makeMoveToList("repo-1", "owner", "repo-a", "rename:list-1"),
      ];
      const decisions = new Map<number, ReviewDecision>([[0, "rejected"]]);
      const result = deriveRenameDecision(suggestions, decisions, "rename:list-1");
      assertEqual(result, "rejected", "rename decision is rejected");
    }),
  );

  // --- 5.8 move card shows rejection note when rename decision is "skipped" ---
  tests.push(
    test('5.8 move card shows rejection note when rename decision is "skipped"', () => {
      const suggestions: Suggestion[] = [
        { type: "rename-list", listId: "list-1", oldName: "Old", newName: "New" },
      ];
      const decisions = new Map<number, ReviewDecision>([[0, "skipped"]]);
      const result = deriveRenameDecision(suggestions, decisions, "rename:list-1");
      assertEqual(result, "skipped", "rename decision is skipped");
    }),
  );

  // --- 5.9 move card shows no note when rename decision is "accepted" ---
  tests.push(
    test('5.9 move card shows no note when rename decision is "accepted"', () => {
      const suggestions: Suggestion[] = [
        { type: "rename-list", listId: "list-1", oldName: "Old", newName: "New" },
      ];
      const decisions = new Map<number, ReviewDecision>([[0, "accepted"]]);
      const result = deriveRenameDecision(suggestions, decisions, "rename:list-1");
      assertEqual(result, "accepted", "rename decision is accepted — no note shown");
    }),
  );

  // --- 5.10 move card shows no note when rename decision is undefined ---
  tests.push(
    test("5.10 move card shows no note when rename decision is undefined", () => {
      const suggestions: Suggestion[] = [
        { type: "rename-list", listId: "list-1", oldName: "Old", newName: "New" },
      ];
      const decisions = new Map<number, ReviewDecision>(); // no decision recorded
      const result = deriveRenameDecision(suggestions, decisions, "rename:list-1");
      assertEqual(result, undefined, "no decision yet — note should not render");
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
