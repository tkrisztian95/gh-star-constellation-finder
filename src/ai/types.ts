import { z } from "zod";
import type { LangfuseParent } from "./tracing.js";
import type { Entity } from "./entityFilter.js";

export const responseSchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
  description: z.string().default(""),
});

// A category must be a short human label — never a JSON blob or a paragraph.
// Guards the last-ditch fallback from dumping raw model output into `category`
// (which then surfaces as garbage in the constellation legend).
function sanitizeCategory(s: string, fallback: string): string {
  const c = s.trim();
  if (!c || c.startsWith("{") || c.startsWith("[") || c.length > 60) return fallback;
  return c;
}

// Entity extraction is a separate seam (see ./entityExtractor.ts); analysis
// returns only the three generative fields.
export function parseAnalysisResponse(
  content: string,
  fallback = "analysis-failed",
): AnalysisResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;
  try {
    return responseSchema.parse(JSON.parse(jsonStr));
  } catch {
    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;
      const category = typeof raw["category"] === "string" ? raw["category"] : "";
      const killerFeature = typeof raw["killerFeature"] === "string" ? raw["killerFeature"] : "";
      const description = typeof raw["description"] === "string" ? raw["description"] : "";
      if (category) return { category, killerFeature, description };
    } catch {
      // not valid JSON at all
    }
    return { category: sanitizeCategory(content, fallback), killerFeature: "", description: "" };
  }
}

export interface RepoInput {
  name: string;
  owner: string;
  description: string;
  language: string | null;
  topics: string[];
  readme: string;
  isArchived: boolean;
  existingListNames?: string[];
}

export interface AnalysisResult {
  category: string;
  killerFeature: string;
  description: string;
  /** Technical entities extracted in the same analyze() call. Optional so that
   * archived stubs / failure fallbacks can omit it; readers default to []. */
  entities?: Entity[];
  dataQuality?: "full" | "sparse" | "truncated";
}

export interface ConsolidationResult {
  remapping: Map<string, string>;
  mergeWarnings: string[];
}

/** Optional controls for a `complete()` call. Backward-compatible: callers that
 * omit it observe the prior behaviour (aside from streamed transport on Ollama). */
export interface CompleteOptions {
  /** Aborts the in-flight call; the provider rejects when this fires. */
  signal?: AbortSignal;
  /** Progress callback invoked with the running token count as output streams
   * (Ollama only; throttled, not per-token). OpenAI ignores it. */
  onProgress?: (tokenCount: number) => void;
}

export interface AIProvider {
  modelId: string;
  /** Stable identity of the embedding model + dimensionality producing this
   * provider's vectors (e.g. `openai:text-embedding-3-small`). Changes whenever
   * the model or vector dimension changes so caches can detect stale vectors. */
  embedderId: string;
  analyze(
    input: RepoInput,
    signal?: AbortSignal,
    parent?: LangfuseParent | null,
  ): Promise<AnalysisResult>;
  complete(
    prompt: string,
    generationName: string,
    parent?: LangfuseParent | null,
    opts?: CompleteOptions,
  ): Promise<string>;
  /** Embed a batch of texts, returning one vector per input in input order.
   * Empty input returns `[]` with no network call. An aborted `signal` rejects. */
  embed(texts: string[], signal?: AbortSignal, parent?: LangfuseParent | null): Promise<number[][]>;
}
