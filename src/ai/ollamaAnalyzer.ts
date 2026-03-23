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

export function createOllamaAnalyzer(model = 'llama3'): Analyzer {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

  return {
    async analyze(input: RepoInput): Promise<AnalysisResult> {
      let response: Response;
      try {
        response = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: buildUserMessage(input) },
            ],
          }),
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `Ollama unreachable for ${input.owner}/${input.name}: ${message}`
        );
        return { category: 'analysis-failed', killerFeature: '' };
      }

      if (!response.ok) {
        console.error(
          `Ollama error for ${input.owner}/${input.name}: HTTP ${response.status}`
        );
        return { category: 'analysis-failed', killerFeature: '' };
      }

      const body = await response.json() as { message?: { content?: string } };
      const content = body.message?.content ?? '';

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const parsed = responseSchema.parse(JSON.parse(jsonStr));
        return parsed;
      } catch {
        console.warn(
          `Warning: could not parse Ollama response for ${input.owner}/${input.name}, using raw text`
        );
        return { category: content.trim() || 'analysis-failed', killerFeature: '' };
      }
    },
  };
}
