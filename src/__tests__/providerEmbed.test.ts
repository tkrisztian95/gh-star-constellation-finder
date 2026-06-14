import { mock } from "bun:test";

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

// --- OpenAI: mock the SDK so embed() can be exercised without a network call.
// A swappable handler lets each test shape the embeddings response.
let openaiEmbedHandler: (input: string[]) => {
  data: { index: number; embedding: number[] }[];
} = () => ({ data: [] });
let openaiEmbedCalls = 0;

mock.module("openai", () => ({
  default: class {
    embeddings = {
      create: (args: { input: string[] }) => {
        openaiEmbedCalls++;
        return Promise.resolve(openaiEmbedHandler(args.input));
      },
    };
  },
}));

const { createOpenAIProvider } = await import("../ai/openaiProvider.js");
const { createOllamaProvider } = await import("../ai/ollamaProvider.js");
const { findBalancedJsonEnd } = await import("../ai/ollamaUtils.js");

/** Build a streaming NDJSON /api/chat Response, one enqueue per line. */
function ndjsonResponse(lines: object[]): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const obj of lines) controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}

async function runTests(): Promise<void> {
  console.log("providerEmbed.test.ts\n");
  let passed = 0;
  let failed = 0;
  async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
    try {
      await fn();
      passed++;
      console.log(`  ok   ${name}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL ${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- embedderId identity (task 1.1/1.2/1.3) ---
  await test("embedderId differs per backend and names the model", () => {
    const openai = createOpenAIProvider(null, "sk-test");
    const ollama = createOllamaProvider();
    assertEqual(openai.embedderId, "openai:text-embedding-3-small", "openai embedderId");
    assertEqual(ollama.embedderId, "ollama:nomic-embed-text", "ollama embedderId");
    assert(openai.embedderId !== ollama.embedderId, "identities differ");
  });

  // --- empty input short-circuits with no network call (both backends) ---
  await test("OpenAI embed([]) returns [] with no API call", async () => {
    openaiEmbedCalls = 0;
    const provider = createOpenAIProvider(null, "sk-test");
    const out = await provider.embed([]);
    assertEqual(out.length, 0, "empty result");
    assertEqual(openaiEmbedCalls, 0, "no embeddings.create call");
  });

  await test("Ollama embed([]) returns [] with no fetch", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls++;
      return Promise.reject(new Error("should not fetch"));
    }) as unknown as typeof fetch;
    try {
      const provider = createOllamaProvider();
      const out = await provider.embed([]);
      assertEqual(out.length, 0, "empty result");
      assertEqual(fetchCalls, 0, "no fetch");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --- OpenAI returns vectors in input order even if API reorders them ---
  await test("OpenAI embed sorts vectors by response index", async () => {
    openaiEmbedHandler = () => ({
      data: [
        { index: 1, embedding: [0.2] },
        { index: 0, embedding: [0.1] },
      ],
    });
    const provider = createOpenAIProvider(null, "sk-test");
    const out = await provider.embed(["a", "b"]);
    assertEqual(out.length, 2, "two vectors");
    assertEqual(out[0]![0]!, 0.1, "index 0 first");
    assertEqual(out[1]![0]!, 0.2, "index 1 second");
  });

  // --- Ollama batch: parse embeddings array in order ---
  await test("Ollama embed parses batch embeddings in order", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            embeddings: [
              [1, 2],
              [3, 4],
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      )) as unknown as typeof fetch;
    try {
      const provider = createOllamaProvider();
      const out = await provider.embed(["a", "b"]);
      assertEqual(out.length, 2, "two vectors");
      assertEqual(out[0]!.join(","), "1,2", "first vector");
      assertEqual(out[1]!.join(","), "3,4", "second vector");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --- Ollama HTTP error throws ---
  await test("Ollama embed throws on non-ok response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(new Response("nope", { status: 500 }))) as unknown as typeof fetch;
    try {
      const provider = createOllamaProvider();
      let threw = false;
      try {
        await provider.embed(["a"]);
      } catch {
        threw = true;
      }
      assert(threw, "embed rejected on HTTP 500");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --- Ollama abort rejects ---
  await test("Ollama embed rejects when signal aborts", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }) as unknown as typeof fetch;
    try {
      const provider = createOllamaProvider();
      const controller = new AbortController();
      const p = provider.embed(["a"], controller.signal);
      controller.abort();
      let threw = false;
      try {
        await p;
      } catch {
        threw = true;
      }
      assert(threw, "embed rejected on abort");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --- keep_alive on the /api/chat hot path (#36) ---

  function captureChatBody(): { get: () => Record<string, unknown> } {
    let captured: Record<string, unknown> = {};
    globalThis.fetch = ((_url: string, init?: { body?: string }) => {
      captured = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
      return Promise.resolve(
        new Response(JSON.stringify({ message: { content: "{}" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;
    return { get: () => captured };
  }

  await test("Ollama analyze() sends default keep_alive on /api/chat", async () => {
    const originalFetch = globalThis.fetch;
    const cap = captureChatBody();
    try {
      const provider = createOllamaProvider();
      await provider.analyze({
        owner: "o",
        name: "n",
        description: "d",
        language: "TypeScript",
        topics: [],
        readme: "",
        isArchived: false,
      });
      assertEqual(cap.get().keep_alive, "10m", "analyze body carries default keep_alive");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("Ollama complete() sends configured keep_alive on /api/chat", async () => {
    const originalFetch = globalThis.fetch;
    const cap = captureChatBody();
    try {
      const provider = createOllamaProvider(undefined, null, undefined, undefined, "30m");
      await provider.complete("prompt", "gen-name");
      assertEqual(cap.get().keep_alive, "30m", "complete body carries configured keep_alive");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --- findBalancedJsonEnd (pure) (#34) ---

  await test("findBalancedJsonEnd: returns end index of balanced object", () => {
    assertEqual(findBalancedJsonEnd('{"a":1}'), 7, "closes at index 7");
    assertEqual(findBalancedJsonEnd('{"a":{"b":2}}rest'), 13, "outermost close, ignores trailing");
  });

  await test("findBalancedJsonEnd: ignores braces inside strings", () => {
    assertEqual(findBalancedJsonEnd('{"a":"}{"}'), 10, "brace in string value not counted");
    assertEqual(findBalancedJsonEnd('{"a":"\\""}'), 10, "escaped quote handled");
  });

  await test("findBalancedJsonEnd: -1 when not yet balanced", () => {
    assertEqual(findBalancedJsonEnd('{"a":1'), -1, "unclosed object");
    assertEqual(findBalancedJsonEnd("no braces"), -1, "no object");
  });

  // --- Ollama complete() streaming (#34) ---

  await test("Ollama complete() accumulates streamed content and reports progress", async () => {
    const originalFetch = globalThis.fetch;
    const lines: object[] = [{ message: { content: '{"k":"' } }];
    for (let i = 0; i < 16; i++) lines.push({ message: { content: "x" } });
    lines.push({ message: { content: '"}' } });
    lines.push({ done: true, done_reason: "stop", eval_count: 18 });
    globalThis.fetch = (() => Promise.resolve(ndjsonResponse(lines))) as unknown as typeof fetch;
    try {
      const progress: number[] = [];
      const provider = createOllamaProvider();
      const out = await provider.complete("p", "gen", null, {
        onProgress: (n) => progress.push(n),
      });
      assertEqual(out, '{"k":"xxxxxxxxxxxxxxxx"}', "accumulated streamed JSON string");
      assert(progress.length >= 1, "onProgress fired at least once");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("Ollama complete() early-exits on a balanced object", async () => {
    const originalFetch = globalThis.fetch;
    // No `done` line — completion is detected structurally; trailing line ignored.
    const lines = [
      { message: { content: '{"a":1}' } },
      { message: { content: "SHOULD-NOT-APPEND" } },
    ];
    globalThis.fetch = (() => Promise.resolve(ndjsonResponse(lines))) as unknown as typeof fetch;
    try {
      const provider = createOllamaProvider();
      const out = await provider.complete("p", "gen");
      assertEqual(out, '{"a":1}', "resolves at balanced JSON, ignores later tokens");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("Ollama complete() empty stream falls back to {}", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        ndjsonResponse([{ done: true, done_reason: "stop" }]),
      )) as unknown as typeof fetch;
    try {
      const provider = createOllamaProvider();
      const out = await provider.complete("p", "gen");
      assertEqual(out, "{}", "empty content fallback");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("Ollama complete() rejects when signal already aborted", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(ndjsonResponse([{ message: { content: "{}" } }]))) as unknown as typeof fetch;
    try {
      const controller = new AbortController();
      controller.abort();
      const provider = createOllamaProvider();
      let threw = false;
      try {
        await provider.complete("p", "gen", null, { signal: controller.signal });
      } catch {
        threw = true;
      }
      assert(threw, "complete rejected on aborted signal");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

await runTests();
