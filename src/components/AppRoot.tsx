import React from "react";
import { Box, Text } from "ink";

import type { ScopeMode, ConsolidationStrategy } from "../types.js";
import type { AppPhase } from "../state/phases.js";
import type { ReviewDecision } from "./ReviewScreen.js";
import type { InterruptChoice } from "./InterruptConfirmScreen.js";

import { LoadingScreen } from "./LoadingScreen.js";
import { ConfirmScreen } from "./ConfirmScreen.js";
import { ScopeScreen } from "./ScopeScreen.js";
import { StrategyScreen } from "./StrategyScreen.js";
import { ReviewScreen } from "./ReviewScreen.js";
import { SummaryScreen } from "./SummaryScreen.js";
import { SavePromptScreen } from "./SavePromptScreen.js";
import { ConsolidatingScreen } from "./ConsolidatingScreen.js";
import { StepIndicator } from "./StepIndicator.js";
import { InterruptConfirmScreen } from "./InterruptConfirmScreen.js";

export const DIVIDER = "─".repeat(84);
export const SHOW_STEPS_TAGS = new Set([
  "fetching-initial",
  "confirm",
  "pick-scope",
  "pick-strategy",
  "fetching",
  "analyzing",
  "consolidating",
  "interrupt-confirm",
  "review",
  "summary",
  "applying",
  "done",
]);

export interface AppProps {
  phase: AppPhase;
  onConfirm: (proceed: boolean) => void;
  onScopeSelect: (mode: ScopeMode) => void;
  onStrategySelect: (strategy: ConsolidationStrategy) => void;
  onReviewComplete: (decisions: Map<number, ReviewDecision>) => void;
  onReviewQuit: (decisions: Map<number, ReviewDecision>) => void;
  onSummaryConfirm: (apply: boolean) => void;
  onSavePromptSubmit: (path: string) => void;
  onInterruptChoice: (choice: InterruptChoice) => void;
  onAnalysisInterrupt: () => void;
}

export function App({
  phase,
  onConfirm,
  onScopeSelect,
  onStrategySelect,
  onReviewComplete,
  onReviewQuit,
  onSummaryConfirm,
  onSavePromptSubmit,
  onInterruptChoice,
  onAnalysisInterrupt,
}: AppProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={90}>
      {/* Banner */}
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Box justifyContent="space-between" width={84}>
          <Text color="magenta" bold>
            {"✦ ★ ✦  gh-star-constellation-finder  ✦ ★ ✦"}
          </Text>
          <Text color="gray">v1.0</Text>
        </Box>
        <Text color="gray" dimColor>
          {"Organize your GitHub starred repositories with AI"}
        </Text>
      </Box>

      <Text color="gray" dimColor>
        {DIVIDER}
      </Text>

      {/* Step indicator */}
      {SHOW_STEPS_TAGS.has(phase.tag) && (
        <Box marginTop={1} marginBottom={1}>
          <StepIndicator phaseTag={phase.tag} />
        </Box>
      )}

      <Text color="gray" dimColor>
        {DIVIDER}
      </Text>

      {phase.tag === "fetching-initial" && (
        <LoadingScreen analyzed={0} total={0} phase="fetching" />
      )}

      {phase.tag === "confirm" && (
        <ConfirmScreen
          repoCount={phase.repoCount}
          listCount={phase.listCount}
          login={phase.login}
          onConfirm={onConfirm}
          showAnalyticsNotice={phase.showAnalyticsNotice}
        />
      )}

      {phase.tag === "pick-scope" && <ScopeScreen onSelect={onScopeSelect} />}

      {phase.tag === "pick-strategy" && (
        <StrategyScreen
          onSelect={onStrategySelect}
          scopeMode={phase.scopeMode}
          hasLists={phase.hasLists}
        />
      )}

      {phase.tag === "fetching" && (
        <LoadingScreen analyzed={0} total={0} phase="fetching" filterLabel={phase.filterLabel} />
      )}

      {phase.tag === "analyzing" && (
        <LoadingScreen
          analyzed={phase.analyzed}
          total={phase.total}
          phase="analyzing"
          filterLabel={phase.filterLabel}
          stopping={phase.stopping}
          currentRepo={phase.currentRepo}
          onInterrupt={onAnalysisInterrupt}
        />
      )}

      {phase.tag === "consolidating" && <ConsolidatingScreen subStep={phase.subStep} />}

      {phase.tag === "interrupt-confirm" && (
        <InterruptConfirmScreen
          analyzedCount={phase.analyzedCount}
          totalCount={phase.totalCount}
          onChoice={onInterruptChoice}
        />
      )}

      {phase.tag === "review" && (
        <ReviewScreen
          suggestions={phase.suggestions}
          mergeWarnings={phase.mergeWarnings}
          repos={phase.repos}
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
          scopeMode={phase.scopeMode}
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

      {phase.tag === "save-prompt" && (
        <SavePromptScreen onSubmit={onSavePromptSubmit} errorMessage={phase.saveError} />
      )}
    </Box>
  );
}
