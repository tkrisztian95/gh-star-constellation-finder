import {
  buildConsolidationPrompt,
  buildLanguageQualifierPrompt,
  buildReroutingPrompt,
} from "../ai/prompts.js";
import type { ExistingListContext } from "../ai/prompts.js";
import type { ConsolidationResult, AIProvider } from "../ai/types.js";
import type { ConsolidationStrategy } from "../types.js";
import type { LangfuseParent } from "../ai/tracing.js";
import { createPhaseSpan, endSpanSafe } from "../ai/tracing.js";
import {
  GITHUB_MAX_LISTS,
  identityResult,
  parseRemapping,
  buildMergeWarnings,
  buildConsolidationResult,
  parseReroutingResponse,
  nullRerouteMap,
} from "../ai/consolidatorDelegator.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";

export async function consolidateCategories(
  proposedNames: string[],
  provider: AIProvider,
  existingLists: ExistingListContext[] = [],
  maxLists: number = GITHUB_MAX_LISTS,
  strategy: ConsolidationStrategy = "keep-existing",
  parent?: LangfuseParent | null,
  analyzedRepos?: AnalyzedRepo[],
  onSubStep?: (message: string) => void,
): Promise<ConsolidationResult> {
  if (proposedNames.length < 2) {
    return identityResult(proposedNames);
  }

  const effectiveExistingLists = strategy === "recreate" ? [] : existingLists;
  const effectiveMaxLists = strategy === "recreate" ? GITHUB_MAX_LISTS : maxLists;

  const consolidationSpan = createPhaseSpan(parent ?? null, "consolidation-phase", {
    strategy,
    existingListCount: existingLists.length,
    proposedCategoryCount: proposedNames.length,
  });

  try {
    // Build distribution context deterministically from analyzedRepos
    let distributionContext: string | undefined;
    if (analyzedRepos && analyzedRepos.length > 0) {
      const categoryMap = new Map<string, { count: number; topicFreq: Map<string, number> }>();
      for (const { repo, analysis } of analyzedRepos) {
        const cat = analysis.category;
        let entry = categoryMap.get(cat);
        if (!entry) {
          entry = { count: 0, topicFreq: new Map() };
          categoryMap.set(cat, entry);
        }
        entry.count++;
        for (const topic of repo.topics) {
          entry.topicFreq.set(topic, (entry.topicFreq.get(topic) ?? 0) + 1);
        }
      }
      const lines: string[] = [];
      for (const [cat, { count, topicFreq }] of categoryMap) {
        const topTopics = [...topicFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t);
        const topicsStr = topTopics.length > 0 ? topTopics.join(", ") : "(none)";
        lines.push(`${cat}: ${count} repos, top topics: ${topicsStr}`);
      }
      if (lines.length > 0) distributionContext = lines.join("\n");
    }

    onSubStep?.("Consolidating categories…");

    // Pass 1: merge language/platform qualifier variants only (no budget pressure)
    const pass1Map = await (async () => {
      const prompt = buildLanguageQualifierPrompt(proposedNames);
      try {
        const content = await provider.complete(
          prompt,
          "deduplicate-language-qualifiers",
          consolidationSpan,
        );
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
        distributionContext,
      );
      const content = await provider.complete(prompt, "consolidate-categories", consolidationSpan);
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

    const finalCategoryCount = new Set(composedRemapping.values()).size;
    endSpanSafe(consolidationSpan, { output: { finalCategoryCount } });
    return {
      remapping: composedRemapping,
      mergeWarnings: [...buildMergeWarnings(pass1Map, proposedNames), ...pass2Result.mergeWarnings],
    };
  } catch (err) {
    endSpanSafe(consolidationSpan, {
      level: "ERROR",
      statusMessage: err instanceof Error ? err.message : String(err),
    });
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
  parent?: LangfuseParent | null,
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
