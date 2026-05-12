import fs from "fs";

import type { AuthResult } from "../github/auth.js";
import { fetchStarredRepos, fetchUserLists } from "../github/starFetcher.js";
import { fetchAllReadmes, computeDataQuality } from "../github/readmeFetcher.js";
import { createProvider, resolveBackend } from "../ai/index.js";
import {
  createLangfuseClient,
  createRunTrace,
  generateSessionId,
  flushTracing,
} from "../ai/tracing.js";
import {
  consolidateCategories,
  rerouteOrphanRepos,
} from "../orchestration/consolidationCoordinator.js";
import { generateSuggestions } from "../engine/suggestionEngine.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import type { CliArgs } from "./args.js";
import type { AnalysisTiming, AnalysisTimingStatus } from "../orchestration/analysis.js";
import type { PhaseTimings } from "../types.js";
import type { AnalysisCache } from "../cache/analysisCache.js";
import { logger } from "../logger.js";

export async function runAnalyzeOnly(
  cliArgs: CliArgs,
  token: string,
  graphqlWithAuth: AuthResult["graphqlWithAuth"],
  login: string,
  cache: AnalysisCache | null = null,
) {
  const startMs = Date.now();
  const phaseTimings: PhaseTimings = {};
  logger.info("analyze-only mode starting", {
    login,
    backend: cliArgs.backend,
    concurrency: cliArgs.concurrency,
    limit: cliArgs.limit,
    outputPath: cliArgs.outputPath,
  });

  let allRepos: Awaited<ReturnType<typeof fetchStarredRepos>>;
  let lists: Awaited<ReturnType<typeof fetchUserLists>>;
  {
    const fetchStart = Date.now();
    try {
      [allRepos, lists] = await Promise.all([
        fetchStarredRepos(graphqlWithAuth),
        fetchUserLists(graphqlWithAuth),
      ]);
    } finally {
      phaseTimings.fetchStarsListsMs = Date.now() - fetchStart;
    }
  }
  logger.info("analyze-only fetched stars and lists", {
    repoCount: allRepos.length,
    listCount: lists.length,
    durationMs: phaseTimings.fetchStarsListsMs,
  });

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

  let readmes: Awaited<ReturnType<typeof fetchAllReadmes>>;
  {
    const readmesStart = Date.now();
    try {
      readmes = await fetchAllReadmes(
        repos.map((r) => ({ owner: r.owner, name: r.name })),
        token,
        cliArgs.concurrency,
      );
    } finally {
      phaseTimings.fetchReadmesMs = Date.now() - readmesStart;
    }
  }

  const backend = resolveBackend(cliArgs.backend);

  // Set up Langfuse tracing (no-op when credentials are absent)
  const langfuse = createLangfuseClient();
  const langfuseSessionId = generateSessionId();
  const trace = langfuse
    ? createRunTrace(
        langfuse,
        { repoCount: repos.length, listsCount: lists.length, backend },
        langfuseSessionId,
      )
    : null;

  const analyzer = createProvider(cliArgs.backend, trace);
  const existingListNames = lists.map((l) => l.name);
  const analyzedRepos: AnalyzedRepo[] = [];
  const analysisTimings: AnalysisTiming[] = [];

  const analysisStart = Date.now();
  await Promise.all(
    repos.map(async (repo) => {
      const repoStart = Date.now();
      let status: AnalysisTimingStatus = "ok";
      try {
        let analysis;
        let readme = "";
        if (repo.isArchived) {
          status = "skipped-archived";
          analysis = {
            category: "Archived",
            killerFeature: "(archived repository)",
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
              analysis = await analyzer.analyze({
                name: repo.name,
                owner: repo.owner,
                description: repo.description,
                language: repo.language,
                topics: repo.topics,
                readme,
                isArchived: false,
                existingListNames,
              });
            } catch (err) {
              status = "failed";
              throw err;
            }
            analysis.dataQuality = computeDataQuality(readme);
            if (cache && analysis.category !== "analysis-failed") {
              await cache.saveEntry(repo.id, readme, analysis);
            }
          }
        }
        repo.readme = readme;
        analyzedRepos.push({ repo, analysis, readme });
      } finally {
        analysisTimings.push({
          owner: repo.owner,
          name: repo.name,
          durationMs: Date.now() - repoStart,
          status,
        });
      }
    }),
  );
  phaseTimings.analysisMs = Date.now() - analysisStart;
  const analyzeOnlyErrorCount = analyzedRepos.filter(
    (r) => r.analysis.category === "analysis-failed",
  ).length;
  logger.info("analyze-only analysis complete", {
    analyzedCount: analyzedRepos.length,
    errorCount: analyzeOnlyErrorCount,
    durationMs: phaseTimings.analysisMs,
  });

  const existingListNamesLower = new Set(existingListNames.map((n) => n.toLowerCase().trim()));
  const newCategoryNames = [
    ...new Set(
      analyzedRepos
        .map((r) => r.analysis.category)
        .filter((c) => !existingListNamesLower.has(c.toLowerCase().trim())),
    ),
  ];
  const consolidationStart = Date.now();
  const consolidationResult = await consolidateCategories(
    newCategoryNames,
    analyzer,
    existingListNames.map((name) => ({ name, topics: [] })),
    undefined,
    "allow-rename",
    trace,
    analyzedRepos,
  ).finally(() => {
    phaseTimings.consolidationMs = Date.now() - consolidationStart;
  });
  const { remapping } = consolidationResult;
  for (const entry of analyzedRepos) {
    const consolidated = remapping.get(entry.analysis.category);
    if (consolidated) {
      entry.analysis.category = consolidated;
    }
  }

  const runId = generateSessionId();

  const boundReroute = (
    orphans: { category: string }[],
    availableTargets: string[],
    parent?: Parameters<typeof rerouteOrphanRepos>[3],
  ) => rerouteOrphanRepos(orphans, availableTargets, analyzer, parent);
  const suggestionsStart = Date.now();
  const { suggestions } = await generateSuggestions(
    analyzedRepos,
    lists,
    boundReroute,
    "allow-rename",
    undefined,
    trace,
  ).finally(() => {
    phaseTimings.suggestionsMs = Date.now() - suggestionsStart;
  });

  const errors = analyzedRepos
    .filter((e) => e.analysis.category === "analysis-failed")
    .map((e) => ({ repo: e.repo.name, owner: e.repo.owner }));

  const summary: Record<string, unknown> = {
    starredCount: allRepos.length,
    analyzedCount: repos.length,
    suggestionCount: suggestions.length,
    durationMs: Date.now() - startMs,
    analysisDurationMs: phaseTimings.analysisMs ?? 0,
    phaseTimings,
    model: analyzer.modelId ?? null,
    githubUser: login,
  };
  if (langfuse && langfuseSessionId !== runId) {
    summary.langfuseSessionId = langfuseSessionId;
  }

  await flushTracing(langfuse);

  const json = buildSessionJson({ runId, summary, suggestions, errors, analysisTimings });

  track("analyze_only_run", {
    repoCount: repos.length,
    errorCount: errors.length,
    modelId: analyzer.modelId ?? backend,
    durationMs: Date.now() - startMs,
    savedToFile: !!cliArgs.outputPath,
  });

  if (cliArgs.outputPath) {
    fs.writeFileSync(cliArgs.outputPath, json);
    logger.info("analyze-only output written", { path: cliArgs.outputPath });
    track("file_saved", { context: "analyze_only" });
    process.stderr.write(`Saved analysis to ${cliArgs.outputPath}\n`);
  } else {
    process.stdout.write(json);
    logger.info("analyze-only output written to stdout");
  }

  logger.info("analyze-only run complete", {
    runId,
    suggestionCount: suggestions.length,
    errorCount: errors.length,
    durationMs: Date.now() - startMs,
  });
  await analyticsShutdown();
}
