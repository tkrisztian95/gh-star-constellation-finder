import OpenAI from "openai";
import {
  buildConsolidationPrompt,
  buildLanguageQualifierPrompt,
  buildReroutingPrompt,
} from "./prompts.js";
import type { ExistingListContext } from "./prompts.js";
import type { ConsolidationResult } from "./types.js";
import type { ConsolidationStrategy } from "../types.js";
import type { LangfuseTrace } from "./tracing.js";

const GITHUB_MAX_LISTS = 32;

// Returns an identity ConsolidationResult — no merges, no warnings.
function identityResult(names: string[]): ConsolidationResult {
  return {
    remapping: new Map(names.map((n) => [n, n])),
    mergeWarnings: [],
  };
}

function parseRemapping(json: string, proposedNames: string[]): Map<string, string> {
  // Strip BOM, leading/trailing whitespace, and optional markdown fences that
  // some models (or Bun's stricter JSC JSON.parse) would otherwise reject.
  const sanitized = json
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "");
  const raw = JSON.parse(sanitized) as Record<string, unknown>;
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
  parent?: LangfuseTrace | null,
): Promise<ConsolidationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = "gpt-4o-mini";
  const client = new OpenAI({ apiKey });
  const prompt = buildConsolidationPrompt(proposedNames, existingLists, maxLists, strategy);

  let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
  try {
    if (parent) {
      generation = parent.generation({
        name: "consolidate-categories",
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
          ? { input: completion.usage.prompt_tokens, output: completion.usage.completion_tokens }
          : undefined,
      });
    }
  } catch {
    // tracing errors must not affect consolidation
  }

  const remapping = parseRemapping(content, proposedNames);
  return buildResult(remapping, proposedNames, existingLists, maxLists);
}

async function consolidateViaOllama(
  proposedNames: string[],
  existingLists: ExistingListContext[],
  maxLists: number,
  strategy: ConsolidationStrategy,
  parent?: LangfuseTrace | null,
): Promise<ConsolidationResult> {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  const model = "llama3";
  const prompt = buildConsolidationPrompt(proposedNames, existingLists, maxLists, strategy);

  let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
  try {
    if (parent) {
      generation = parent.generation({
        name: "consolidate-categories",
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

  const remapping = parseRemapping(content, proposedNames);
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

async function runDeduplicationPass(
  proposedNames: string[],
  useOllama: boolean,
  parent?: LangfuseTrace | null,
): Promise<Map<string, string>> {
  const prompt = buildLanguageQualifierPrompt(proposedNames);

  let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
  try {
    if (parent) {
      const model = useOllama ? "llama3" : "gpt-4o-mini";
      generation = parent.generation({
        name: "deduplicate-language-qualifiers",
        model,
        input: [{ role: "user", content: prompt }],
      });
    }
  } catch {
    // tracing errors must not affect deduplication
  }

  try {
    let content: string;

    if (useOllama) {
      const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
      const response = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL ?? "llama3",
          stream: false,
          options: { num_ctx: 8192 },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) throw new Error(`Ollama error: HTTP ${response.status}`);
      const body = (await response.json()) as { message?: { content?: string } };
      const raw = body.message?.content ?? "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      content = jsonMatch ? jsonMatch[0] : raw;
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY not set");
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });
      content = completion.choices[0]?.message?.content ?? "{}";
    }

    try {
      if (generation) generation.end({ output: content });
    } catch {
      // tracing errors must not affect deduplication
    }

    return parseRemapping(content, proposedNames);
  } catch (err) {
    try {
      if (generation) {
        generation.end({
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } catch {
      // tracing errors must not affect deduplication
    }
    // Safe fallback: pass all names through unchanged; pass 2 will still run
    return new Map(proposedNames.map((n) => [n, n]));
  }
}

export async function consolidateCategories(
  proposedNames: string[],
  existingLists: ExistingListContext[] = [],
  maxLists: number = GITHUB_MAX_LISTS,
  strategy: ConsolidationStrategy = "keep-existing",
  parent?: LangfuseTrace | null,
): Promise<ConsolidationResult> {
  if (proposedNames.length < 2) {
    return identityResult(proposedNames);
  }

  const effectiveExistingLists = strategy === "recreate" ? [] : existingLists;
  const effectiveMaxLists = strategy === "recreate" ? GITHUB_MAX_LISTS : maxLists;

  const useOllama = !process.env.OPENAI_API_KEY && !!process.env.OLLAMA_HOST;

  try {
    // Pass 1: merge language/platform qualifier variants only (no budget pressure)
    const pass1Map = await runDeduplicationPass(proposedNames, useOllama, parent);
    const deduplicatedNames = [...new Set(proposedNames.map((n) => pass1Map.get(n) ?? n))];

    // Pass 2: budget-aware consolidation on the reduced set
    const pass2Result = useOllama
      ? await consolidateViaOllama(
          deduplicatedNames,
          effectiveExistingLists,
          effectiveMaxLists,
          strategy,
          parent,
        )
      : await consolidateViaOpenAI(
          deduplicatedNames,
          effectiveExistingLists,
          effectiveMaxLists,
          strategy,
          parent,
        );

    // Compose: original → pass1 deduped → pass2 final
    const composedRemapping = new Map<string, string>();
    for (const name of proposedNames) {
      const deduped = pass1Map.get(name) ?? name;
      const final = pass2Result.remapping.get(deduped) ?? deduped;
      composedRemapping.set(name, final);
    }

    return {
      remapping: composedRemapping,
      mergeWarnings: [...buildMergeWarnings(pass1Map, proposedNames), ...pass2Result.mergeWarnings],
    };
  } catch (err) {
    const warning = `Warning: category consolidation failed (${err instanceof Error ? err.message : String(err)}), using original names`;
    const result = identityResult(proposedNames);
    result.mergeWarnings.push(warning);
    return result;
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
  parent?: LangfuseTrace | null,
): Promise<Map<string, string | null>> {
  if (orphans.length === 0 || availableTargets.length === 0) {
    return nullRerouteMap(orphans.map((o) => o.category));
  }

  const orphanCategories = orphans.map((o) => o.category);
  const prompt = buildReroutingPrompt(orphans, availableTargets);
  const useOllama = !process.env.OPENAI_API_KEY && !!process.env.OLLAMA_HOST;

  let generation: ReturnType<LangfuseTrace["generation"]> | undefined;
  try {
    if (parent) {
      const model = useOllama ? (process.env.OLLAMA_MODEL ?? "llama3") : "gpt-4o-mini";
      generation = parent.generation({
        name: "reroute-orphan-repos",
        model,
        input: [{ role: "user", content: prompt }],
      });
    }
  } catch {
    // tracing errors must not affect rerouting
  }

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
          options: { num_ctx: 8192 },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) throw new Error(`Ollama rerouting error: HTTP ${response.status}`);
      const body = (await response.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      const raw = body.message?.content ?? "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      content = jsonMatch ? jsonMatch[0] : raw;
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
        // tracing errors must not affect rerouting
      }
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY not set");
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });
      content = completion.choices[0]?.message?.content ?? "{}";
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
        // tracing errors must not affect rerouting
      }
    }

    return parseReroutingResponse(content, orphanCategories);
  } catch (err: unknown) {
    try {
      if (generation) {
        generation.end({
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } catch {
      // tracing errors must not affect rerouting
    }
    return nullRerouteMap(orphanCategories);
  }
}
