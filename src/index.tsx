import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import * as readline from 'node:readline';

import { authenticate } from './github/auth.js';
import { fetchStarredRepos, fetchUserLists } from './github/starFetcher.js';
import { fetchAllReadmes } from './github/readmeFetcher.js';
import { createAnalyzer, type Backend } from './ai/index.js';
import { consolidateCategories } from './ai/consolidator.js';
import { generateSuggestions } from './engine/suggestionEngine.js';
import type { AnalyzedRepo } from './engine/suggestionEngine.js';
import { applyAcceptedSuggestions, type MutationResult } from './github/mutator.js';
import type { Suggestion } from './types.js';

import { LoadingScreen } from './components/LoadingScreen.js';
import { ReviewScreen, type ReviewDecision } from './components/ReviewScreen.js';
import { SummaryScreen } from './components/SummaryScreen.js';

// --- CLI arg parsing ---

interface CliArgs {
  backend?: Backend;
  limit?: number;
  concurrency: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { concurrency: 5 };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--backend' && args[i + 1]) {
      result.backend = args[i + 1] as Backend;
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      result.concurrency = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return result;
}

function prompt(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// --- App state types ---

type AppPhase =
  | { tag: 'fetching' }
  | { tag: 'analyzing'; analyzed: number; total: number }
  | { tag: 'review'; suggestions: Suggestion[] }
  | { tag: 'summary'; suggestions: Suggestion[]; decisions: Map<number, ReviewDecision> }
  | { tag: 'applying'; results: MutationResult[] }
  | { tag: 'done'; results: MutationResult[] }
  | { tag: 'error'; message: string };

// --- Main App Component ---

interface AppProps {
  phase: AppPhase;
  onReviewComplete: (decisions: Map<number, ReviewDecision>) => void;
  onReviewQuit: (decisions: Map<number, ReviewDecision>) => void;
  onSummaryConfirm: (apply: boolean) => void;
}

function App({ phase, onReviewComplete, onReviewQuit, onSummaryConfirm }: AppProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={90}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="magenta" bold>
          gh-star-constellation-finder
        </Text>
        <Text color="gray">v1.0</Text>
      </Box>

      {phase.tag === 'fetching' && (
        <LoadingScreen analyzed={0} total={0} phase="fetching" />
      )}

      {phase.tag === 'analyzing' && (
        <LoadingScreen analyzed={phase.analyzed} total={phase.total} phase="analyzing" />
      )}

      {phase.tag === 'review' && (
        <ReviewScreen
          suggestions={phase.suggestions}
          onComplete={onReviewComplete}
          onQuit={onReviewQuit}
        />
      )}

      {phase.tag === 'summary' && (
        <SummaryScreen
          suggestions={phase.suggestions}
          decisions={phase.decisions}
          onConfirm={onSummaryConfirm}
        />
      )}

      {phase.tag === 'applying' && (
        <Box flexDirection="column" padding={1}>
          <Text bold color="cyan">Applying changes...</Text>
          {phase.results.map((r, i) => (
            <Text key={i} color={r.status === 'success' ? 'green' : 'red'}>
              {r.status === 'success' ? '✓' : '✗'} {r.message}
            </Text>
          ))}
        </Box>
      )}

      {phase.tag === 'done' && (
        <Box flexDirection="column" padding={1}>
          <Text bold color="green">Done!</Text>
          {phase.results.map((r, i) => (
            <Text key={i} color={r.status === 'success' ? 'green' : 'red'}>
              {r.status === 'success' ? '✓' : '✗'} {r.message}
            </Text>
          ))}
        </Box>
      )}

      {phase.tag === 'error' && (
        <Box padding={1}>
          <Text color="red">Error: {phase.message}</Text>
        </Box>
      )}
    </Box>
  );
}

// --- Orchestration ---

async function main() {
  const cliArgs = parseArgs();

  // Auth
  const { login, token, graphqlWithAuth } = await authenticate();
  console.log(`Authenticated as: ${login}`);

  // Fetch stars + lists
  console.log('Fetching starred repositories...');
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
    console.log('No starred repositories found.');
    process.exit(0);
  }

  // Confirm before analysis
  const proceed = await prompt(
    `\nFound ${repos.length} starred repos. This will make ${repos.length} AI API calls. Proceed? [y/N] `
  );
  if (!proceed) {
    console.log('Aborted.');
    process.exit(0);
  }

  // Set up phase state for the TUI
  let phase: AppPhase = { tag: 'fetching' };
  let setPhase: (p: AppPhase) => void = () => {};
  let onReviewComplete: (d: Map<number, ReviewDecision>) => void = () => {};
  let onReviewQuit: (d: Map<number, ReviewDecision>) => void = () => {};
  let onSummaryConfirm: (apply: boolean) => void = () => {};

  // Promises to bridge TUI events back to async flow
  let reviewResolve: (result: { decisions: Map<number, ReviewDecision>; quit: boolean }) => void;
  const reviewPromise = new Promise<{ decisions: Map<number, ReviewDecision>; quit: boolean }>(
    (resolve) => { reviewResolve = resolve; }
  );

  let summaryResolve: (apply: boolean) => void;
  const summaryPromise = new Promise<boolean>((resolve) => { summaryResolve = resolve; });

  // Reactive state management for Ink
  function ReactiveApp() {
    const [currentPhase, setCurrentPhaseInner] = useState<AppPhase>(phase);

    useEffect(() => {
      setPhase = (p) => {
        phase = p;
        setCurrentPhaseInner(p);
      };
    }, []);

    onReviewComplete = (decisions) => reviewResolve({ decisions, quit: false });
    onReviewQuit = (decisions) => reviewResolve({ decisions, quit: true });
    onSummaryConfirm = (apply) => summaryResolve(apply);

    return (
      <App
        phase={currentPhase}
        onReviewComplete={onReviewComplete}
        onReviewQuit={onReviewQuit}
        onSummaryConfirm={onSummaryConfirm}
      />
    );
  }

  const { unmount } = render(<ReactiveApp />);

  // Fetch READMEs
  setPhase({ tag: 'fetching' });
  const readmes = await fetchAllReadmes(
    repos.map((r) => ({ owner: r.owner, name: r.name })),
    token,
    cliArgs.concurrency
  );

  // Analyze repos
  const analyzer = createAnalyzer(cliArgs.backend);
  const existingListNames = lists.map((l) => l.name);
  const analyzedRepos: AnalyzedRepo[] = [];
  let analyzed = 0;

  setPhase({ tag: 'analyzing', analyzed: 0, total: repos.length });

  await Promise.all(
    repos.map(async (repo) => {
      const readme = readmes.get(`${repo.owner}/${repo.name}`) ?? '';
      const analysis = await analyzer.analyze({
        name: repo.name,
        owner: repo.owner,
        description: repo.description,
        language: repo.language,
        topics: repo.topics,
        readme,
        existingListNames,
      });
      analyzedRepos.push({ repo, analysis });
      analyzed++;
      setPhase({ tag: 'analyzing', analyzed, total: repos.length });
    })
  );

  // Consolidate proposed new category names to reduce list proliferation
  const existingListNamesLower = new Set(existingListNames.map((n) => n.toLowerCase().trim()));
  const newCategoryNames = [
    ...new Set(
      analyzedRepos
        .map((r) => r.analysis.category)
        .filter((c) => !existingListNamesLower.has(c.toLowerCase().trim()))
    ),
  ];
  const remapping = await consolidateCategories(newCategoryNames);
  for (const entry of analyzedRepos) {
    const consolidated = remapping.get(entry.analysis.category);
    if (consolidated) {
      entry.analysis.category = consolidated;
    }
  }

  // Generate suggestions
  const { suggestions, count } = generateSuggestions(analyzedRepos, lists);

  if (count === 0) {
    unmount();
    console.log('No suggestions generated — all repos are already well organized!');
    process.exit(0);
  }

  // Enter TUI review
  setPhase({ tag: 'review', suggestions });

  const { decisions, quit } = await reviewPromise;

  const acceptedCount = Array.from(decisions.values()).filter((d) => d === 'accepted').length;

  if (quit && acceptedCount === 0) {
    unmount();
    process.exit(0);
  }

  // Summary screen
  setPhase({ tag: 'summary', suggestions, decisions });
  const apply = await summaryPromise;

  if (!apply || acceptedCount === 0) {
    unmount();
    console.log('No changes applied.');
    process.exit(0);
  }

  // Apply mutations
  const mutationResults: MutationResult[] = [];
  setPhase({ tag: 'applying', results: [] });

  const finalResults = await applyAcceptedSuggestions(
    suggestions,
    decisions,
    graphqlWithAuth,
    (result) => {
      mutationResults.push(result);
      setPhase({ tag: 'applying', results: [...mutationResults] });
    }
  );

  setPhase({ tag: 'done', results: finalResults });

  // Wait briefly for TUI to render final state
  await new Promise((resolve) => setTimeout(resolve, 500));
  unmount();

  const succeeded = finalResults.filter((r) => r.status === 'success').length;
  const failed = finalResults.filter((r) => r.status === 'failed').length;
  const skipped = decisions.size - acceptedCount;

  console.log(`\nSession summary: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
