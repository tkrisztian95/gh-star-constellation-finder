import fs from "fs";
import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";

import { authenticate, type AuthResult } from "./github/auth.js";
import { fetchStarredRepos, fetchUserLists } from "./github/starFetcher.js";
import { fetchAllReadmes } from "./github/readmeFetcher.js";
import { createAnalyzer, type Backend } from "./ai/index.js";
import {
  createLangfuseClient,
  createRunTrace,
  generateSessionId,
  flushTracing,
} from "./ai/tracing.js";
import { consolidateCategories } from "./ai/consolidator.js";
import { generateSuggestions } from "./engine/suggestionEngine.js";
import type { AnalyzedRepo, ReroutedRepo } from "./engine/suggestionEngine.js";
import { applyAcceptedSuggestions, deleteAllLists, type MutationResult } from "./github/mutator.js";
import type { Suggestion, ConsolidationStrategy } from "./types.js";

import { LoadingScreen } from "./components/LoadingScreen.js";
import { ConfirmScreen } from "./components/ConfirmScreen.js";
import { StrategyScreen } from "./components/StrategyScreen.js";
import { ReviewScreen, type ReviewDecision } from "./components/ReviewScreen.js";
import { SummaryScreen } from "./components/SummaryScreen.js";

// --- CLI arg parsing ---

interface CliArgs {
  backend?: Backend;
  limit?: number;
  concurrency: number;
  analyzeOnly: boolean;
  outputPath?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { concurrency: 5, analyzeOnly: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--backend" && args[i + 1]) {
      result.backend = args[i + 1] as Backend;
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      result.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--analyze-only") {
      result.analyzeOnly = true;
    } else if (args[i] === "--output" && args[i + 1]) {
      result.outputPath = args[i + 1];
      i++;
    }
  }

  if (result.outputPath && !result.analyzeOnly) {
    process.stderr.write("Error: --output requires --analyze-only\n");
    process.exit(1);
  }

  return result;
}

// --- App state types ---

type AppPhase =
  | { tag: "fetching-initial" }
  | { tag: "confirm"; repoCount: number }
  | { tag: "pick-strategy" }
  | { tag: "fetching" }
  | { tag: "analyzing"; analyzed: number; total: number }
  | { tag: "review"; suggestions: Suggestion[]; mergeWarnings: string[] }
  | {
      tag: "summary";
      suggestions: Suggestion[];
      decisions: Map<number, ReviewDecision>;
      reroutedRepos: ReroutedRepo[];
      strategy: ConsolidationStrategy;
      existingListCount: number;
    }
  | { tag: "applying"; results: MutationResult[] }
  | { tag: "done"; results: MutationResult[] }
  | { tag: "info"; message: string }
  | { tag: "error"; message: string };

// --- Main App Component ---

interface AppProps {
  phase: AppPhase;
  onConfirm: (proceed: boolean) => void;
  onStrategySelect: (strategy: ConsolidationStrategy) => void;
  onReviewComplete: (decisions: Map<number, ReviewDecision>) => void;
  onReviewQuit: (decisions: Map<number, ReviewDecision>) => void;
  onSummaryConfirm: (apply: boolean) => void;
}

function App({
  phase,
  onConfirm,
  onStrategySelect,
  onReviewComplete,
  onReviewQuit,
  onSummaryConfirm,
}: AppProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={90}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="magenta" bold>
          gh-star-constellation-finder
        </Text>
        <Text color="gray">v1.0</Text>
      </Box>

      {phase.tag === "fetching-initial" && (
        <LoadingScreen analyzed={0} total={0} phase="fetching" />
      )}

      {phase.tag === "confirm" && (
        <ConfirmScreen repoCount={phase.repoCount} onConfirm={onConfirm} />
      )}

      {phase.tag === "pick-strategy" && <StrategyScreen onSelect={onStrategySelect} />}

      {phase.tag === "fetching" && <LoadingScreen analyzed={0} total={0} phase="fetching" />}

      {phase.tag === "analyzing" && (
        <LoadingScreen analyzed={phase.analyzed} total={phase.total} phase="analyzing" />
      )}

      {phase.tag === "review" && (
        <ReviewScreen
          suggestions={phase.suggestions}
          mergeWarnings={phase.mergeWarnings}
          onComplete={onReviewComplete}
          onQuit={onReviewQuit}
        />
      )}

      {phase.tag === "summary" && (
        <SummaryScreen
          suggestions={phase.suggestions}
          decisions={phase.decisions}
          reroutedRepos={phase.reroutedRepos}
          strategy={phase.strategy}
          existingListCount={phase.existingListCount}
          onConfirm={onSummaryConfirm}
        />
      )}

      {phase.tag === "applying" && (
        <Box flexDirection="column" padding={1}>
          <Text bold color="cyan">
            Applying changes...
          </Text>
          {phase.results.map((r, i) => (
            <Text key={i} color={r.status === "success" ? "green" : "red"}>
              {r.status === "success" ? "✓" : "✗"} {r.message}
            </Text>
          ))}
        </Box>
      )}

      {phase.tag === "done" && (
        <Box flexDirection="column" padding={1}>
          <Text bold color="green">
            Done!
          </Text>
          {phase.results.map((r, i) => (
            <Text key={i} color={r.status === "success" ? "green" : "red"}>
              {r.status === "success" ? "✓" : "✗"} {r.message}
            </Text>
          ))}
        </Box>
      )}

      {phase.tag === "info" && (
        <Box padding={1}>
          <Text color="cyan">{phase.message}</Text>
        </Box>
      )}

      {phase.tag === "error" && (
        <Box padding={1}>
          <Text color="red">Error: {phase.message}</Text>
        </Box>
      )}
    </Box>
  );
}

// --- Headless analyze-only pipeline ---

async function runAnalyzeOnly(
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

  // Set up Langfuse tracing (no-op when credentials are absent)
  const langfuse = createLangfuseClient();
  const langfuseSessionId = generateSessionId();
  const trace = langfuse
    ? createRunTrace(
        langfuse,
        { repoCount: repos.length, backend: cliArgs.backend ?? "openai" },
        langfuseSessionId,
      )
    : null;

  const analyzer = createAnalyzer(cliArgs.backend, trace);
  const existingListNames = lists.map((l) => l.name);
  const analyzedRepos: AnalyzedRepo[] = [];

  await Promise.all(
    repos.map(async (repo) => {
      let analysis;
      if (repo.isArchived) {
        analysis = {
          category: "Archived",
          killerFeature: "(archived repository)",
          dataQuality: "sparse" as const,
        };
      } else {
        const readme = readmes.get(`${repo.owner}/${repo.name}`) ?? "";
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
      }
      analyzedRepos.push({ repo, analysis });
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

  const json = JSON.stringify({ runId, summary, suggestions, errors }, null, 2) + "\n";
  if (cliArgs.outputPath) {
    fs.writeFileSync(cliArgs.outputPath, json);
    process.stderr.write(`Saved analysis to ${cliArgs.outputPath}\n`);
  } else {
    process.stdout.write(json);
  }
}

// --- Orchestration ---

async function main() {
  const cliArgs = parseArgs();

  // Auth
  const { token, graphqlWithAuth, login } = await authenticate();

  if (cliArgs.analyzeOnly) {
    await runAnalyzeOnly(cliArgs, token, graphqlWithAuth, login);
    process.exit(0);
  }

  // Set up phase state for the TUI
  let phase: AppPhase = { tag: "fetching-initial" };
  let setPhase: (p: AppPhase) => void = () => {};
  let onConfirm: (proceed: boolean) => void = () => {};
  let onStrategySelect: (strategy: ConsolidationStrategy) => void = () => {};
  let onReviewComplete: (d: Map<number, ReviewDecision>) => void = () => {};
  let onReviewQuit: (d: Map<number, ReviewDecision>) => void = () => {};
  let onSummaryConfirm: (apply: boolean) => void = () => {};

  // Promises to bridge TUI events back to async flow
  let confirmResolve: (proceed: boolean) => void;
  const confirmPromise = new Promise<boolean>((resolve) => {
    confirmResolve = resolve;
  });

  let strategyResolve: (strategy: ConsolidationStrategy) => void;
  const strategyPromise = new Promise<ConsolidationStrategy>((resolve) => {
    strategyResolve = resolve;
  });

  let reviewResolve: (result: { decisions: Map<number, ReviewDecision>; quit: boolean }) => void;
  const reviewPromise = new Promise<{ decisions: Map<number, ReviewDecision>; quit: boolean }>(
    (resolve) => {
      reviewResolve = resolve;
    },
  );

  let summaryResolve: (apply: boolean) => void;
  const summaryPromise = new Promise<boolean>((resolve) => {
    summaryResolve = resolve;
  });

  // Reactive state management for Ink
  function ReactiveApp() {
    const [currentPhase, setCurrentPhaseInner] = useState<AppPhase>(phase);

    useEffect(() => {
      setPhase = (p) => {
        phase = p;
        setCurrentPhaseInner(p);
      };
    }, []);

    onConfirm = (proceed) => confirmResolve(proceed);
    onStrategySelect = (strategy) => strategyResolve(strategy);
    onReviewComplete = (decisions) => reviewResolve({ decisions, quit: false });
    onReviewQuit = (decisions) => reviewResolve({ decisions, quit: true });
    onSummaryConfirm = (apply) => summaryResolve(apply);

    return (
      <App
        phase={currentPhase}
        onConfirm={onConfirm}
        onStrategySelect={onStrategySelect}
        onReviewComplete={onReviewComplete}
        onReviewQuit={onReviewQuit}
        onSummaryConfirm={onSummaryConfirm}
      />
    );
  }

  const { unmount } = render(<ReactiveApp />);

  // Fetch stars + lists
  const [allRepos, lists] = await Promise.all([
    fetchStarredRepos(graphqlWithAuth),
    fetchUserLists(graphqlWithAuth),
  ]);

  // Derive listIds from fetched lists (Repository.lists field doesn't exist in GitHub's API)
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
    setPhase({ tag: "info", message: "No starred repositories found." });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    unmount();
    process.exit(0);
  }

  // Confirm before analysis
  setPhase({ tag: "confirm", repoCount: repos.length });
  const proceed = await confirmPromise;
  if (!proceed) {
    unmount();
    process.exit(0);
  }

  // Strategy selection
  setPhase({ tag: "pick-strategy" });
  const strategy = await strategyPromise;

  // Fetch READMEs
  setPhase({ tag: "fetching" });
  const readmes = await fetchAllReadmes(
    repos.map((r) => ({ owner: r.owner, name: r.name })),
    token,
    cliArgs.concurrency,
  );

  // Set up Langfuse tracing (no-op when credentials are absent)
  const langfuse = createLangfuseClient();
  process.on("beforeExit", () => {
    flushTracing(langfuse);
  });
  const trace = langfuse
    ? createRunTrace(
        langfuse,
        { repoCount: repos.length, backend: cliArgs.backend ?? "openai" },
        generateSessionId(),
      )
    : null;

  // Analyze repos
  const analyzer = createAnalyzer(cliArgs.backend, trace);
  const existingListNames = lists.map((l) => l.name);
  const analyzedRepos: AnalyzedRepo[] = [];
  let analyzed = 0;

  setPhase({ tag: "analyzing", analyzed: 0, total: repos.length });

  await Promise.all(
    repos.map(async (repo) => {
      let analysis;
      if (repo.isArchived) {
        analysis = {
          category: "Archived",
          killerFeature: "(archived repository)",
          dataQuality: "sparse" as const,
        };
      } else {
        const readme = readmes.get(`${repo.owner}/${repo.name}`) ?? "";
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
      }
      analyzedRepos.push({ repo, analysis });
      analyzed++;
      setPhase({ tag: "analyzing", analyzed, total: repos.length });
    }),
  );

  // Consolidate proposed new category names to reduce list proliferation
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
  );
  for (const entry of analyzedRepos) {
    const consolidated = remapping.get(entry.analysis.category);
    if (consolidated) {
      entry.analysis.category = consolidated;
    }
  }

  // Generate suggestions (re-routes singleton-category repos via AI)
  const { suggestions, count, reroutedRepos } = await generateSuggestions(
    analyzedRepos,
    lists,
    undefined,
    strategy,
  );

  if (count === 0) {
    setPhase({
      tag: "info",
      message: "No suggestions generated — all repos are already well organized!",
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    unmount();
    process.exit(0);
  }

  // Enter TUI review
  setPhase({ tag: "review", suggestions, mergeWarnings });

  const { decisions, quit } = await reviewPromise;

  const acceptedCount = Array.from(decisions.values()).filter((d) => d === "accepted").length;

  if (quit && acceptedCount === 0) {
    unmount();
    process.exit(0);
  }

  // Summary screen
  setPhase({
    tag: "summary",
    suggestions,
    decisions,
    reroutedRepos,
    strategy,
    existingListCount: lists.length,
  });
  const apply = await summaryPromise;

  if (!apply || acceptedCount === 0) {
    setPhase({ tag: "info", message: "No changes applied." });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    unmount();
    process.exit(0);
  }

  // In recreate mode, delete all existing lists before applying (task 7.4)
  if (strategy === "recreate" && lists.length > 0) {
    await deleteAllLists(lists, graphqlWithAuth);
  }

  // Apply mutations
  const mutationResults: MutationResult[] = [];
  setPhase({ tag: "applying", results: [] });

  const finalResults = await applyAcceptedSuggestions(
    suggestions,
    decisions,
    graphqlWithAuth,
    (result) => {
      mutationResults.push(result);
      setPhase({ tag: "applying", results: [...mutationResults] });
    },
  );

  setPhase({ tag: "done", results: finalResults });

  // Wait briefly for TUI to render final state
  await new Promise((resolve) => setTimeout(resolve, 500));
  unmount();

  const failed = finalResults.filter((r) => r.status === "failed").length;

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
