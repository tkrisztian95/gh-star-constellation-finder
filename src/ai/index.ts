import type { LangfuseTrace } from "./tracing.js";
import type { Analyzer } from "./types.js";
import { createOpenAIAnalyzer } from "./openaiAnalyzer.js";
import { createOllamaAnalyzer } from "./ollamaAnalyzer.js";

export type Backend = "openai" | "ollama";

export function resolveBackend(backend?: Backend): Backend {
  return backend ?? detectBackend();
}

export function createAnalyzer(backend?: Backend, trace?: LangfuseTrace | null): Analyzer {
  const resolved = resolveBackend(backend);

  if (resolved === "ollama") {
    return createOllamaAnalyzer(undefined, trace);
  }

  return createOpenAIAnalyzer(trace);
}

function detectBackend(): Backend {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.OLLAMA_HOST) return "ollama";
  return "openai";
}

export type { Analyzer, RepoInput, AnalysisResult } from "./types.js";
