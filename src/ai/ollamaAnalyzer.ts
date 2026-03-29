import type { LangfuseTrace } from "./tracing.js";
import type { Analyzer, RepoInput, AnalysisResult } from "./types.js";
import { parseAnalysisResponse } from "./types.js";
import { buildSystemPrompt, buildUserMessage } from "./prompts.js";

export function createOllamaAnalyzer(
  model = process.env.OLLAMA_MODEL ?? "llama3",
  parent?: LangfuseTrace | null,
): Analyzer {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";

  return {
    modelId: `ollama/${model}`,
    async analyze(input: RepoInput, signal?: AbortSignal): Promise<AnalysisResult> {
      const systemPrompt = buildSystemPrompt(input.existingListNames ?? []);
      const userMessage = buildUserMessage(input);

      let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
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
        return { category: "analysis-failed", killerFeature: "" };
      }

      if (!response.ok) {
        console.error(`Ollama error for ${input.owner}/${input.name}: HTTP ${response.status}`);
        return { category: "analysis-failed", killerFeature: "" };
      }

      const body = (await response.json()) as { message?: { content?: string } };
      const content = body.message?.content ?? "";

      try {
        if (generation) {
          generation.end({ output: content });
        }
      } catch {
        // tracing errors must not affect analysis
      }

      return parseAnalysisResponse(content, "analysis-failed");
    },
  };
}
