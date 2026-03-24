import { buildUserMessage } from '../ai/prompts.js';
import type { RepoInput } from '../ai/types.js';

function makeInput(overrides: Partial<RepoInput> = {}): RepoInput {
  return {
    name: 'test-repo',
    owner: 'owner',
    description: '',
    language: null,
    topics: [],
    readme: '',
    isArchived: false,
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
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

  console.log('prompts tests\n');

  test('buildUserMessage includes Archived: no for active repos', () => {
    const msg = buildUserMessage(makeInput({ isArchived: false }));
    assert(msg.includes('Archived: no'), 'should contain "Archived: no"');
  });

  test('buildUserMessage includes Archived: yes for archived repos', () => {
    const msg = buildUserMessage(makeInput({ isArchived: true }));
    assert(msg.includes('Archived: yes'), 'should contain "Archived: yes"');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
