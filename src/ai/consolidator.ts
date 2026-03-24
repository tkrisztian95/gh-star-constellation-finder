import OpenAI from 'openai';
import { buildConsolidationPrompt } from './prompts.js';
import type { ConsolidationResult } from './types.js';

const GITHUB_MAX_LISTS = 32;

// Returns an identity ConsolidationResult — no merges, no warnings.
function identityResult(names: string[]): ConsolidationResult {
  return {
    remapping: new Map(names.map((n) => [n, n])),
    mergeWarnings: [],
  };
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

export function buildMergeWarnings(
  remapping: Map<string, string>,
  proposedNames: string[]
): string[] {
  const warnings: string[] = [];
  for (const name of proposedNames) {
    const canonical = remapping.get(name);
    if (canonical && canonical !== name) {
      warnings.push(`"${name}" merged into "${canonical}" to stay within the ${GITHUB_MAX_LISTS}-list GitHub limit`);
    }
  }
  return warnings;
}

/**
 * Post-processing budget guard: if the AI produced more distinct new names than
 * the remaining budget allows, programmatically merge the smallest groups into
 * the largest until the budget is satisfied.
 */
export function enforcebudget(
  remapping: Map<string, string>,
  proposedNames: string[],
  existingListNamesLower: Set<string>,
  budget: number
): { remapping: Map<string, string>; extraWarnings: string[] } {
  // Group proposed names by their current canonical target (new lists only)
  const groups = new Map<string, string[]>(); // canonical → [originalNames]
  for (const name of proposedNames) {
    const canonical = remapping.get(name) ?? name;
    if (existingListNamesLower.has(canonical.toLowerCase().trim())) continue;
    const group = groups.get(canonical) ?? [];
    group.push(name);
    groups.set(canonical, group);
  }

  const extraWarnings: string[] = [];

  if (groups.size <= budget) {
    return { remapping, extraWarnings };
  }

  // Sort groups: largest first (we keep the largest, merge others into it)
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const winner = sorted[0][0]; // largest group's canonical name

  const updatedRemapping = new Map(remapping);

  // Keep top `budget` groups as-is, merge the rest into the winner
  for (let i = budget; i < sorted.length; i++) {
    const [canonical, originalNames] = sorted[i];
    for (const orig of originalNames) {
      updatedRemapping.set(orig, winner);
      if (canonical !== winner) {
        extraWarnings.push(
          `"${orig}" (was "${canonical}") merged into "${winner}" — GitHub list budget exceeded`
        );
      }
    }
  }

  return { remapping: updatedRemapping, extraWarnings };
}

async function consolidateViaOpenAI(
  proposedNames: string[],
  existingListNames: string[],
  maxLists: number
): Promise<ConsolidationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: buildConsolidationPrompt(proposedNames, existingListNames, maxLists) }],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const remapping = parseRemapping(content, proposedNames);
  return buildResult(remapping, proposedNames, existingListNames, maxLists);
}

async function consolidateViaOllama(
  proposedNames: string[],
  existingListNames: string[],
  maxLists: number
): Promise<ConsolidationResult> {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const model = 'llama3';

  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: buildConsolidationPrompt(proposedNames, existingListNames, maxLists) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama consolidation error: HTTP ${response.status}`);
  }

  const body = await response.json() as { message?: { content?: string } };
  const content = body.message?.content ?? '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const remapping = parseRemapping(jsonMatch ? jsonMatch[0] : content, proposedNames);
  return buildResult(remapping, proposedNames, existingListNames, maxLists);
}

function buildResult(
  remapping: Map<string, string>,
  proposedNames: string[],
  existingListNames: string[],
  maxLists: number
): ConsolidationResult {
  const warnings = buildMergeWarnings(remapping, proposedNames);
  const existingListNamesLower = new Set(existingListNames.map((n) => n.toLowerCase().trim()));
  const budget = maxLists - existingListNames.length;

  const { remapping: finalRemapping, extraWarnings } = enforcebudget(
    remapping,
    proposedNames,
    existingListNamesLower,
    budget
  );

  return {
    remapping: finalRemapping,
    mergeWarnings: [...warnings, ...extraWarnings],
  };
}

export async function consolidateCategories(
  proposedNames: string[],
  existingListNames: string[] = [],
  maxLists: number = GITHUB_MAX_LISTS
): Promise<ConsolidationResult> {
  if (proposedNames.length < 2) {
    return identityResult(proposedNames);
  }

  const useOllama = !process.env.OPENAI_API_KEY && !!process.env.OLLAMA_HOST;

  try {
    return useOllama
      ? await consolidateViaOllama(proposedNames, existingListNames, maxLists)
      : await consolidateViaOpenAI(proposedNames, existingListNames, maxLists);
  } catch (err) {
    console.warn(
      `Warning: category consolidation failed (${err instanceof Error ? err.message : String(err)}), using original names`
    );
    return identityResult(proposedNames);
  }
}
