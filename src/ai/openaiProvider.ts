import OpenAI from "openai";
import type { LangfuseTrace } from "./tracing.js";
import type { AIProvider, RepoInput, AnalysisResult } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildAnalyzeRepoPrompt } from "./prompts.js";
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
  trace?: LangfuseTrace | null,
  apiKey: string = process.env.OPENAI_API_KEY!,
  model: string = process.env.OPENAI_MODEL ?? "gpt-4o-mini",
): AIProvider {
  if (!apiKey) {
    if (typeof console !== "undefined") {
      console.error("Error: OPENAI_API_KEY is required for the openai backend");
    }
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  return {
    modelId: `openai/${model}`,

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

      // Make OpenAI API call
      let completion: OpenAICompletion;
      try {
        completion = (await client.chat.completions.create({
          model,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        })) as OpenAICompletion;
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
  };
}
