import OpenAI from 'openai';
import { buildConsolidationPrompt } from './prompts.js';

// Returns an identity map (each name maps to itself) — no AI call needed.
function identityMap(names: string[]): Map<string, string> {
  return new Map(names.map((n) => [n, n]));
}

function parseRemapping(json: string, proposedNames: string[]): Map<string, string> {
  const raw = JSON.parse(json) as Record<string, unknown>;
  const result = new Map<string, string>();
  for (const name of proposedNames) {
    const mapped = raw[name];
    result.set(name, typeof mapped === 'string' && mapped.trim() ? mapped.trim() : name);
  }
  return result;
}

async function consolidateViaOpenAI(proposedNames: string[]): Promise<Map<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: buildConsolidationPrompt(proposedNames) }],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  return parseRemapping(content, proposedNames);
}

async function consolidateViaOllama(proposedNames: string[]): Promise<Map<string, string>> {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const model = 'llama3';

  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: buildConsolidationPrompt(proposedNames) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama consolidation error: HTTP ${response.status}`);
  }

  const body = await response.json() as { message?: { content?: string } };
  const content = body.message?.content ?? '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return parseRemapping(jsonMatch ? jsonMatch[0] : content, proposedNames);
}

export async function consolidateCategories(
  proposedNames: string[]
): Promise<Map<string, string>> {
  if (proposedNames.length < 2) {
    return identityMap(proposedNames);
  }

  const useOllama = !process.env.OPENAI_API_KEY && !!process.env.OLLAMA_HOST;

  try {
    return useOllama
      ? await consolidateViaOllama(proposedNames)
      : await consolidateViaOpenAI(proposedNames);
  } catch (err) {
    console.warn(
      `Warning: category consolidation failed (${err instanceof Error ? err.message : String(err)}), using original names`
    );
    return identityMap(proposedNames);
  }
}
