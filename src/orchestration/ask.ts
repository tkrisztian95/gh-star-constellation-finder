import { z } from "zod";

import { buildAskPrompt } from "../ai/prompts.js";
import { repoKey } from "../evals/types.js";
import type { AIProvider } from "../ai/types.js";
import type { LangfuseParent } from "../ai/tracing.js";
import type { RetrievedRepo } from "../retrieval/cacheRetriever.js";

const answerSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()).default([]),
});

export interface AskAnswer {
  answer: string;
  /** Repo URLs the answer relies on — always a subset of the retrieved set. */
  citations: string[];
}

/** Parse the model's JSON answer, tolerating fences / surrounding prose by
 * extracting the first balanced-looking object. Returns null on failure. */
function parseAnswer(content: string): { answer: string; citations: string[] } | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return answerSchema.parse(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

/**
 * Generate a grounded answer for `question` from the retrieved repos (#21).
 * Calls the provider's `complete()` seam with a prompt that restricts the model
 * to the retrieved repos, then **intersects the returned citations with the
 * retrieved URL set** so a hallucinated URL can never reach the output. On a
 * parse failure (e.g. Ollama empty/non-JSON content) it falls back to the raw
 * text with no citations rather than throwing.
 */
export async function answerQuestion(
  question: string,
  retrieved: RetrievedRepo[],
  provider: AIProvider,
  parent: LangfuseParent | null = null,
): Promise<AskAnswer> {
  if (retrieved.length === 0) {
    return { answer: "None of your starred repositories match this question.", citations: [] };
  }

  const prompt = buildAskPrompt(
    question,
    retrieved.map((r) => ({ url: r.url, doc: r.doc })),
  );
  const content = await provider.complete(prompt, "ask", parent);

  const parsed = parseAnswer(content);
  if (!parsed) {
    // Could not parse structured output — surface the raw text, no citations.
    return { answer: content.trim(), citations: [] };
  }

  // Keep only citations that correspond to a retrieved repo (by normalized key),
  // mapped back to the canonical retrieved URL and de-duplicated in rank order.
  const retrievedByKey = new Map(retrieved.map((r) => [repoKey(r.url), r.url]));
  const citedKeys = new Set(parsed.citations.map((c) => repoKey(c)));
  const citations: string[] = [];
  for (const r of retrieved) {
    const key = repoKey(r.url);
    if (citedKeys.has(key) && retrievedByKey.has(key) && !citations.includes(r.url)) {
      citations.push(r.url);
    }
  }

  return { answer: parsed.answer.trim(), citations };
}
