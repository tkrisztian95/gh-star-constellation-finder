import type { LangfuseTrace } from "./tracing.js";
import type { AIProvider } from "./types.js";
import { createOpenAIProvider } from "./openaiProvider.js";
import { createOllamaProvider } from "./ollamaProvider.js";

export type Backend = "openai" | "ollama";

export function resolveBackend(backend?: Backend): Backend {
  return backend ?? detectBackend();
}

export function resolveModelId(backend?: Backend): string {
  const resolved = resolveBackend(backend);
  if (resolved === "ollama") {
    return `ollama/${process.env.OLLAMA_MODEL ?? "llama3"}`;
  }
  return `openai/${process.env.OPENAI_MODEL ?? "gpt-4o-mini"}`;
}

export function createProvider(backend?: Backend, trace?: LangfuseTrace | null): AIProvider {
  const resolved = resolveBackend(backend);

  if (resolved === "ollama") {
    return createOllamaProvider(undefined, trace);
  }

  return createOpenAIProvider(trace);
}

function detectBackend(): Backend {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.OLLAMA_HOST) return "ollama";
  return "openai";
}

export type { AIProvider, RepoInput, AnalysisResult } from "./types.js";
