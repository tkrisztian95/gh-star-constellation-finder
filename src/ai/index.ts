import type { Analyzer } from './types.js';
import { createOpenAIAnalyzer } from './openaiAnalyzer.js';
import { createOllamaAnalyzer } from './ollamaAnalyzer.js';

export type Backend = 'openai' | 'ollama';

export function createAnalyzer(backend?: Backend): Analyzer {
  const resolved = backend ?? detectBackend();

  if (resolved === 'ollama') {
    return createOllamaAnalyzer();
  }

  return createOpenAIAnalyzer();
}

function detectBackend(): Backend {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.OLLAMA_HOST) return 'ollama';
  return 'openai';
}

export type { Analyzer, RepoInput, AnalysisResult } from './types.js';
