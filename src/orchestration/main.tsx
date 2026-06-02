import { authenticate, AuthError } from "../github/auth.js";
import type { AuthResult } from "../github/auth.js";
import { fetchStarredRepos, fetchUserLists } from "../github/starFetcher.js";
import { fetchAllReadmes } from "../github/readmeFetcher.js";
import { createProvider, resolveBackend, resolveModelId } from "../ai/index.js";
import {
  createLangfuseClient,
  createRunTrace,
  generateSessionId,
  flushTracing,
  createAgentObservation,
  createMilestoneEvent,
} from "../ai/tracing.js";
import type { Repo, ScopeMode, ConsolidationStrategy, PhaseTimings } from "../types.js";
import { readConfig, writeConfig, ensureAnalyticsId } from "../config.js";
import { initAnalytics, track, shutdown as analyticsShutdown } from "../analytics.js";
import { logger } from "../logger.js";

import { parseArgs } from "../cli/args.js";
import { runAnalyzeOnly } from "../cli/modes.js";
import { setupTui } from "./tui.js";
import { runAnalysis, handleInterrupt } from "./analysis.js";
import { runReviewPhase } from "./review.js";
import { runApplyPhase } from "./apply.js";
import { loadCache, type AnalysisCache } from "../cache/analysisCache.js";

export async function main() {
  const cliArgs = parseArgs();

  // Analytics init
  const config = readConfig();
  if (cliArgs.noAnalytics) writeConfig({ analyticsOptOut: true });
  const analyticsOptOut = cliArgs.noAnalytics || config.analyticsOptOut;
  const distinctId = analyticsOptOut ? "anonymous" : ensureAnalyticsId();
  initAnalytics(analyticsOptOut, distinctId);
  process.on("beforeExit", () => {
    void analyticsShutdown();
  });

  const backend = resolveBackend(cliArgs.backend);
  logger.info("app started", {
    backend,
    analyzeOnly: cliArgs.analyzeOnly,
    concurrency: cliArgs.concurrency,
    limit: cliArgs.limit,
  });
  track("app_started", { backend, analyzeOnly: cliArgs.analyzeOnly ?? false });

  // Auth
  let token: string;
  let graphqlWithAuth: AuthResult["graphqlWithAuth"];
  let login: string;
  try {
    ({ token, graphqlWithAuth, login } = await authenticate());
    logger.info("authenticated", { login });
  } catch (err) {
    const reason = err instanceof AuthError ? err.reason : "network_error";
    const message = err instanceof Error ? err.message : String(err);
    logger.error("authentication failed", { reason, message });
    // TUI not mounted yet; surface user-facing message on stderr.
    // Headless mode already gets it via the logger's stderr-mirror.
    if (!cliArgs.analyzeOnly) {
      process.stderr.write(`${message}\n`);
    }
    track("auth_failed", { reason });
    await analyticsShutdown();
    process.exit(1);
  }

  const cache: AnalysisCache | null = cliArgs.noCache ? null : await loadCache();

  // --export-corpus implies the headless analyze path: it reuses the same
  // fetch + analyze pipeline, then writes a corpus.json and returns early.
  if (cliArgs.analyzeOnly || cliArgs.exportCorpusPath) {
    await runAnalyzeOnly(cliArgs, token, graphqlWithAuth, login, cache);
    process.exit(0);
  }

  // TUI setup
  const interruptedRef = { value: false };
  const abortController = new AbortController();
  const modelId = resolveModelId(cliArgs.backend);
  const tui = setupTui({ interruptedRef, abortController, modelId });

  const phaseTimings: PhaseTimings = {};

  // Fetch stars + lists
  let allRepos: Repo[];
  let lists: Awaited<ReturnType<typeof fetchUserLists>>;
  const fetchStarsStart = Date.now();
  try {
    [allRepos, lists] = await Promise.all([
      fetchStarredRepos(graphqlWithAuth),
      fetchUserLists(graphqlWithAuth),
    ]);
    phaseTimings.fetchStarsListsMs = Date.now() - fetchStarsStart;
    logger.info("fetched stars and lists", {
      repoCount: allRepos.length,
      listCount: lists.length,
      durationMs: phaseTimings.fetchStarsListsMs,
    });
  } catch (err) {
    phaseTimings.fetchStarsListsMs = Date.now() - fetchStarsStart;
    const raw = err instanceof Error ? err.message : String(err);
    const message =
      raw.includes("<html") || raw.includes("<!DOCTYPE")
        ? raw
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200)
        : raw;
    logger.error("fetch failed", { message, durationMs: phaseTimings.fetchStarsListsMs });
    tui.setPhase({ tag: "error", message });
    track("fetch_failed", { message });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await analyticsShutdown();
    tui.unmount();
    process.exit(1);
  }

  // Derive listIds (Repository.lists field doesn't exist in GitHub's API)
  const repoListIds = new Map<string, string[]>();
  for (const list of lists) {
    for (const repoId of list.repoIds) {
      const ids = repoListIds.get(repoId) ?? [];
      ids.push(list.id);
      repoListIds.set(repoId, ids);
    }
  }
  for (const repo of allRepos) {
    repo.listIds = repoListIds.get(repo.id) ?? [];
  }

  const repos = cliArgs.limit ? allRepos.slice(0, cliArgs.limit) : allRepos;

  if (repos.length === 0) {
    logger.info("no repos found; exiting");
    track("no_repos_found");
    tui.setPhase({ tag: "info", message: "No starred repositories found." });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await analyticsShutdown();
    tui.unmount();
    process.exit(0);
  }

  // Confirm → scope → strategy
  const showAnalyticsNotice = !analyticsOptOut && !config.analyticsNoticeSeen;
  tui.setPhase({
    tag: "confirm",
    repoCount: repos.length,
    listCount: lists.length,
    login,
    showAnalyticsNotice,
  });
  if (showAnalyticsNotice) writeConfig({ analyticsNoticeSeen: true });
  const proceed = await tui.confirmPromise;
  if (!proceed) {
    logger.info("user cancelled at confirm");
    track("session_cancelled", { stage: "confirm" });
    await analyticsShutdown();
    tui.unmount();
    process.exit(0);
  }
  logger.info("user confirmed");

  let scopeMode: ScopeMode;
  if (lists.length > 0) {
    tui.setPhase({ tag: "pick-scope" });
    scopeMode = await tui.scopePromise;
    logger.info("user picked scope", { scope: scopeMode });
  } else {
    scopeMode = "all";
  }

  const filteredRepos =
    scopeMode === "unlisted-only" ? repos.filter((r) => r.listIds.length === 0) : repos;

  if (filteredRepos.length === 0) {
    logger.info("scope filter eliminated all repos; exiting", { scope: scopeMode });
    tui.setPhase({
      tag: "info",
      message: "All your starred repos are already organized — nothing to do!",
    });
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await analyticsShutdown();
    tui.unmount();
    process.exit(0);
  }

  let strategy: ConsolidationStrategy;
  if (lists.length > 0) {
    tui.setPhase({ tag: "pick-strategy", scopeMode, hasLists: true });
    strategy = await tui.strategyPromise;
    logger.info("user picked strategy", { strategy });
  } else {
    strategy = "keep-existing";
  }

  logger.info("analysis pipeline starting", {
    scope: scopeMode,
    strategy,
    backend,
    repoCount: repos.length,
    filteredRepoCount: filteredRepos.length,
    concurrency: cliArgs.concurrency,
  });
  track("analysis_started", {
    scope: scopeMode,
    strategy,
    backend,
    repoCount: repos.length,
    filteredRepoCount: filteredRepos.length,
    concurrency: cliArgs.concurrency,
  });

  const filterLabel = scopeMode === "unlisted-only" ? "Unlisted repos only" : undefined;

  // Fetch READMEs
  tui.setPhase({ tag: "fetching", filterLabel });
  const fetchReadmesStart = Date.now();
  let readmes: Awaited<ReturnType<typeof fetchAllReadmes>>;
  try {
    readmes = await fetchAllReadmes(
      filteredRepos.map((r) => ({ owner: r.owner, name: r.name })),
      token,
      cliArgs.concurrency,
    );
  } finally {
    phaseTimings.fetchReadmesMs = Date.now() - fetchReadmesStart;
  }
  logger.info("readmes fetched", {
    count: readmes.size,
    durationMs: phaseTimings.fetchReadmesMs,
  });

  // Create provider first so modelId is available for trace metadata
  const analyzer = createProvider(cliArgs.backend);

  // Set up Langfuse tracing (no-op when credentials are absent)
  const langfuse = createLangfuseClient();
  process.on("beforeExit", () => {
    flushTracing(langfuse);
  });
  const trace = langfuse
    ? createRunTrace(
        langfuse,
        {
          repoCount: filteredRepos.length,
          listsCount: lists.length,
          backend,
          filter: scopeMode,
          mode: strategy,
          modelId: analyzer.modelId,
          filteredRepoCount: filteredRepos.length,
          totalRepoCount: allRepos.length,
          listNames: lists.map((l) => l.name),
          concurrency: cliArgs.concurrency,
        },
        generateSessionId(),
      )
    : null;

  const agentObs = createAgentObservation(trace, "constellation-agent", {
    backend,
    filteredRepoCount: filteredRepos.length,
  });
  createMilestoneEvent(agentObs, "run-start", {
    backend,
    filteredRepoCount: filteredRepos.length,
  });
  const existingListNames = lists.map((l) => l.name);

  const { analyzedRepos, analysisErrorCount, analysisStartTime, analysisTimings } =
    await runAnalysis({
      filteredRepos,
      readmes,
      analyzer,
      existingListNames,
      abortController,
      interruptedRef,
      filterLabel,
      concurrency: cliArgs.concurrency,
      setPhase: tui.setPhase,
      phaseTimings,
      parent: agentObs,
      cache,
    });
  logger.info("analysis complete", {
    analyzedCount: analyzedRepos.length,
    errorCount: analysisErrorCount,
    interrupted: interruptedRef.value,
    durationMs: Date.now() - analysisStartTime,
  });

  // Handle ESC interrupt
  if (interruptedRef.value) {
    logger.info("user interrupted analysis (ESC)");
    await handleInterrupt({
      analyzedRepos,
      filteredRepos,
      existingListNames,
      lists,
      strategy,
      trace,
      agentObs,
      login,
      modelId: analyzer.modelId ?? backend,
      analysisStartTime,
      analysisErrorCount,
      scopeMode,
      setPhase: tui.setPhase,
      interruptChoicePromise: tui.interruptChoicePromise,
      savePromptPromise: tui.savePromptPromise,
      unmount: tui.unmount,
      provider: analyzer,
      phaseTimings,
      analysisTimings,
    });
  }

  // Consolidation → suggestions → review → summary
  const { suggestions, count, sessionRunId, decisions, acceptedCount } = await runReviewPhase({
    analyzedRepos,
    lists,
    existingListNames,
    strategy,
    scopeMode,
    parent: agentObs,
    allRepos,
    setPhase: tui.setPhase,
    reviewPromise: tui.reviewPromise,
    summaryPromise: tui.summaryPromise,
    savePromptPromise: tui.savePromptPromise,
    unmount: tui.unmount,
    modelId: analyzer.modelId ?? backend,
    analysisStartTime,
    analysisErrorCount,
    login,
    provider: analyzer,
    phaseTimings,
    analysisTimings,
  });

  logger.info("review phase complete", {
    suggestionCount: count,
    acceptedCount,
    decisionsCount: decisions.size,
  });

  // Apply mutations + save
  await runApplyPhase({
    suggestions,
    decisions,
    acceptedCount,
    count,
    strategy,
    scopeMode,
    lists,
    graphqlWithAuth,
    setPhase: tui.setPhase,
    savePromptPromise: tui.savePromptPromise,
    unmount: tui.unmount,
    allRepos,
    analyzedRepos,
    sessionRunId,
    login,
    modelId: analyzer.modelId ?? backend,
    phaseTimings,
    analysisTimings,
  });
  logger.info("app exiting cleanly");
}
