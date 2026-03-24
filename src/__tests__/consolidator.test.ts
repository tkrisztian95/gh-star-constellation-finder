import { consolidateCategories, buildMergeWarnings, enforcebudget } from '../ai/consolidator.js';

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

  function test(name: string, fn: () => void | Promise<void>) {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        () => { console.log(`  ✓ ${name}`); passed++; },
        (err: unknown) => { console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`); failed++; }
      );
    }
    try {
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
    return Promise.resolve();
  }

  console.log('consolidator tests\n');

  const tests: Promise<void>[] = [];

  // --- buildMergeWarnings ---

  tests.push(test('buildMergeWarnings: no warnings when all names unchanged', () => {
    const remapping = new Map([['CLI Tools', 'CLI Tools'], ['Vector Databases', 'Vector Databases']]);
    const warnings = buildMergeWarnings(remapping, ['CLI Tools', 'Vector Databases']);
    assertEqual(warnings.length, 0, 'should have no warnings');
  }));

  tests.push(test('buildMergeWarnings: warning for each remapped name', () => {
    const remapping = new Map([['Rust CLI', 'CLI Tools'], ['Go CLI', 'CLI Tools'], ['GraphQL', 'GraphQL']]);
    const warnings = buildMergeWarnings(remapping, ['Rust CLI', 'Go CLI', 'GraphQL']);
    assertEqual(warnings.length, 2, 'two names were merged');
    assert(warnings[0].includes('"Rust CLI"'), 'first warning mentions original name');
    assert(warnings[0].includes('"CLI Tools"'), 'first warning mentions canonical name');
  }));

  // --- enforcebudget ---

  tests.push(test('enforcebudget: no-op when within budget', () => {
    const remapping = new Map([['A', 'Alpha'], ['B', 'Beta']]);
    const existing = new Set<string>();
    const { remapping: out, extraWarnings } = enforcebudget(remapping, ['A', 'B'], existing, 5);
    assertEqual(out.get('A'), 'Alpha', 'A unchanged');
    assertEqual(out.get('B'), 'Beta', 'B unchanged');
    assertEqual(extraWarnings.length, 0, 'no extra warnings');
  }));

  tests.push(test('enforcebudget: merges excess groups into largest when over budget', () => {
    // 3 groups but budget is 1 — all must collapse into the largest
    const remapping = new Map([
      ['A1', 'Alpha'], ['A2', 'Alpha'], ['A3', 'Alpha'], // 3 in Alpha (largest)
      ['B1', 'Beta'],                                     // 1 in Beta
      ['C1', 'Gamma'],                                    // 1 in Gamma
    ]);
    const existing = new Set<string>();
    const { remapping: out, extraWarnings } = enforcebudget(
      remapping, ['A1', 'A2', 'A3', 'B1', 'C1'], existing, 1
    );
    // Alpha is the winner (largest group)
    assertEqual(out.get('B1'), 'Alpha', 'Beta merged into Alpha');
    assertEqual(out.get('C1'), 'Alpha', 'Gamma merged into Alpha');
    assertEqual(out.get('A1'), 'Alpha', 'Alpha unchanged');
    assert(extraWarnings.length >= 2, 'extra warnings for B1 and C1');
  }));

  tests.push(test('enforcebudget: skips names that already map to existing lists', () => {
    // B maps to an existing list — should not count toward new budget
    const remapping = new Map([['A', 'New List'], ['B', 'Existing List']]);
    const existing = new Set(['existing list']); // lowercase
    const { remapping: out, extraWarnings } = enforcebudget(
      remapping, ['A', 'B'], existing, 1
    );
    assertEqual(out.get('A'), 'New List', 'A maps to new list');
    assertEqual(out.get('B'), 'Existing List', 'B preserved as existing');
    assertEqual(extraWarnings.length, 0, 'no extra warnings — within budget');
  }));

  // --- consolidateCategories identity / error paths ---

  tests.push(test('consolidateCategories: returns identity for single proposed name', async () => {
    const result = await consolidateCategories(['CLI Tools'], ['Existing 1']);
    assertEqual(result.remapping.get('CLI Tools'), 'CLI Tools', 'identity remapping');
    assertEqual(result.mergeWarnings.length, 0, 'no warnings');
  }));

  tests.push(test('consolidateCategories: falls back to identity on API error', async () => {
    // With no OPENAI_API_KEY and no OLLAMA_HOST, the consolidator throws and falls back
    const savedKey = process.env.OPENAI_API_KEY;
    const savedHost = process.env.OLLAMA_HOST;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_HOST;
    try {
      const result = await consolidateCategories(['CLI Tools', 'Vector Databases'], []);
      assertEqual(result.remapping.get('CLI Tools'), 'CLI Tools', 'identity fallback for CLI Tools');
      assertEqual(result.remapping.get('Vector Databases'), 'Vector Databases', 'identity fallback for VDB');
      assertEqual(result.mergeWarnings.length, 0, 'no warnings on fallback');
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
      if (savedHost !== undefined) process.env.OLLAMA_HOST = savedHost;
    }
  }));

  return Promise.all(tests).then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
