import type { ExistingListContext } from "./prompts.js";
import type { ConsolidationResult } from "./types.js";

export const GITHUB_MAX_LISTS = 32;

// Max number of proposed names per consolidation pass-2 batch. Keeps each
// LLM prompt + output small enough to never overrun model budgets at scale —
// the structural fix behind #32 (and the failure class of #26, #28, #30).
export const CONSOLIDATION_CHUNK_SIZE = 25;

export function chunkProposedNames(names: string[], size: number): string[][] {
  if (size <= 0) throw new Error("chunkProposedNames: size must be > 0");
  if (names.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += size) {
    chunks.push(names.slice(i, i + size));
  }
  return chunks;
}

export function identityResult(names: string[]): ConsolidationResult {
  return {
    remapping: new Map(names.map((n) => [n, n])),
    mergeWarnings: [],
  };
}

export function parseRemapping(json: string, proposedNames: string[]): Map<string, string> {
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

export function buildConsolidationResult(
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

export function parseReroutingResponse(
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

export function nullRerouteMap(orphanCategories: string[]): Map<string, string | null> {
  return new Map(orphanCategories.map((c) => [c, null]));
}
