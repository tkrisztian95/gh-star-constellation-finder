import OpenAI from "openai";
import type { LangfuseParent } from "./tracing.js";
import type { AIProvider, RepoInput, AnalysisResult, CompleteOptions } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildAnalyzeRepoPrompt } from "./prompts.js";
import { logger } from "../logger.js";
import {
  endGenerationSafe,
  parseOpenAIContent,
  ANALYSIS_FAILED_RESULT,
  type OpenAICompletion,
} from "./openaiUtils.js";

/**
 * Creates an OpenAI AIProvider instance.
 * @param trace - Optional LangfuseTrace for tracing
 * @param apiKey - OpenAI API key (default: env OPENAI_API_KEY)
 * @param model - Model name (default: env OPENAI_MODEL or 'gpt-4o-mini')
 */
export function createOpenAIProvider(
  _trace?: LangfuseParent | null,
  apiKey: string = process.env.OPENAI_API_KEY!,
  model: string = process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  embedModel: string = process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small",
): AIProvider {
  if (!apiKey) {
    const message = "Error: OPENAI_API_KEY is required for the openai backend";
    logger.error("missing OPENAI_API_KEY", { backend: "openai" });
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  return {
    modelId: `openai/${model}`,
    embedderId: `openai:${embedModel}`,

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

      // Make OpenAI API call
      let completion: OpenAICompletion;
      try {
        completion = (await client.chat.completions.create(
          {
            model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          },
          { signal },
        )) as OpenAICompletion;
      } catch (err: unknown) {
        endGenerationSafe(generation, {
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      const content = parseOpenAIContent(completion);
      const result = parseAnalysisResponse(content, ANALYSIS_FAILED_RESULT.category);

      // End tracing with output/usage/metadata if enabled
      endGenerationSafe(generation, {
        output: content,
        usage: completion.usage
          ? {
              input: completion.usage.prompt_tokens,
              output: completion.usage.completion_tokens,
            }
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
      opts?: CompleteOptions,
    ): Promise<string> {
      // OpenAI `complete()` is already fast; no streaming. Honour `signal` at the
      // request boundary; `onProgress` is Ollama-only and ignored here.
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

      // Make OpenAI API call
      let completion: OpenAICompletion;
      try {
        completion = (await client.chat.completions.create(
          {
            model,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          },
          { signal: opts?.signal },
        )) as OpenAICompletion;
      } catch (err: unknown) {
        endGenerationSafe(generation, {
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      const content = parseOpenAIContent(completion) || "{}";

      // End tracing with output/usage if enabled
      endGenerationSafe(generation, {
        output: content,
        usage: completion.usage
          ? {
              input: completion.usage.prompt_tokens,
              output: completion.usage.completion_tokens,
            }
          : undefined,
      });

      return content;
    },

    async embed(
      texts: string[],
      signal?: AbortSignal,
      parent?: LangfuseParent | null,
    ): Promise<number[][]> {
      if (texts.length === 0) return [];

      let generation: { end: (data: object) => void } | undefined;
      try {
        if (parent) {
          generation = parent.generation({
            name: `embed-${texts.length}`,
            model: embedModel,
            input: texts,
          });
        }
      } catch {
        // tracing errors must not affect embedding
      }

      try {
        const response = await client.embeddings.create(
          { model: embedModel, input: texts },
          { signal },
        );
        const vectors = response.data
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((d) => d.embedding);
        endGenerationSafe(generation, {
          output: `${vectors.length} vectors`,
          usage: response.usage ? { input: response.usage.prompt_tokens, output: 0 } : undefined,
        });
        return vectors;
      } catch (err: unknown) {
        endGenerationSafe(generation, {
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}
