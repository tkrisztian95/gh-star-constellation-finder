import fs from "fs";
import path from "path";

import { applyAcceptedSuggestions, deleteAllLists } from "../github/mutator.js";
import type { MutationResult } from "../github/mutator.js";
import type { AuthResult } from "../github/auth.js";
import type { fetchUserLists } from "../github/starFetcher.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import { buildDefaultSavePath } from "../session/defaultPath.js";
import type { Repo, Suggestion, ConsolidationStrategy, ScopeMode, PhaseTimings } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import type { AnalysisTiming } from "./analysis.js";
import { logger } from "../logger.js";

function describeSuggestionTarget(s: Suggestion): string {
  switch (s.type) {
    case "create-list":
    case "move-to-list":
      return s.targetListName;
    case "rename-list":
      return `${s.oldName} -> ${s.newName}`;
    case "delete-list":
      return s.listName;
  }
}

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
  logger.info("apply phase starting", { acceptedCount, strategy });
  const applyStart = Date.now();
  let finalResults: MutationResult[];
  try {
    // In recreate mode, delete all existing lists before applying
    if (strategy === "recreate" && lists.length > 0) {
      logger.info("deleting existing lists (recreate strategy)", { count: lists.length });
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
        const target = describeSuggestionTarget(result.suggestion);
        if (result.status === "failed") {
          logger.error("mutation failed", {
            type: result.suggestion.type,
            target,
            message: result.message,
          });
        } else {
          logger.debug("mutation ok", { type: result.suggestion.type, target });
        }
        setPhase({ tag: "applying", results: [...mutationResults] });
      },
    );
  } finally {
    phaseTimings.applyMs = Date.now() - applyStart;
  }

  setPhase({ tag: "done", results: finalResults, phaseTimings });

  const failed = finalResults.filter((r) => r.status === "failed").length;
  logger.info("apply phase complete", {
    total: finalResults.length,
    succeeded: finalResults.length - failed,
    failed,
    durationMs: phaseTimings.applyMs,
  });
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
    defaultPath: buildDefaultSavePath({ modelId }),
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
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, json);
      logger.info("saved session", { path: savePath, runId: sessionRunId });
      track("file_saved", { context: "interactive" });
      process.stderr.write(`Saved session to ${savePath}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("failed to write session file", { path: savePath, message });
      process.stderr.write(`Error writing file: ${message}\n`);
    }
  } else {
    logger.info("user declined to save session");
  }

  if (failed > 0) {
    process.exit(1);
  }
}
