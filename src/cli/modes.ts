import fs from "fs";

import type { AuthResult } from "../github/auth.js";
import { fetchStarredRepos, fetchUserLists } from "../github/starFetcher.js";
import { fetchAllReadmes, computeDataQuality } from "../github/readmeFetcher.js";
import { createAnalyzer, resolveBackend } from "../ai/index.js";
import {
  createLangfuseClient,
  createRunTrace,
  generateSessionId,
  flushTracing,
} from "../ai/tracing.js";
import { consolidateCategories } from "../ai/consolidator.js";
import { generateSuggestions } from "../engine/suggestionEngine.js";
import type { AnalyzedRepo } from "../engine/suggestionEngine.js";
import { track, shutdown as analyticsShutdown } from "../analytics.js";
import { buildSessionJson } from "../session/json.js";
import type { CliArgs } from "./args.js";

export async function runAnalyzeOnly(
  cliArgs: CliArgs,
  token: string,
  graphqlWithAuth: AuthResult["graphqlWithAuth"],
  login: string,
) {
  const startMs = Date.now();

  const [allRepos, lists] = await Promise.all([
    fetchStarredRepos(graphqlWithAuth),
    fetchUserLists(graphqlWithAuth),
  ]);

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

  const readmes = await fetchAllReadmes(
    repos.map((r) => ({ owner: r.owner, name: r.name })),
    token,
    cliArgs.concurrency,
  );

  const backend = resolveBackend(cliArgs.backend);

  // Set up Langfuse tracing (no-op when credentials are absent)
  const langfuse = createLangfuseClient();
  const langfuseSessionId = generateSessionId();
  const trace = langfuse
    ? createRunTrace(langfuse, { repoCount: repos.length, backend }, langfuseSessionId)
    : null;

  const analyzer = createAnalyzer(cliArgs.backend, trace);
  const existingListNames = lists.map((l) => l.name);
  const analyzedRepos: AnalyzedRepo[] = [];

  await Promise.all(
    repos.map(async (repo) => {
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
        analysis.dataQuality = computeDataQuality(readme);
      }
      repo.readme = readme;
      analyzedRepos.push({ repo, analysis, readme });
    }),
  );

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
    "allow-rename",
    trace,
  );
  for (const entry of analyzedRepos) {
    const consolidated = remapping.get(entry.analysis.category);
    if (consolidated) {
      entry.analysis.category = consolidated;
    }
  }

  const runId = generateSessionId();

  const { suggestions } = await generateSuggestions(
    analyzedRepos,
    lists,
    undefined,
    "allow-rename",
    undefined,
    trace,
  );

  const errors = analyzedRepos
    .filter((e) => e.analysis.category === "analysis-failed")
    .map((e) => ({ repo: e.repo.name, owner: e.repo.owner }));

  const summary: Record<string, unknown> = {
    starredCount: allRepos.length,
    analyzedCount: repos.length,
    suggestionCount: suggestions.length,
    durationMs: Date.now() - startMs,
    model: analyzer.modelId ?? null,
    githubUser: login,
  };
  if (langfuse && langfuseSessionId !== runId) {
    summary.langfuseSessionId = langfuseSessionId;
  }

  await flushTracing(langfuse);

  const json = buildSessionJson({ runId, summary, suggestions, errors });

  track("analyze_only_run", {
    repoCount: repos.length,
    errorCount: errors.length,
    modelId: analyzer.modelId ?? backend,
    durationMs: Date.now() - startMs,
    savedToFile: !!cliArgs.outputPath,
  });

  if (cliArgs.outputPath) {
    fs.writeFileSync(cliArgs.outputPath, json);
    track("file_saved", { context: "analyze_only" });
    process.stderr.write(`Saved analysis to ${cliArgs.outputPath}\n`);
  } else {
    process.stdout.write(json);
  }

  await analyticsShutdown();
}
