import {
  buildConstellation,
  toJson,
  neighbours,
  type RepoEntities,
} from "../constellation/graph.js";
import type { Entity } from "../ai/entityFilter.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}
function assertEqual<T>(a: T, b: T, msg: string): void {
  if (a !== b) throw new Error(`${msg}: expected ${String(b)}, got ${String(a)}`);
}
const E = (name: string, label: Entity["label"] = "TOOL"): Entity => ({ name, label });

function runTests(): void {
  let passed = 0;
  let failed = 0;
  function test(name: string, fn: () => void): void {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log("constellation tests\n");

  const repos: RepoEntities[] = [
    { repoId: "o/a", category: "Infra", entities: [E("Docker"), E("Kubernetes")] },
    { repoId: "o/b", category: "Infra", entities: [E("Docker"), E("Kubernetes")] },
    { repoId: "o/c", category: "Frontend", entities: [E("React", "FRAMEWORK")] },
  ];

  test("shared entities create a weighted edge; singletons stay isolated", () => {
    const g = buildConstellation(repos, { minCount: 2 });
    assertEqual(g.order, 3, "3 nodes");
    assert(g.hasEdge("o/a", "o/b"), "a-b edge from shared Docker+Kubernetes");
    assertEqual(g.degree("o/c"), 0, "c isolated (React below minCount)");
    const w = g.getEdgeAttribute("o/a", "o/b", "weight") as number;
    assert(w > 2 && w < 3, `a-b weight ~2.8 (2 shared IDF), got ${w}`);
    const shared = g.getEdgeAttribute("o/a", "o/b", "shared") as string;
    assertEqual(shared, "Docker, Kubernetes", "shared entities listed");
  });

  test("minEdgeWeight prunes weak edges", () => {
    const g = buildConstellation(repos, { minCount: 2, minEdgeWeight: 100 });
    assertEqual(g.size, 0, "all edges pruned at high threshold");
  });

  test("communities assigned; co-linked repos share one", () => {
    const g = buildConstellation(repos, { minCount: 2 });
    const ca = g.getNodeAttribute("o/a", "community");
    const cb = g.getNodeAttribute("o/b", "community");
    assertEqual(ca, cb, "a and b in same community");
  });

  test("neighbours ranks by edge weight", () => {
    const g = buildConstellation(repos, { minCount: 2 });
    const nb = neighbours(g, "o/a", 5);
    assertEqual(nb.length, 1, "a has one neighbour");
    assertEqual(nb[0].repo, "o/b", "neighbour is b");
    assertEqual(neighbours(g, "o/c").length, 0, "c has no neighbours");
  });

  test("toJson shape", () => {
    const j = toJson(buildConstellation(repos, { minCount: 2 }));
    assertEqual(j.nodes.length, 3, "3 nodes in json");
    assertEqual(j.edges.length, 1, "1 edge in json");
    assert(typeof j.nodes[0].community === "number", "community is numeric");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
