import fs from "fs";
import path from "path";

import { consolidateCategories, rerouteOrphanRepos } from "./consolidationCoordinator.js";
import { generateSuggestions } from "../engine/suggestionEngine.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { computeDataQuality } from "../github/readmeFetcher.js";
import {
  generateSessionId,
  createPhaseSpan,
  endSpanSafe,
  createMilestoneEvent,
} from "../ai/tracing.js";
import type { createRunTrace, LangfuseParent, LangfuseSpan } from "../ai/tracing.js";
import type { fetchUserLists } from "../github/starFetcher.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import { buildDefaultSavePath } from "../session/defaultPath.js";
import type { Repo, ConsolidationStrategy, ScopeMode, PhaseTimings } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { InterruptChoice } from "../components/InterruptConfirmScreen.js";
import type { AIProvider } from "../ai/index.js";
import { LlmEntityExtractor, type EntitySource } from "../ai/entityExtractor.js";
import type { AnalysisCache } from "../cache/analysisCache.js";
import { buildEmbeddingText } from "../retrieval/embeddingText.js";
import { logger } from "../logger.js";

/** Max texts per embed call. OpenAI accepts far more; this bounds memory and
 * keeps a single failure from sinking the whole corpus. */
const EMBED_BATCH_SIZE = 256;

/**
 * Populate the embeddings cache for newly analyzed repos. Shared by the TUI and
 * headless paths via runAnalysis. Only repos whose cached vector is stale for
 * the active embedder are (re)embedded, so reruns make zero embedding calls.
 * Best-effort: an embedding failure is logged but never fails analysis — the
 * vectors are a retrieval substrate, not part of the analysis result.
 */
export async function populateEmbeddings(params: {
  analyzedRepos: AnalyzedRepo[];
  analyzer: AIProvider;
  cache: AnalysisCache;
  signal: AbortSignal;
  parent: LangfuseParent | null;
}): Promise<void> {
  const { analyzedRepos, analyzer, cache, signal, parent } = params;
  const embedderId = analyzer.embedderId;

  const stale = analyzedRepos.filter(
    ({ repo, analysis }) =>
      analysis.category !== "analysis-failed" && cache.needsEmbed(repo.id, embedderId),
  );
  if (stale.length === 0) return;

  logger.info("embedding repos", { count: stale.length, embedderId });
  try {
    for (let i = 0; i < stale.length; i += EMBED_BATCH_SIZE) {
      if (signal.aborted) return;
      const batch = stale.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map(({ repo, analysis }) =>
        buildEmbeddingText({
          name: `${repo.owner}/${repo.name}`,
          topics: repo.topics,
          category: analysis.category,
          killerFeature: analysis.killerFeature,
          description: analysis.description,
        }),
      );
      const vectors = await analyzer.embed(texts, signal, parent);
      if (vectors.length !== batch.length) {
        logger.warn("embed returned wrong vector count; skipping batch", {
          expected: batch.length,
          got: vectors.length,
        });
        continue;
      }
      for (let j = 0; j < batch.length; j++) {
        const { repo } = batch[j]!;
        // Persist owner/name/doc alongside the vector so the cache is a
        // self-contained retrieval store for --ask (#21): rank, cite, and
        // ground answers without a GitHub fetch or an entries join.
        await cache.saveEmbedding(
          repo.id,
          vectors[j]!,
          embedderId,
          repo.owner,
          repo.name,
          texts[j]!,
        );
        logger.debug("repo embedded", { owner: repo.owner, name: repo.name });
      }
    }
  } catch (err) {
    if (signal.aborted) return;
    logger.error("embedding population failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export type AnalysisTimingStatus = "ok" | "failed" | "skipped-archived" | "aborted";

export interface AnalysisTiming {
  owner: string;
  name: string;
  durationMs: number;
  status: AnalysisTimingStatus;
}

export interface AnalysisResult {
  analyzedRepos: AnalyzedRepo[];
  analysisErrorCount: number;
  analysisStartTime: number;
  analysisDurationMs: number;
  analysisTimings: AnalysisTiming[];
}

export interface RunAnalysisParams {
  filteredRepos: Repo[];
  readmes: Map<string, string>;
  analyzer: AIProvider;
  existingListNames: string[];
  abortController: AbortController;
  interruptedRef: { value: boolean };
  filterLabel: string | undefined;
  concurrency: number;
  setPhase: (p: AppPhase) => void;
  phaseTimings: PhaseTimings;
  parent?: LangfuseParent | null;
  cache?: AnalysisCache | null;
  entitySource?: EntitySource;
}

export async function runAnalysis({
  filteredRepos,
  readmes,
  analyzer,
  existingListNames,
  abortController,
  interruptedRef,
  filterLabel,
  concurrency,
  setPhase,
  phaseTimings,
  parent,
  cache,
  entitySource,
}: RunAnalysisParams): Promise<AnalysisResult> {
  const entityExtractor = new LlmEntityExtractor(analyzer, entitySource);
  const analyzedRepos: AnalyzedRepo[] = [];
  const analysisTimings: AnalysisTiming[] = [];
  let analyzed = 0;
  let analysisErrorCount = 0;
  const analysisStartTime = Date.now();
  const analysisSpan = createPhaseSpan(parent ?? null, "analysis-phase", {
    repoCount: filteredRepos.length,
  });

  setPhase({
    tag: "analyzing",
    analyzed: 0,
    total: filteredRepos.length,
    filterLabel,
    startedAt: analysisStartTime,
  });

  try {
    let active = 0;
    const pending = [...filteredRepos];
    const inFlight: Promise<void>[] = [];

    const dispatch = (): Promise<void> | null => {
      if (interruptedRef.value || pending.length === 0) return null;
      const repo = pending.shift()!;
      active++;
      const p = (async () => {
        const repoStart = Date.now();
        let status: AnalysisTimingStatus = "ok";
        try {
          setPhase({
            tag: "analyzing",
            analyzed,
            total: filteredRepos.length,
            filterLabel,
            currentRepo: `${repo.owner}/${repo.name}`,
            startedAt: analysisStartTime,
          });
          let analysis;
          let readme = "";
          if (repo.isArchived) {
            status = "skipped-archived";
            analysis = {
              category: "Archived",
              killerFeature: "(archived repository)",
              description: "",
              dataQuality: "sparse" as const,
            };
          } else {
            readme = readmes.get(`${repo.owner}/${repo.name}`) ?? "";
            const cached = cache?.get(repo.id, readme) ?? null;
            if (cached) {
              analysis = cached;
              logger.debug("repo analysis served from cache", {
                owner: repo.owner,
                name: repo.name,
              });
            } else {
              try {
                analysis = await analyzer.analyze(
                  {
                    name: repo.name,
                    owner: repo.owner,
                    description: repo.description,
                    language: repo.language,
                    topics: repo.topics,
                    readme,
                    isArchived: false,
                    existingListNames,
                  },
                  abortController.signal,
                  analysisSpan,
                );
              } catch (err) {
                if (interruptedRef.value) {
                  status = "aborted";
                  return;
                }
                status = "failed";
                throw err;
              }
              analysis.dataQuality = computeDataQuality(readme);
              if (analysis.category !== "analysis-failed") {
                analysis.entities = await entityExtractor.extract(
                  {
                    owner: repo.owner,
                    name: repo.name,
                    description: repo.description,
                    language: repo.language,
                    topics: repo.topics,
                    readme,
                  },
                  analysisSpan,
                );
              }
              if (cache && analysis.category !== "analysis-failed") {
                await cache.saveEntry(repo.id, readme, analysis);
              }
            }
          }
          repo.readme = readme;
          if (analysis.category === "analysis-failed") {
            analysisErrorCount++;
            logger.warn("repo analysis returned analysis-failed", {
              owner: repo.owner,
              name: repo.name,
            });
          } else {
            logger.debug("repo analyzed", {
              owner: repo.owner,
              name: repo.name,
              category: analysis.category,
              durationMs: Date.now() - repoStart,
              status,
            });
          }
          analyzedRepos.push({ repo, analysis, readme });
          analyzed++;
          setPhase({
            tag: "analyzing",
            analyzed,
            total: filteredRepos.length,
            filterLabel,
            startedAt: analysisStartTime,
          });
        } finally {
          analysisTimings.push({
            owner: repo.owner,
            name: repo.name,
            durationMs: Date.now() - repoStart,
            status,
          });
          active--;
        }
        if (!interruptedRef.value && pending.length > 0) {
          await dispatch()!;
        }
      })();
      return p;
    };

    while (active < concurrency && pending.length > 0 && !interruptedRef.value) {
      const p = dispatch();
      if (p) inFlight.push(p);
    }

    await Promise.all(inFlight);

    // Embed newly analyzed repos into the retrieval substrate (#44). Runs in
    // the shared engine so TUI and --analyze-only populate identically. Skipped
    // when there is no cache or the run was interrupted.
    if (cache && !interruptedRef.value) {
      await populateEmbeddings({
        analyzedRepos,
        analyzer,
        cache,
        signal: abortController.signal,
        parent: analysisSpan,
      });
    }
  } finally {
    endSpanSafe(analysisSpan, {
      output: { successCount: analyzedRepos.length - analysisErrorCount },
    });
  }

  const analysisDurationMs = Date.now() - analysisStartTime;
  phaseTimings.analysisMs = analysisDurationMs;
  return {
    analyzedRepos,
    analysisErrorCount,
    analysisStartTime,
    analysisDurationMs,
    analysisTimings,
  };
}

export interface HandleInterruptParams {
  analyzedRepos: AnalyzedRepo[];
  filteredRepos: Repo[];
  existingListNames: string[];
  lists: Awaited<ReturnType<typeof fetchUserLists>>;
  strategy: ConsolidationStrategy;
  trace: ReturnType<typeof createRunTrace> | null;
  agentObs: LangfuseSpan | null;
  login: string;
  modelId: string;
  analysisStartTime: number;
  analysisErrorCount: number;
  scopeMode: ScopeMode;
  setPhase: (p: AppPhase) => void;
  interruptChoicePromise: Promise<InterruptChoice>;
  savePromptPromise: Promise<string>;
  unmount: () => void;
  provider: AIProvider;
  phaseTimings: PhaseTimings;
  analysisTimings: AnalysisTiming[];
}

// Returns only if the user chose "continue"; otherwise calls process.exit()
export async function handleInterrupt({
  analyzedRepos,
  filteredRepos,
  existingListNames,
  lists,
  strategy,
  trace,
  agentObs,
  login,
  modelId,
  analysisStartTime,
  analysisErrorCount,
  scopeMode,
  setPhase,
  interruptChoicePromise,
  savePromptPromise,
  unmount,
  provider,
  phaseTimings,
  analysisTimings,
}: HandleInterruptParams): Promise<void> {
  createMilestoneEvent(agentObs, "run-interrupted", {
    analysedCount: analyzedRepos.length,
    totalCount: filteredRepos.length,
  });
  if (analyzedRepos.length === 0) {
    setPhase({ tag: "interrupt-confirm", analyzedCount: 0, totalCount: filteredRepos.length });
    await interruptChoicePromise; // only exit available; any key exits
    logger.info("user exited after interrupt (no analyzed repos)");
    track("analysis_completed", {
      repoCount: 0,
      interrupted: true,
      choice: "exit",
      durationMs: Date.now() - analysisStartTime,
      modelId,
      errorCount: 0,
      scope: scopeMode,
      strategy,
    });
    track("run_completed", { interrupted: true, scope: scopeMode, strategy, modelId });
    await analyticsShutdown();
    unmount();
    process.exit(0);
  }

  setPhase({
    tag: "interrupt-confirm",
    analyzedCount: analyzedRepos.length,
    totalCount: filteredRepos.length,
  });
  const choice = await interruptChoicePromise;
  logger.info("user picked interrupt choice", {
    choice,
    analyzedCount: analyzedRepos.length,
    totalCount: filteredRepos.length,
  });

  if (choice === "exit") {
    track("analysis_completed", {
      repoCount: analyzedRepos.length,
      interrupted: true,
      choice: "exit",
      durationMs: Date.now() - analysisStartTime,
      modelId,
      errorCount: analysisErrorCount,
      scope: scopeMode,
      strategy,
    });
    track("run_completed", { interrupted: true, scope: scopeMode, strategy, modelId });
    await analyticsShutdown();
    unmount();
    process.exit(0);
  }

  if (choice === "save") {
    track("analysis_completed", {
      repoCount: analyzedRepos.length,
      interrupted: true,
      choice: "save",
      durationMs: Date.now() - analysisStartTime,
      modelId,
      errorCount: analysisErrorCount,
      scope: scopeMode,
      strategy,
    });
    track("run_completed", { interrupted: true, scope: scopeMode, strategy, modelId });
    const existingListNamesLower = new Set(existingListNames.map((n) => n.toLowerCase().trim()));
    const newCategoryNames = [
      ...new Set(
        analyzedRepos
          .map((r) => r.analysis.category)
          .filter((c) => !existingListNamesLower.has(c.toLowerCase().trim())),
      ),
    ];
    const { remapping } = await consolidateCategories(
      newCategoryNames,
      provider,
      existingListNames.map((name) => ({ name, topics: [] })),
      undefined,
      strategy,
      trace,
      analyzedRepos,
    );
    for (const entry of analyzedRepos) {
      const consolidated = remapping.get(entry.analysis.category);
      if (consolidated) entry.analysis.category = consolidated;
    }
    const boundReroute = (
      orphans: { category: string }[],
      availableTargets: string[],
      parent?: Parameters<typeof rerouteOrphanRepos>[3],
    ) => rerouteOrphanRepos(orphans, availableTargets, provider, parent);
    const { suggestions } = await generateSuggestions(
      analyzedRepos,
      lists,
      boundReroute,
      strategy,
      undefined,
      trace,
    );
    const saveRunId = generateSessionId();
    const saveErrors = analyzedRepos
      .filter((e) => e.analysis.category === "analysis-failed")
      .map((e) => ({ repo: e.repo.name, owner: e.repo.owner }));
    const saveJson = buildSessionJson({
      runId: saveRunId,
      summary: {
        starredCount: filteredRepos.length,
        analyzedCount: analyzedRepos.length,
        suggestionCount: suggestions.length,
        interrupted: true,
        githubUser: login,
        phaseTimings,
      },
      suggestions,
      errors: saveErrors,
      analysisTimings,
    });

    setPhase({
      tag: "save-prompt",
      suggestions,
      decisions: new Map(),
      phaseTimings,
      defaultPath: buildDefaultSavePath({ modelId }),
    });
    const savePath = await savePromptPromise;
    if (savePath) {
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, saveJson);
      logger.info("saved partial session", { path: savePath });
      track("file_saved", { context: "interrupt" });
    } else {
      logger.info("user declined to save partial session");
    }
    await analyticsShutdown();
    unmount();
    if (savePath) {
      process.stderr.write(`Saved partial analysis to ${savePath}\n`);
    }
    process.exit(0);
  }

  // choice === "continue": return to let main continue with partial analyzedRepos
}
