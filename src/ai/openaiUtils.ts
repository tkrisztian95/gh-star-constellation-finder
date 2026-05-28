// Utility helpers for OpenAI provider

import type { GenerationEndData } from "./ollamaUtils.js";

export function endGenerationSafe(
  generation: { end: (data: GenerationEndData) => void } | null | undefined,
  data: GenerationEndData,
) {
  try {
    if (generation) generation.end(data);
  } catch {
    // tracing errors must not affect analysis or consolidation
  }
}

export interface OpenAICompletion {
  choices: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export function parseOpenAIContent(completion: OpenAICompletion): string {
  return completion.choices[0]?.message?.content ?? "";
}

export const ANALYSIS_FAILED_RESULT = {
  category: "analysis-failed",
  killerFeature: "",
  description: "",
};
