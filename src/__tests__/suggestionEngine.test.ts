import { generateSuggestions } from '../engine/suggestionEngine.js';
import type { Repo, GitHubList, AnalysisResult } from '../types.js';

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-1',
    name: 'test-repo',
    owner: 'owner',
    description: '',
    language: null,
    stargazerCount: 0,
    topics: [],
    listIds: [],
    ...overrides,
  };
}

function makeList(overrides: Partial<GitHubList> = {}): GitHubList {
  return {
    id: 'list-1',
    name: 'Test List',
    description: '',
    repoIds: [],
    ...overrides,
  };
}

function makeAnalysis(category: string, killerFeature = ''): AnalysisResult {
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

  console.log('suggestionEngine tests\n');

  test('generates create-list when no matching list exists', () => {
    const { suggestions } = generateSuggestions(
      [{ repo: makeRepo({ id: 'r1' }), analysis: makeAnalysis('Vector Databases') }],
      []
    );
    assertEqual(suggestions.length, 1, 'suggestion count');
    assertEqual(suggestions[0].type, 'create-list', 'suggestion type');
    assertEqual(suggestions[0].targetListName, 'Vector Databases', 'list name');
  });

  test('generates move-to-list when matching list exists (case-insensitive)', () => {
    const list = makeList({ id: 'l1', name: 'vector databases' });
    const { suggestions } = generateSuggestions(
      [{ repo: makeRepo({ id: 'r1' }), analysis: makeAnalysis('Vector Databases') }],
      [list]
    );
    assertEqual(suggestions.length, 1, 'suggestion count');
    assertEqual(suggestions[0].type, 'move-to-list', 'suggestion type');
    assertEqual(suggestions[0].targetListId, 'l1', 'target list id');
  });

  test('skips repos already in the matching list', () => {
    const list = makeList({ id: 'l1', name: 'Vector Databases', repoIds: ['r1'] });
    const repo = makeRepo({ id: 'r1', listIds: ['l1'] });
    const { suggestions } = generateSuggestions(
      [{ repo, analysis: makeAnalysis('Vector Databases') }],
      [list]
    );
    assertEqual(suggestions.length, 0, 'should be skipped');
  });

  test('deduplicates create-list for same category across multiple repos', () => {
    const repos = [
      makeRepo({ id: 'r1', name: 'repo1' }),
      makeRepo({ id: 'r2', name: 'repo2' }),
      makeRepo({ id: 'r3', name: 'repo3' }),
    ];
    const analyzed = repos.map((repo) => ({ repo, analysis: makeAnalysis('Vector Databases') }));
    const { suggestions, count } = generateSuggestions(analyzed, []);

    assertEqual(count, 3, 'total suggestion count');

    const createCount = suggestions.filter((s) => s.type === 'create-list').length;
    const moveCount = suggestions.filter((s) => s.type === 'move-to-list').length;

    assertEqual(createCount, 1, 'exactly one create-list');
    assertEqual(moveCount, 2, 'two move-to-list referencing pending list');

    // All move-to-list should reference the same pending list ID
    const createSuggestion = suggestions.find((s) => s.type === 'create-list')!;
    const moves = suggestions.filter((s) => s.type === 'move-to-list');
    for (const move of moves) {
      assert(move.isPendingCreate === true, 'isPendingCreate flag set');
      assertEqual(move.targetListId, createSuggestion.targetListId, 'same pending list id');
    }
  });

  test('returns correct count', () => {
    const { count, suggestions } = generateSuggestions(
      [
        { repo: makeRepo({ id: 'r1', name: 'a' }), analysis: makeAnalysis('Cat A') },
        { repo: makeRepo({ id: 'r2', name: 'b' }), analysis: makeAnalysis('Cat B') },
      ],
      []
    );
    assertEqual(count, suggestions.length, 'count matches array length');
    assertEqual(count, 2, 'two suggestions');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
