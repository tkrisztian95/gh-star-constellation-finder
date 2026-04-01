import {
  buildConsolidationPrompt,
  buildLanguageQualifierPrompt,
  buildReroutingPrompt,
} from "../ai/prompts.js";
import type { ExistingListContext } from "../ai/prompts.js";
import type { ConsolidationResult, AIProvider } from "../ai/types.js";
import type { ConsolidationStrategy } from "../types.js";
import type { LangfuseTrace } from "../ai/tracing.js";
import {
  GITHUB_MAX_LISTS,
  identityResult,
  parseRemapping,
  buildMergeWarnings,
  buildConsolidationResult,
  parseReroutingResponse,
  nullRerouteMap,
} from "../ai/consolidatorDelegator.js";

export async function consolidateCategories(
  proposedNames: string[],
  provider: AIProvider,
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

  try {
    // Pass 1: merge language/platform qualifier variants only (no budget pressure)
    const pass1Map = await (async () => {
      const prompt = buildLanguageQualifierPrompt(proposedNames);
      try {
        const content = await provider.complete(prompt, "deduplicate-language-qualifiers", parent);
        return parseRemapping(content, proposedNames);
      } catch {
        // Safe fallback: pass all names through unchanged; pass 2 will still run
        return new Map(proposedNames.map((n) => [n, n]));
      }
    })();

    const deduplicatedNames = [...new Set(proposedNames.map((n) => pass1Map.get(n) ?? n))];

    // Pass 2: budget-aware consolidation on the reduced set
    const pass2Result = await (async () => {
      const prompt = buildConsolidationPrompt(
        deduplicatedNames,
        effectiveExistingLists,
        effectiveMaxLists,
        strategy,
      );
      const content = await provider.complete(prompt, "consolidate-categories", parent);
      const remapping = parseRemapping(content, deduplicatedNames);
      return buildConsolidationResult(
        remapping,
        deduplicatedNames,
        effectiveExistingLists,
        effectiveMaxLists,
      );
    })();

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

export async function rerouteOrphanRepos(
  orphans: { category: string }[],
  availableTargets: string[],
  provider: AIProvider,
  parent?: LangfuseTrace | null,
): Promise<Map<string, string | null>> {
  if (orphans.length === 0 || availableTargets.length === 0) {
    return nullRerouteMap(orphans.map((o) => o.category));
  }

  const orphanCategories = orphans.map((o) => o.category);
  const prompt = buildReroutingPrompt(orphans, availableTargets);

  try {
    const content = await provider.complete(prompt, "reroute-orphan-repos", parent);
    return parseReroutingResponse(content, orphanCategories);
  } catch {
    return nullRerouteMap(orphanCategories);
  }
}
