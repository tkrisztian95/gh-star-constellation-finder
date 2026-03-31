import fs from "fs";

import { consolidateCategories } from "../ai/consolidator.js";
import { generateSuggestions } from "../engine/suggestionEngine.js";
import type { AnalyzedRepo, ReroutedRepo } from "../engine/suggestionEngine.js";
import { generateSessionId } from "../ai/tracing.js";
import type { createRunTrace } from "../ai/tracing.js";
import type { fetchUserLists } from "../github/starFetcher.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import type { Repo, Suggestion, ConsolidationStrategy, ScopeMode } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";

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
  trace: ReturnType<typeof createRunTrace> | null;
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
}

// Returns only if the user confirmed to apply changes; otherwise calls process.exit()
export async function runReviewPhase({
  analyzedRepos,
  lists,
  existingListNames,
  strategy,
  scopeMode,
  trace,
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
  const { remapping, mergeWarnings } = await consolidateCategories(
    newCategoryNames,
    existingListNames,
    undefined,
    strategy,
    trace,
  );
  for (const entry of analyzedRepos) {
    const consolidated = remapping.get(entry.analysis.category);
    if (consolidated) entry.analysis.category = consolidated;
  }

  const sessionRunId = generateSessionId();

  const { suggestions, count, reroutedRepos } = await generateSuggestions(
    analyzedRepos,
    lists,
    undefined,
    strategy,
    scopeMode,
    trace,
  );

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
    setPhase({
      tag: "info",
      message: "No suggestions generated — all repos are already well organized!",
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await analyticsShutdown();
    unmount();
    process.exit(0);
  }

  setPhase({ tag: "review", suggestions, mergeWarnings, repos: allRepos });
  const { decisions, quit } = await reviewPromise;
  const acceptedCount = Array.from(decisions.values()).filter((d) => d === "accepted").length;

  if (quit && acceptedCount === 0) {
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
  });
  const apply = await summaryPromise;

  if (!apply || acceptedCount === 0) {
    setPhase({ tag: "save-prompt", suggestions, decisions, mutationResults: undefined });
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
        },
        suggestions,
        errors,
        decisions: decisionsArray,
      });
      try {
        fs.writeFileSync(savePath, json);
        track("file_saved", { context: "interactive_no_changes" });
        process.stderr.write(`Saved session to ${savePath}\n`);
      } catch (err) {
        process.stderr.write(
          `Error writing file: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
    process.exit(0);
  }

  return { suggestions, count, reroutedRepos, sessionRunId, decisions, acceptedCount };
}
