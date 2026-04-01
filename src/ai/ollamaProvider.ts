import type { LangfuseTrace } from "./tracing.js";
import type { AIProvider, RepoInput, AnalysisResult } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildUserMessage } from "./prompts.js";

export function createOllamaProvider(
  model = process.env.OLLAMA_MODEL ?? "llama3",
  trace?: LangfuseTrace | null,
): AIProvider {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";

  return {
    modelId: `ollama/${model}`,

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
        console.error(`Ollama unreachable for ${input.owner}/${input.name}: ${message}`);
        try {
          if (generation) generation.end({ level: "ERROR", statusMessage: message });
        } catch {
          // tracing errors must not affect analysis
        }
        return { category: "analysis-failed", killerFeature: "" };
      }

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        console.error(`Ollama error for ${input.owner}/${input.name}: ${message}`);
        try {
          if (generation) generation.end({ level: "ERROR", statusMessage: message });
        } catch {
          // tracing errors must not affect analysis
        }
        return { category: "analysis-failed", killerFeature: "" };
      }

      const body = (await response.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      const content = body.message?.content ?? "";

      try {
        if (generation) {
          generation.end({
            output: content,
            usage:
              body.prompt_eval_count !== undefined
                ? { input: body.prompt_eval_count, output: body.eval_count ?? 0 }
                : undefined,
          });
        }
      } catch {
        // tracing errors must not affect analysis
      }

      return parseAnalysisResponse(content, "analysis-failed");
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

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        try {
          if (generation) generation.end({ level: "ERROR", statusMessage: message });
        } catch {
          // tracing errors must not affect consolidation
        }
        throw new Error(`Ollama consolidation error: ${message}`);
      }

      const body = (await response.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      const raw = body.message?.content ?? "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const content = jsonMatch ? jsonMatch[0] : raw;

      try {
        if (generation) {
          generation.end({
            output: content,
            usage:
              body.prompt_eval_count !== undefined
                ? { input: body.prompt_eval_count, output: body.eval_count ?? 0 }
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
