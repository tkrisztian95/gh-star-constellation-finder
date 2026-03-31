import fs from "fs";

import { consolidateCategories } from "../ai/consolidator.js";
import { generateSuggestions } from "../engine/suggestionEngine.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { computeDataQuality } from "../github/readmeFetcher.js";
import { generateSessionId } from "../ai/tracing.js";
import type { createRunTrace } from "../ai/tracing.js";
import type { fetchUserLists } from "../github/starFetcher.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import type { Repo, ConsolidationStrategy, ScopeMode } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { InterruptChoice } from "../components/InterruptConfirmScreen.js";
import type { createAnalyzer } from "../ai/index.js";

export interface AnalysisResult {
  analyzedRepos: AnalyzedRepo[];
  analysisErrorCount: number;
  analysisStartTime: number;
}

export interface RunAnalysisParams {
  filteredRepos: Repo[];
  readmes: Map<string, string>;
  analyzer: ReturnType<typeof createAnalyzer>;
  existingListNames: string[];
  abortController: AbortController;
  interruptedRef: { value: boolean };
  filterLabel: string | undefined;
  concurrency: number;
  setPhase: (p: AppPhase) => void;
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
}: RunAnalysisParams): Promise<AnalysisResult> {
  const analyzedRepos: AnalyzedRepo[] = [];
  let analyzed = 0;
  let analysisErrorCount = 0;
  const analysisStartTime = Date.now();

  setPhase({ tag: "analyzing", analyzed: 0, total: filteredRepos.length, filterLabel });

  {
    let active = 0;
    const pending = [...filteredRepos];
    const inFlight: Promise<void>[] = [];

    const dispatch = (): Promise<void> | null => {
      if (interruptedRef.value || pending.length === 0) return null;
      const repo = pending.shift()!;
      active++;
      const p = (async () => {
        setPhase({
          tag: "analyzing",
          analyzed,
          total: filteredRepos.length,
          filterLabel,
          currentRepo: `${repo.owner}/${repo.name}`,
        });
        let analysis;
        let readme = "";
        if (repo.isArchived) {
          analysis = {
            category: "Archived",
            killerFeature: "(archived repository)",
            dataQuality: "sparse" as const,
          };
        } else {
          readme = readmes.get(`${repo.owner}/${repo.name}`) ?? "";
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
            );
          } catch (err) {
            if (interruptedRef.value) return; // aborted — drop this repo silently
            throw err;
          }
          analysis.dataQuality = computeDataQuality(readme);
        }
        repo.readme = readme;
        if (analysis.category === "analysis-failed") analysisErrorCount++;
        analyzedRepos.push({ repo, analysis, readme });
        analyzed++;
        setPhase({ tag: "analyzing", analyzed, total: filteredRepos.length, filterLabel });
        active--;
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
  }

  return { analyzedRepos, analysisErrorCount, analysisStartTime };
}

export interface HandleInterruptParams {
  analyzedRepos: AnalyzedRepo[];
  filteredRepos: Repo[];
  existingListNames: string[];
  lists: Awaited<ReturnType<typeof fetchUserLists>>;
  strategy: ConsolidationStrategy;
  trace: ReturnType<typeof createRunTrace> | null;
  login: string;
  modelId: string;
  analysisStartTime: number;
  analysisErrorCount: number;
  scopeMode: ScopeMode;
  setPhase: (p: AppPhase) => void;
  interruptChoicePromise: Promise<InterruptChoice>;
  savePromptPromise: Promise<string>;
  unmount: () => void;
}

// Returns only if the user chose "continue"; otherwise calls process.exit()
export async function handleInterrupt({
  analyzedRepos,
  filteredRepos,
  existingListNames,
  lists,
  strategy,
  trace,
  login,
  modelId,
  analysisStartTime,
  analysisErrorCount,
  scopeMode,
  setPhase,
  interruptChoicePromise,
  savePromptPromise,
  unmount,
}: HandleInterruptParams): Promise<void> {
  if (analyzedRepos.length === 0) {
    setPhase({ tag: "interrupt-confirm", analyzedCount: 0, totalCount: filteredRepos.length });
    await interruptChoicePromise; // only exit available; any key exits
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
      existingListNames,
      undefined,
      strategy,
      trace,
    );
    for (const entry of analyzedRepos) {
      const consolidated = remapping.get(entry.analysis.category);
      if (consolidated) entry.analysis.category = consolidated;
    }
    const { suggestions } = await generateSuggestions(
      analyzedRepos,
      lists,
      undefined,
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
      },
      suggestions,
      errors: saveErrors,
    });

    setPhase({ tag: "save-prompt", suggestions, decisions: new Map() });
    const savePath = await savePromptPromise;
    if (savePath) {
      fs.writeFileSync(savePath, saveJson);
      track("file_saved", { context: "interrupt" });
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
