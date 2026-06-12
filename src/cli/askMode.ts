import { createProvider, resolveBackend } from "../ai/index.js";
import {
  createLangfuseClient,
  createAskTrace,
  flushTracing,
  generateSessionId,
} from "../ai/tracing.js";
import { loadCache } from "../cache/analysisCache.js";
import { createCacheRetriever } from "../retrieval/cacheRetriever.js";
import { answerQuestion } from "../orchestration/ask.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { logger } from "../logger.js";
import type { CliArgs } from "./args.js";

/** Number of repos retrieved as answer context. */
const ASK_K = 8;

/**
 * Headless `--ask "<question>"` (#21): answer a question over the user's
 * analysed stars straight from the local cache. Offline — no GitHub auth or
 * fetch — and embeds only the query. Emits a single JSON object to stdout.
 */
export async function runAsk(cliArgs: CliArgs): Promise<void> {
  const question = cliArgs.askQuestion!;
  const backend = resolveBackend(cliArgs.backend);

  const langfuse = createLangfuseClient();
  const trace = langfuse
    ? createAskTrace(langfuse, { question, backend }, generateSessionId())
    : null;

  const provider = createProvider(backend, trace);
  const cache = await loadCache();
  const retriever = createCacheRetriever(cache, provider);

  if (retriever.size === 0) {
    const message =
      `No analysed stars found in the cache for embedder "${provider.embedderId}".\n` +
      `Run an analysis first to populate it, e.g.:\n` +
      `  gh-star-constellation-finder --backend ${backend} --analyze-only\n`;
    process.stderr.write(message);
    logger.warn("ask aborted: empty cache", { embedderId: provider.embedderId, backend });
    track("ask_completed", { backend, retrievedCount: 0, ok: false });
    await flushTracing(langfuse);
    await analyticsShutdown();
    process.exit(1);
  }

  const started = Date.now();
  const retrieved = await retriever.search(question, ASK_K, trace);
  const answer = await answerQuestion(question, retrieved, provider, trace);
  const durationMs = Date.now() - started;

  const output = {
    question,
    answer: answer.answer,
    citations: answer.citations,
    retrieved: retrieved.map((r) => ({ url: r.url, score: r.score })),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  logger.info("ask completed", {
    backend,
    retrievedCount: retrieved.length,
    citationCount: answer.citations.length,
    durationMs,
  });
  track("ask_completed", {
    backend,
    modelId: provider.modelId,
    retrievedCount: retrieved.length,
    citationCount: answer.citations.length,
    durationMs,
    ok: true,
  });

  await flushTracing(langfuse);
  await analyticsShutdown();
  process.exit(0);
}
