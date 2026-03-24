import OpenAI from 'openai';
import { z } from 'zod';
import type { Langfuse } from 'langfuse';
import type { Analyzer, RepoInput, AnalysisResult } from './types.js';
import { buildSystemPrompt, buildUserMessage } from './prompts.js';

const responseSchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
  dataQuality: z.enum(['full', 'sparse']).optional(),
});

export function createOpenAIAnalyzer(langfuse?: Langfuse | null): Analyzer {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY is required for the openai backend');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  return {
    async analyze(input: RepoInput): Promise<AnalysisResult> {
      const model = 'gpt-4o-mini';
      const systemPrompt = buildSystemPrompt(input.existingListNames ?? []);
      const userMessage = buildUserMessage(input);

      let generation: ReturnType<Langfuse['generation']> | undefined;
      try {
        if (langfuse) {
          generation = langfuse.generation({
            name: `analyze-${input.owner}/${input.name}`,
            model,
            input: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
          });
        }
      } catch {
        // tracing errors must not affect analysis
      }

      const completion = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? '';

      try {
        if (generation) {
          generation.end({
            output: content,
            usage: completion.usage
              ? { input: completion.usage.prompt_tokens, output: completion.usage.completion_tokens }
              : undefined,
          });
        }
      } catch {
        // tracing errors must not affect analysis
      }

      try {
        const parsed = responseSchema.parse(JSON.parse(content));
        return parsed;
      } catch {
        console.warn(
          `Warning: could not parse AI response for ${input.owner}/${input.name}, using raw text`
        );
        return { category: content, killerFeature: '' };
      }
    },
  };
}
