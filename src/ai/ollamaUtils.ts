// Utility helpers for Ollama provider

export interface GenerationEndData {
  level?: "ERROR";
  statusMessage?: string;
  output?: string;
  usage?: {
    input: number;
    output: number;
  };
}

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

export interface OllamaResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export function parseOllamaResponseBody(body: OllamaResponse): string {
  // Handles both plain and JSON-wrapped content
  const raw = body.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : raw;
}

export const ANALYSIS_FAILED_RESULT = { category: "analysis-failed", killerFeature: "" };
