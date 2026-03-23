import OpenAI from 'openai';
import { z } from 'zod';
import type { Analyzer, RepoInput, AnalysisResult } from './types.js';
import { buildSystemPrompt, buildUserMessage } from './prompts.js';

const responseSchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
  dataQuality: z.enum(['full', 'sparse']).optional(),
});

export function createOpenAIAnalyzer(): Analyzer {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY is required for the openai backend');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  return {
    async analyze(input: RepoInput): Promise<AnalysisResult> {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt(input.existingListNames ?? []) },
          { role: 'user', content: buildUserMessage(input) },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? '';
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
