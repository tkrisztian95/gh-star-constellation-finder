import OpenAI from "openai";
import type { LangfuseTrace } from "./tracing.js";
import type { AIProvider, RepoInput, AnalysisResult } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildUserMessage } from "./prompts.js";

export function createOpenAIProvider(trace?: LangfuseTrace | null): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY is required for the openai backend");
    process.exit(1);
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  return {
    modelId: `openai/${model}`,

    async analyze(input: RepoInput, signal?: AbortSignal): Promise<AnalysisResult> {
      const systemPrompt = buildSystemPrompt(input.existingListNames ?? []);
      const userMessage = buildUserMessage(input);

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

      let completion: Awaited<ReturnType<typeof client.chat.completions.create>>;
      try {
        completion = await client.chat.completions.create(
          {
            model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          },
          { signal },
        );
      } catch (err: unknown) {
        try {
          if (generation) {
            generation.end({
              level: "ERROR",
              statusMessage: err instanceof Error ? err.message : String(err),
            });
          }
        } catch {
          // tracing errors must not affect analysis
        }
        throw err;
      }

      const content = completion.choices[0]?.message?.content ?? "";

      try {
        if (generation) {
          generation.end({
            output: content,
            usage: completion.usage
              ? {
                  input: completion.usage.prompt_tokens,
                  output: completion.usage.completion_tokens,
                }
              : undefined,
          });
        }
      } catch {
        // tracing errors must not affect analysis
      }

      return parseAnalysisResponse(content);
    },

    async complete(
      prompt: string,
      generationName: string,
      parent?: LangfuseTrace | null,
    ): Promise<string> {
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

      let completion: Awaited<ReturnType<typeof client.chat.completions.create>>;
      try {
        completion = await client.chat.completions.create({
          model,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        });
      } catch (err: unknown) {
        try {
          if (generation) {
            generation.end({
              level: "ERROR",
              statusMessage: err instanceof Error ? err.message : String(err),
            });
          }
        } catch {
          // tracing errors must not affect consolidation
        }
        throw err;
      }

      const content = completion.choices[0]?.message?.content ?? "{}";

      try {
        if (generation) {
          generation.end({
            output: content,
            usage: completion.usage
              ? {
                  input: completion.usage.prompt_tokens,
                  output: completion.usage.completion_tokens,
                }
              : undefined,
          });
        }
      } catch {
        // tracing errors must not affect consolidation
      }

      return content;
    },
  };
}
