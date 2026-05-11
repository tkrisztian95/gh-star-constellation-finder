import fs from "fs";

import { consolidateCategories, rerouteOrphanRepos } from "./consolidationCoordinator.js";
import { generateSuggestions } from "../engine/suggestionEngine.js";
import type { AnalyzedRepo, ReroutedRepo } from "../engine/suggestionEngine.js";
import { generateSessionId, createPhaseSpan, endSpanSafe } from "../ai/tracing.js";
import type { LangfuseParent } from "../ai/tracing.js";
import type { fetchUserLists } from "../github/starFetcher.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import type { Repo, Suggestion, ConsolidationStrategy, ScopeMode, PhaseTimings } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import type { AIProvider } from "../ai/types.js";
import type { AnalysisTiming } from "./analysis.js";
import { logger } from "../logger.js";

export interface ReviewPhaseResult {
  suggestions: Suggestion[];
  count: number;
  reroutedRepos: ReroutedRepo[];
  sessionRunId: string;
  decisions: Map<number, ReviewDecision>;
  acceptedCount: number;
}

export interface ReviewPhaseParams {
  analyzedRepos: AnalyzedRepo[];
  lists: Awaited<ReturnType<typeof fetchUserLists>>;
  existingListNames: string[];
  strategy: ConsolidationStrategy;
  scopeMode: ScopeMode;
  parent: LangfuseParent | null;
  allRepos: Repo[];
  setPhase: (p: AppPhase) => void;
  reviewPromise: Promise<{ decisions: Map<number, ReviewDecision>; quit: boolean }>;
  summaryPromise: Promise<boolean>;
  savePromptPromise: Promise<string>;
  unmount: () => void;
  modelId: string;
  analysisStartTime: number;
  analysisErrorCount: number;
  login: string;
  provider: AIProvider;
  phaseTimings: PhaseTimings;
  analysisTimings: AnalysisTiming[];
}

// Returns only if the user confirmed to apply changes; otherwise calls process.exit()
export async function runReviewPhase({
  analyzedRepos,
  lists,
  existingListNames,
  strategy,
  scopeMode,
  parent,
  allRepos,
  setPhase,
  reviewPromise,
  summaryPromise,
  savePromptPromise,
  unmount,
  modelId,
  analysisStartTime,
  analysisErrorCount,
  login,
  provider,
  phaseTimings,
  analysisTimings,
}: ReviewPhaseParams): Promise<ReviewPhaseResult> {
  // Consolidate proposed new category names to reduce list proliferation
  setPhase({ tag: "consolidating" });
  const existingListNamesLower = new Set(existingListNames.map((n) => n.toLowerCase().trim()));
  const newCategoryNames = [
    ...new Set(
      analyzedRepos
        .map((r) => r.analysis.category)
        .filter((c) => !existingListNamesLower.has(c.toLowerCase().trim())),
    ),
  ];
  logger.info("consolidation starting", {
    newCategoryCount: newCategoryNames.length,
    existingListCount: existingListNames.length,
    strategy,
  });
  const consolidationStart = Date.now();
  const { remapping, mergeWarnings } = await consolidateCategories(
    newCategoryNames,
    provider,
    existingListNames.map((name) => ({ name, topics: [] })),
    undefined,
    strategy,
    parent,
    analyzedRepos,
    (msg) => setPhase({ tag: "consolidating", subStep: msg }),
  ).finally(() => {
    phaseTimings.consolidationMs = Date.now() - consolidationStart;
  });
  logger.info("consolidation complete", {
    remappedCount: remapping.size,
    mergeWarningCount: mergeWarnings.length,
    durationMs: phaseTimings.consolidationMs,
  });
  for (const entry of analyzedRepos) {
    // "Other" is a protected reserved bucket — never remap it away.
    if (entry.analysis.category.toLowerCase().trim() === "other") continue;
    const consolidated = remapping.get(entry.analysis.category);
    if (consolidated) entry.analysis.category = consolidated;
  }

  const sessionRunId = generateSessionId();

  const boundReroute = (
    orphans: { category: string }[],
    availableTargets: string[],
    rerouteParent?: Parameters<typeof rerouteOrphanRepos>[3],
  ) => rerouteOrphanRepos(orphans, availableTargets, provider, rerouteParent);

  const suggestionsStart = Date.now();
  const { suggestions, count, reroutedRepos } = await generateSuggestions(
    analyzedRepos,
    lists,
    boundReroute,
    strategy,
    scopeMode,
    parent,
  ).finally(() => {
    phaseTimings.suggestionsMs = Date.now() - suggestionsStart;
  });
  logger.info("suggestions generated", {
    count,
    reroutedRepoCount: reroutedRepos.length,
    durationMs: phaseTimings.suggestionsMs,
  });

  track("analysis_completed", {
    repoCount: analyzedRepos.length,
    suggestionCount: count,
    interrupted: false,
    durationMs: Date.now() - analysisStartTime,
    modelId,
    errorCount: analysisErrorCount,
    scope: scopeMode,
    strategy,
  });

  if (count === 0) {
    logger.info("no suggestions generated; exiting");
    setPhase({
      tag: "info",
      message: "No suggestions generated — all repos are already well organized!",
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await analyticsShutdown();
    unmount();
    process.exit(0);
  }

  const reviewSpan = createPhaseSpan(parent, "review-phase", { suggestionCount: count });
  setPhase({ tag: "review", suggestions, mergeWarnings, repos: allRepos });
  const { decisions, quit } = await reviewPromise;
  const acceptedCount = Array.from(decisions.values()).filter((d) => d === "accepted").length;
  const rejectedCount = Array.from(decisions.values()).filter((d) => d === "rejected").length;
  const skippedCount = decisions.size - acceptedCount - rejectedCount;
  endSpanSafe(reviewSpan, { output: { acceptedCount, rejectedCount } });
  logger.info("review decisions made", {
    totalSuggestions: count,
    decisionCount: decisions.size,
    acceptedCount,
    rejectedCount,
    skippedCount,
    quit,
  });

  if (quit && acceptedCount === 0) {
    logger.info("user quit review without accepting any suggestions; exiting");
    track("suggestions_reviewed_quit", {
      totalSuggestions: count,
      scope: scopeMode,
      strategy,
    });
    await analyticsShutdown();
    unmount();
    process.exit(0);
  }

  setPhase({
    tag: "summary",
    suggestions,
    decisions,
    reroutedRepos,
    strategy,
    existingListCount: lists.length,
    scopeMode,
    phaseTimings,
  });
  const apply = await summaryPromise;
  logger.info("user reviewed summary", { apply, acceptedCount });

  if (!apply || acceptedCount === 0) {
    setPhase({
      tag: "save-prompt",
      suggestions,
      decisions,
      mutationResults: undefined,
      phaseTimings,
    });
    const savePath = await savePromptPromise;
    await analyticsShutdown();
    unmount();
    if (savePath) {
      const decisionsArray = Array.from(decisions.entries()).map(([suggestionIndex, decision]) => ({
        suggestionIndex,
        decision,
      }));
      const errors = analyzedRepos
        .filter((e) => e.analysis.category === "analysis-failed")
        .map((e) => ({ repo: e.repo.name, owner: e.repo.owner }));
      const json = buildSessionJson({
        runId: sessionRunId,
        summary: {
          starredCount: allRepos.length,
          analyzedCount: analyzedRepos.length,
          suggestionCount: suggestions.length,
          githubUser: login,
          phaseTimings,
        },
        suggestions,
        errors,
        analysisTimings,
        decisions: decisionsArray,
      });
      try {
        fs.writeFileSync(savePath, json);
        logger.info("saved session (no changes applied)", { path: savePath });
        track("file_saved", { context: "interactive_no_changes" });
        process.stderr.write(`Saved session to ${savePath}\n`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("failed to write session file", { path: savePath, message });
        process.stderr.write(`Error writing file: ${message}\n`);
      }
    } else {
      logger.info("user declined to save session (no changes applied)");
    }
    process.exit(0);
  }

  return { suggestions, count, reroutedRepos, sessionRunId, decisions, acceptedCount };
}
