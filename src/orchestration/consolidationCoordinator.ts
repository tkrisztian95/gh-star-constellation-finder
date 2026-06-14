import {
  buildConsolidationPrompt,
  buildConsolidationReducerPrompt,
  buildLanguageQualifierPrompt,
  buildReroutingPrompt,
} from "../ai/prompts.js";
import type { ExistingListContext } from "../ai/prompts.js";
import type { ConsolidationResult, AIProvider } from "../ai/types.js";
import type { ConsolidationStrategy } from "../types.js";
import type { LangfuseParent } from "../ai/tracing.js";
import { createPhaseSpan, endSpanSafe } from "../ai/tracing.js";
import {
  CONSOLIDATION_CHUNK_SIZE,
  GITHUB_MAX_LISTS,
  buildConsolidationResult,
  buildMergeWarnings,
  chunkProposedNames,
  identityResult,
  nullRerouteMap,
  parseRemapping,
  parseReroutingResponse,
} from "../ai/consolidatorDelegator.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { logger } from "../logger.js";

function logParseFailure(phase: string, content: string, err: unknown): void {
  logger.warn("consolidation JSON parse failed", {
    phase,
    contentLen: content.length,
    contentHead: content.slice(0, 200),
    contentTail: content.slice(-200),
    error: err instanceof Error ? err.message : String(err),
  });
}

async function runChunkedConsolidation(
  deduplicatedNames: string[],
  provider: AIProvider,
  effectiveExistingLists: ExistingListContext[],
  effectiveMaxLists: number,
  strategy: ConsolidationStrategy,
  distributionContext: string | undefined,
  consolidationSpan: LangfuseParent | null,
  signal?: AbortSignal,
  onProgress?: (tokenCount: number) => void,
): Promise<ConsolidationResult> {
  const chunks = chunkProposedNames(deduplicatedNames, CONSOLIDATION_CHUNK_SIZE);

  // Single-chunk fast path: behaves identically to the pre-chunking pass-2 —
  // one call, span name `consolidate-categories`, parse failure propagates to
  // the outer catch in consolidateCategories (identity fallback for the run).
  if (chunks.length <= 1) {
    const prompt = buildConsolidationPrompt(
      deduplicatedNames,
      effectiveExistingLists,
      effectiveMaxLists,
      strategy,
      distributionContext,
    );
    const content = await provider.complete(prompt, "consolidate-categories", consolidationSpan, {
      signal,
      onProgress,
    });
    let remapping: Map<string, string>;
    try {
      remapping = parseRemapping(content, deduplicatedNames);
    } catch (err) {
      logParseFailure("consolidate-categories", content, err);
      throw err;
    }
    return buildConsolidationResult(
      remapping,
      deduplicatedNames,
      effectiveExistingLists,
      effectiveMaxLists,
    );
  }

  // Multi-chunk map step: parallel, failure-isolated. Each chunk sees the same
  // existing-list context and budget so per-chunk invariants hold individually.
  const chunkOutcomes = await Promise.allSettled(
    chunks.map(async (chunkNames, i) => {
      const prompt = buildConsolidationPrompt(
        chunkNames,
        effectiveExistingLists,
        effectiveMaxLists,
        strategy,
        distributionContext,
      );
      const generationName = `consolidate-categories-chunk-${i + 1}`;
      let content = "";
      try {
        content = await provider.complete(prompt, generationName, consolidationSpan, { signal });
        return { chunkNames, remapping: parseRemapping(content, chunkNames) };
      } catch (err) {
        logParseFailure("consolidate-categories", content, err);
        throw err;
      }
    }),
  );

  let failedChunks = 0;
  const composedRemapping = new Map<string, string>();
  for (let i = 0; i < chunkOutcomes.length; i++) {
    const outcome = chunkOutcomes[i];
    if (outcome.status === "fulfilled") {
      for (const [name, canonical] of outcome.value.remapping) {
        composedRemapping.set(name, canonical);
      }
    } else {
      failedChunks++;
      // Identity fallback for the names in this chunk; other chunks survive.
      for (const name of chunks[i]) composedRemapping.set(name, name);
    }
  }

  logger.info("consolidation chunks complete", {
    chunkCount: chunks.length,
    chunkSize: CONSOLIDATION_CHUNK_SIZE,
    failedChunks,
  });

  // Reducer step: if the union of new canonicals from the chunked map exceeds
  // the global budget, run one extra LLM call to merge them semantically.
  // enforcebudget below still acts as a deterministic safety net if reducer
  // fails or under-merges.
  const existingListLower = new Set(effectiveExistingLists.map((l) => l.name.toLowerCase().trim()));
  const distinctNewCanonicals = new Set<string>();
  for (const canonical of composedRemapping.values()) {
    if (!existingListLower.has(canonical.toLowerCase().trim())) {
      distinctNewCanonicals.add(canonical);
    }
  }
  const budget = effectiveMaxLists - effectiveExistingLists.length;

  if (distinctNewCanonicals.size <= budget) {
    logger.info("consolidation reducer skipped", {
      canonicalCount: distinctNewCanonicals.size,
      budget,
    });
  } else {
    const canonicalsArray = [...distinctNewCanonicals];
    const reducerPrompt = buildConsolidationReducerPrompt(
      canonicalsArray,
      effectiveExistingLists,
      effectiveMaxLists,
    );
    let reducerContent = "";
    try {
      reducerContent = await provider.complete(
        reducerPrompt,
        "consolidate-categories-reduce",
        consolidationSpan,
        { signal, onProgress },
      );
      const reducerMap = parseRemapping(reducerContent, canonicalsArray);
      for (const [name, currentCanonical] of composedRemapping) {
        const finalCanonical = reducerMap.get(currentCanonical) ?? currentCanonical;
        composedRemapping.set(name, finalCanonical);
      }
      logger.info("consolidation reducer applied", {
        canonicalsIn: canonicalsArray.length,
        canonicalsOut: new Set(reducerMap.values()).size,
      });
    } catch (err) {
      logParseFailure("consolidate-categories-reduce", reducerContent, err);
      // Fall through with the pre-reducer composedRemapping —
      // enforcebudget in buildConsolidationResult is the safety net.
    }
  }

  // Global budget enforcement happens here on the (possibly reducer-applied)
  // composed remapping — enforcebudget collapses any still-over-budget
  // canonicals into the largest group.
  return buildConsolidationResult(
    composedRemapping,
    deduplicatedNames,
    effectiveExistingLists,
    effectiveMaxLists,
  );
}

export async function consolidateCategories(
  proposedNames: string[],
  provider: AIProvider,
  existingLists: ExistingListContext[] = [],
  maxLists: number = GITHUB_MAX_LISTS,
  strategy: ConsolidationStrategy = "keep-existing",
  parent?: LangfuseParent | null,
  analyzedRepos?: AnalyzedRepo[],
  onSubStep?: (message: string) => void,
  signal?: AbortSignal,
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
      let content = "";
      try {
        content = await provider.complete(
          prompt,
          "deduplicate-language-qualifiers",
          consolidationSpan,
        );
        return parseRemapping(content, proposedNames);
      } catch (err) {
        logParseFailure("deduplicate-language-qualifiers", content, err);
        // Safe fallback: pass all names through unchanged; pass 2 will still run
        return new Map(proposedNames.map((n) => [n, n]));
      }
    })();

    const deduplicatedNames = [...new Set(proposedNames.map((n) => pass1Map.get(n) ?? n))];

    // Pass 2: budget-aware consolidation on the reduced set, chunked to keep
    // any individual LLM call's prompt and output bounded regardless of N.
    const pass2Result = await runChunkedConsolidation(
      deduplicatedNames,
      provider,
      effectiveExistingLists,
      effectiveMaxLists,
      strategy,
      distributionContext,
      consolidationSpan,
      signal,
      onSubStep
        ? (tokenCount) => onSubStep(`Consolidating categories… ${tokenCount} tokens`)
        : undefined,
    );

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
