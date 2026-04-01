import type { LangfuseTrace } from "./tracing.js";
import type { AIProvider, RepoInput, AnalysisResult } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildAnalyzeRepoPrompt } from "./prompts.js";
import {
  endGenerationSafe,
  parseOllamaResponseBody,
  ANALYSIS_FAILED_RESULT,
  type OllamaResponse,
} from "./ollamaUtils.js";

/**
 * Creates an Ollama AIProvider instance.
 * @param model - Model name (default: env OLLAMA_MODEL or 'llama3')
 * @param trace - Optional LangfuseTrace for tracing
 * @param host - Ollama host (default: env OLLAMA_HOST or 'http://localhost:11434')
 */
export function createOllamaProvider(
  model: string = process.env.OLLAMA_MODEL ?? "llama3",
  trace?: LangfuseTrace | null,
  host: string = process.env.OLLAMA_HOST ?? "http://localhost:11434",
): AIProvider {
  return {
    modelId: `ollama/${model}`,

    async analyze(input: RepoInput, signal?: AbortSignal): Promise<AnalysisResult> {
      const systemPrompt = buildSystemPrompt(input.existingListNames ?? []);
      const userMessage = buildAnalyzeRepoPrompt(input);

      // Start tracing if enabled
      let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
      try {
        if (trace) {
          generation = trace.generation({
            name: `analyze-${input.owner}/${input.name}`,
            model,
            input: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          });
        }
      } catch {
        // tracing errors must not affect analysis
      }

      // Make Ollama API call
      let response: Response;
      try {
        response = await fetch(`${host}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal,
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        });
      } catch (error: unknown) {
        if (signal?.aborted) throw error;
        const message = error instanceof Error ? error.message : String(error);
        // Use robust logging if available, fallback to console
        if (typeof console !== "undefined") {
          console.error(`Ollama unreachable for ${input.owner}/${input.name}: ${message}`);
        }
        endGenerationSafe(generation, { level: "ERROR", statusMessage: message });
        return ANALYSIS_FAILED_RESULT;
      }

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        if (typeof console !== "undefined") {
          console.error(`Ollama error for ${input.owner}/${input.name}: ${message}`);
        }
        endGenerationSafe(generation, { level: "ERROR", statusMessage: message });
        return ANALYSIS_FAILED_RESULT;
      }

      // Parse response body with type safety
      const body = (await response.json()) as OllamaResponse;
      const content = parseOllamaResponseBody(body);

      // End tracing with output/usage if enabled
      endGenerationSafe(generation, {
        output: content,
        usage:
          body.prompt_eval_count !== undefined
            ? { input: body.prompt_eval_count, output: body.eval_count ?? 0 }
            : undefined,
      });

      return parseAnalysisResponse(content, ANALYSIS_FAILED_RESULT.category);
    },

    async complete(
      prompt: string,
      generationName: string,
      parent?: LangfuseTrace | null,
    ): Promise<string> {
      // Start tracing if enabled
      let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
      try {
        if (parent) {
          generation = parent.generation({
            name: generationName,
            model,
            input: [{ role: "user", content: prompt }],
          });
        }
      } catch {
        // tracing errors must not affect consolidation
      }

      // Make Ollama API call (with options for context window)
      let response: Response;
      try {
        response = await fetch(`${host}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            options: { num_ctx: 8192 },
            messages: [{ role: "user", content: prompt }],
          }),
        });
      } catch (err: unknown) {
        endGenerationSafe(generation, {
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        endGenerationSafe(generation, { level: "ERROR", statusMessage: message });
        throw new Error(`Ollama consolidation error: ${message}`);
      }

      // Parse response body with type safety
      const body = (await response.json()) as OllamaResponse;
      const content = parseOllamaResponseBody(body);

      // End tracing with output/usage if enabled
      endGenerationSafe(generation, {
        output: content,
        usage:
          body.prompt_eval_count !== undefined
            ? { input: body.prompt_eval_count, output: body.eval_count ?? 0 }
            : undefined,
      });

      return content;
    },
  };
}
