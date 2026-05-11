import fs from "fs";

import { applyAcceptedSuggestions, deleteAllLists } from "../github/mutator.js";
import type { MutationResult } from "../github/mutator.js";
import type { AuthResult } from "../github/auth.js";
import type { fetchUserLists } from "../github/starFetcher.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import type { Repo, Suggestion, ConsolidationStrategy, ScopeMode, PhaseTimings } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import type { AnalysisTiming } from "./analysis.js";

export interface ApplyPhaseParams {
  suggestions: Suggestion[];
  decisions: Map<number, ReviewDecision>;
  acceptedCount: number;
  count: number;
  strategy: ConsolidationStrategy;
  scopeMode: ScopeMode;
  lists: Awaited<ReturnType<typeof fetchUserLists>>;
  graphqlWithAuth: AuthResult["graphqlWithAuth"];
  setPhase: (p: AppPhase) => void;
  savePromptPromise: Promise<string>;
  unmount: () => void;
  allRepos: Repo[];
  analyzedRepos: AnalyzedRepo[];
  sessionRunId: string;
  login: string;
  modelId: string;
  phaseTimings: PhaseTimings;
  analysisTimings: AnalysisTiming[];
}

export async function runApplyPhase({
  suggestions,
  decisions,
  acceptedCount,
  count,
  strategy,
  scopeMode,
  lists,
  graphqlWithAuth,
  setPhase,
  savePromptPromise,
  unmount,
  allRepos,
  analyzedRepos,
  sessionRunId,
  login,
  modelId,
  phaseTimings,
  analysisTimings,
}: ApplyPhaseParams): Promise<void> {
  const applyStart = Date.now();
  let finalResults: MutationResult[];
  try {
    // In recreate mode, delete all existing lists before applying
    if (strategy === "recreate" && lists.length > 0) {
      await deleteAllLists(lists, graphqlWithAuth);
    }

    const mutationResults: MutationResult[] = [];
    setPhase({ tag: "applying", results: [] });

    finalResults = await applyAcceptedSuggestions(
      suggestions,
      decisions,
      graphqlWithAuth,
      (result) => {
        mutationResults.push(result);
        setPhase({ tag: "applying", results: [...mutationResults] });
      },
    );
  } finally {
    phaseTimings.applyMs = Date.now() - applyStart;
  }

  setPhase({ tag: "done", results: finalResults, phaseTimings });

  const failed = finalResults.filter((r) => r.status === "failed").length;
  const rejectedCount = Array.from(decisions.values()).filter((d) => d === "rejected").length;
  const skippedCount = Array.from(decisions.values()).filter((d) => d === "skipped").length;
  const failureReasons =
    failed > 0
      ? finalResults
          .filter((r) => r.status === "failed")
          .map((r) => {
            const m = r.message.toLowerCase();
            if (m.includes("401") || m.includes("unauthorized")) return "auth";
            if (m.includes("rate limit") || m.includes("429")) return "rate_limit";
            if (m.includes("not created") || m.includes("not accepted")) return "dependency";
            return "unknown";
          })
      : [];
  track("suggestions_applied", {
    accepted: acceptedCount,
    rejected: rejectedCount,
    skipped: skippedCount,
    total: count,
    failed,
    failureReasons,
    modelId,
    strategy,
    scope: scopeMode,
  });

  track("run_completed", { interrupted: false, scope: scopeMode, strategy, modelId });

  // Wait briefly for TUI to render final state
  await new Promise((resolve) => setTimeout(resolve, 500));

  setPhase({
    tag: "save-prompt",
    suggestions,
    decisions,
    mutationResults: finalResults,
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
      mutationResults: finalResults,
    });
    try {
      fs.writeFileSync(savePath, json);
      track("file_saved", { context: "interactive" });
      process.stderr.write(`Saved session to ${savePath}\n`);
    } catch (err) {
      process.stderr.write(
        `Error writing file: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}
