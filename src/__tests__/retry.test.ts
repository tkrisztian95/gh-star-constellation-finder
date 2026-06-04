import { withRetry } from "../github/retry.js";

function assertEqual<T>(a: T, b: T, msg: string): void {
  if (a !== b) throw new Error(`${msg}: expected ${String(b)}, got ${String(a)}`);
}

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;
  async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log("retry tests\n");

  await test("retries a transient 502 then succeeds", async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw { status: 502, message: "502 Bad Gateway" };
        return "ok";
      },
      { baseMs: 0 },
    );
    assertEqual(r, "ok", "resolves after retries");
    assertEqual(calls, 3, "called 3 times (2 failures + success)");
  });

  await test("fails fast on non-retryable error (401)", async () => {
    let calls = 0;
    let threw = false;
    try {
      await withRetry(
        async () => {
          calls++;
          throw { status: 401, message: "Unauthorized" };
        },
        { baseMs: 0 },
      );
    } catch {
      threw = true;
    }
    assertEqual(threw, true, "rethrows");
    assertEqual(calls, 1, "not retried");
  });

  await test("exhausts attempts then throws", async () => {
    let calls = 0;
    let threw = false;
    try {
      await withRetry(
        async () => {
          calls++;
          throw { status: 503, message: "503" };
        },
        { baseMs: 0, attempts: 3 },
      );
    } catch {
      threw = true;
    }
    assertEqual(threw, true, "throws after exhausting");
    assertEqual(calls, 3, "tried exactly 3 times");
  });

  await test("detects retryable by message when no status (HTML 502)", async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw { message: "<html>502 Bad Gateway</html>" };
        return "ok";
      },
      { baseMs: 0 },
    );
    assertEqual(r, "ok", "recovered");
    assertEqual(calls, 2, "retried once");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

await runTests();
