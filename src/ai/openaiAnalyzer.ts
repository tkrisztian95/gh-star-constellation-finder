import OpenAI from 'openai';
import { z } from 'zod';
import type { Analyzer, RepoInput, AnalysisResult } from './types.js';

const SYSTEM_PROMPT =
  "You are a technical librarian. Analyze the provided README content. " +
  "Categorize it into a short 2-3 word topic (e.g., 'Vector Databases' or 'Rust CLI Tools') " +
  "and provide one 'Killer Feature' in under 10 words.";

const responseSchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
});

function buildUserMessage(input: RepoInput): string {
  return [
    `Repository: ${input.owner}/${input.name}`,
    `Description: ${input.description || 'N/A'}`,
    `Language: ${input.language ?? 'N/A'}`,
    `Topics: ${input.topics.join(', ') || 'N/A'}`,
    '',
    'README:',
    input.readme || '(no README)',
    '',
    'Respond in JSON with keys "category" and "killerFeature".',
  ].join('\n');
}

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
          { role: 'system', content: SYSTEM_PROMPT },
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
