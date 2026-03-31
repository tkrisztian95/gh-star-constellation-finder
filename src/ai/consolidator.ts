import OpenAI from "openai";
import { buildConsolidationPrompt, buildReroutingPrompt } from "./prompts.js";
import type { ExistingListContext } from "./prompts.js";
import type { ConsolidationResult } from "./types.js";
import type { ConsolidationStrategy } from "../types.js";

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
    result.set(name, typeof mapped === "string" && mapped.trim() ? mapped.trim() : name);
  }
  return result;
}

export function buildMergeWarnings(
  remapping: Map<string, string>,
  proposedNames: string[],
): string[] {
  const warnings: string[] = [];
  for (const name of proposedNames) {
    const canonical = remapping.get(name);
    if (canonical && canonical !== name) {
      warnings.push(`"${name}" merged into "${canonical}"`);
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
  budget: number,
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
  const budgetMerged: { orig: string; canonical: string }[] = [];

  // Keep top `budget` groups as-is, merge the rest into the winner
  for (let i = budget; i < sorted.length; i++) {
    const [canonical, originalNames] = sorted[i];
    for (const orig of originalNames) {
      updatedRemapping.set(orig, winner);
      if (canonical !== winner) {
        budgetMerged.push({ orig, canonical });
      }
    }
  }

  const SUMMARY_THRESHOLD = 3;
  if (budgetMerged.length > SUMMARY_THRESHOLD) {
    extraWarnings.push(
      `${budgetMerged.length} categories force-merged into "${winner}" (list budget exhausted)`,
    );
  } else {
    for (const { orig, canonical } of budgetMerged) {
      const wasClause = canonical !== orig ? ` (was "${canonical}")` : "";
      extraWarnings.push(`"${orig}"${wasClause} merged into "${winner}"`);
    }
  }

  return { remapping: updatedRemapping, extraWarnings };
}

async function consolidateViaOpenAI(
  proposedNames: string[],
  existingLists: ExistingListContext[],
  maxLists: number,
  strategy: ConsolidationStrategy,
): Promise<ConsolidationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: buildConsolidationPrompt(proposedNames, existingLists, maxLists, strategy),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const remapping = parseRemapping(content, proposedNames);
  return buildResult(remapping, proposedNames, existingLists, maxLists);
}

async function consolidateViaOllama(
  proposedNames: string[],
  existingLists: ExistingListContext[],
  maxLists: number,
  strategy: ConsolidationStrategy,
): Promise<ConsolidationResult> {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  const model = "llama3";

  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: "user",
          content: buildConsolidationPrompt(proposedNames, existingLists, maxLists, strategy),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama consolidation error: HTTP ${response.status}`);
  }

  const body = (await response.json()) as { message?: { content?: string } };
  const content = body.message?.content ?? "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const remapping = parseRemapping(jsonMatch ? jsonMatch[0] : content, proposedNames);
  return buildResult(remapping, proposedNames, existingLists, maxLists);
}

function buildResult(
  remapping: Map<string, string>,
  proposedNames: string[],
  existingLists: ExistingListContext[],
  maxLists: number,
): ConsolidationResult {
  const warnings = buildMergeWarnings(remapping, proposedNames);
  const existingListNamesLower = new Set(existingLists.map((l) => l.name.toLowerCase().trim()));
  const budget = maxLists - existingLists.length;

  const { remapping: finalRemapping, extraWarnings } = enforcebudget(
    remapping,
    proposedNames,
    existingListNamesLower,
    budget,
  );

  return {
    remapping: finalRemapping,
    mergeWarnings: [...warnings, ...extraWarnings],
  };
}

export async function consolidateCategories(
  proposedNames: string[],
  existingLists: ExistingListContext[] = [],
  maxLists: number = GITHUB_MAX_LISTS,
  strategy: ConsolidationStrategy = "keep-existing",
): Promise<ConsolidationResult> {
  if (proposedNames.length < 2) {
    return identityResult(proposedNames);
  }

  const effectiveExistingLists = strategy === "recreate" ? [] : existingLists;
  const effectiveMaxLists = strategy === "recreate" ? GITHUB_MAX_LISTS : maxLists;

  const useOllama = !process.env.OPENAI_API_KEY && !!process.env.OLLAMA_HOST;

  try {
    return useOllama
      ? await consolidateViaOllama(
          proposedNames,
          effectiveExistingLists,
          effectiveMaxLists,
          strategy,
        )
      : await consolidateViaOpenAI(
          proposedNames,
          effectiveExistingLists,
          effectiveMaxLists,
          strategy,
        );
  } catch (err) {
    console.warn(
      `Warning: category consolidation failed (${err instanceof Error ? err.message : String(err)}), using original names`,
    );
    return identityResult(proposedNames);
  }
}

function parseReroutingResponse(
  json: string,
  orphanCategories: string[],
): Map<string, string | null> {
  const result = new Map<string, string | null>();
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    for (const category of orphanCategories) {
      const mapped = raw[category];
      result.set(category, typeof mapped === "string" && mapped.trim() ? mapped.trim() : null);
    }
  } catch {
    for (const category of orphanCategories) {
      result.set(category, null);
    }
  }
  return result;
}

function nullRerouteMap(orphanCategories: string[]): Map<string, string | null> {
  return new Map(orphanCategories.map((c) => [c, null]));
}

export async function rerouteOrphanRepos(
  orphans: { category: string }[],
  availableTargets: string[],
): Promise<Map<string, string | null>> {
  if (orphans.length === 0 || availableTargets.length === 0) {
    return nullRerouteMap(orphans.map((o) => o.category));
  }

  const orphanCategories = orphans.map((o) => o.category);
  const prompt = buildReroutingPrompt(orphans, availableTargets);
  const useOllama = !process.env.OPENAI_API_KEY && !!process.env.OLLAMA_HOST;

  try {
    let content: string;

    if (useOllama) {
      const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
      const model = process.env.OLLAMA_MODEL ?? "llama3";
      const response = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) throw new Error(`Ollama rerouting error: HTTP ${response.status}`);
      const body = (await response.json()) as { message?: { content?: string } };
      const raw = body.message?.content ?? "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      content = jsonMatch ? jsonMatch[0] : raw;
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY not set");
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });
      content = completion.choices[0]?.message?.content ?? "{}";
    }

    return parseReroutingResponse(content, orphanCategories);
  } catch {
    return nullRerouteMap(orphanCategories);
  }
}
