import { z } from "zod";
import type { LangfuseParent } from "./tracing.js";
import type { Entity } from "./entityFilter.js";

export const responseSchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
  description: z.string().default(""),
});

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
    return { category: content.trim() || fallback, killerFeature: "", description: "" };
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

export interface AIProvider {
  modelId: string;
  analyze(
    input: RepoInput,
    signal?: AbortSignal,
    parent?: LangfuseParent | null,
  ): Promise<AnalysisResult>;
  complete(prompt: string, generationName: string, parent?: LangfuseParent | null): Promise<string>;
}
