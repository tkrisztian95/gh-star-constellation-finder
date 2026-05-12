import type { LangfuseParent } from "./tracing.js";
import type { AIProvider, RepoInput, AnalysisResult } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildAnalyzeRepoPrompt } from "./prompts.js";
import { logger } from "../logger.js";
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
  _trace?: LangfuseParent | null,
  host: string = process.env.OLLAMA_HOST ?? "http://localhost:11434",
): AIProvider {
  return {
    modelId: `ollama/${model}`,

    async analyze(
      input: RepoInput,
      signal?: AbortSignal,
      parent?: LangfuseParent | null,
    ): Promise<AnalysisResult> {
      const systemPrompt = buildSystemPrompt(input.existingListNames ?? []);
      const userMessage = buildAnalyzeRepoPrompt(input);

      // Start tracing if enabled
      let generation: { end: (data: object) => void } | undefined;
      try {
        if (parent) {
          generation = parent.generation({
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
        logger.error("Ollama unreachable", { owner: input.owner, name: input.name, message });
        endGenerationSafe(generation, { level: "ERROR", statusMessage: message });
        return ANALYSIS_FAILED_RESULT;
      }

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        logger.error("Ollama request failed", { owner: input.owner, name: input.name, message });
        endGenerationSafe(generation, { level: "ERROR", statusMessage: message });
        return ANALYSIS_FAILED_RESULT;
      }

      // Parse response body with type safety
      const body = (await response.json()) as OllamaResponse;
      const content = parseOllamaResponseBody(body);

      const result = parseAnalysisResponse(content, ANALYSIS_FAILED_RESULT.category);

      // End tracing with output/usage/metadata if enabled
      endGenerationSafe(generation, {
        output: content,
        usage:
          body.prompt_eval_count !== undefined
            ? { input: body.prompt_eval_count, output: body.eval_count ?? 0 }
            : undefined,
        metadata: {
          repoFullName: `${input.owner}/${input.name}`,
          assignedCategory: result.category,
        },
      });

      return result;
    },

    async complete(
      prompt: string,
      generationName: string,
      parent?: LangfuseParent | null,
    ): Promise<string> {
      // Start tracing if enabled
      let generation: { end: (data: object) => void } | undefined;
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
            // `think: false` skips reasoning tokens on Gemma3/Gemma4 and
            // other thinking models — those tokens count toward num_predict
            // but go to `message.thinking`, not `message.content`. Without
            // this, num_predict was being burned on thinking before any
            // JSON could be emitted (empty content, or output truncated
            // mid-pair). Ignored by older Ollama versions.
            // num_predict: 8192 is generous for ~100-entry remaps; num_ctx
            // (16384) is the real ceiling.
            // No `format: "json"`: gemma's constrained sampling under that
            // mode returns empty content (see #28).
            // temperature: 0 for deterministic remap.
            think: false,
            options: { num_ctx: 16384, num_predict: 8192, temperature: 0 },
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
      let content = parseOllamaResponseBody(body);

      // Mirror openaiProvider's `|| "{}"` fallback: when Ollama returns
      // empty content, fall back to an empty mapping so the consolidator
      // can complete with identity remapping instead of a parse error.
      if (!content) {
        logger.warn("Ollama returned empty content", {
          generationName,
          evalCount: body.eval_count ?? 0,
          doneReason: body.done_reason,
          thinkingLen: body.message?.thinking?.length ?? 0,
        });
        content = "{}";
      }

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
