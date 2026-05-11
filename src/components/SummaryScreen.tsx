import React from "react";
import { Box, Text, useInput } from "ink";
import type { Suggestion, ConsolidationStrategy, ScopeMode, PhaseTimings } from "../types.js";
import type { ReroutedRepo } from "../engine/suggestionEngine.js";
import type { ReviewDecision } from "./ReviewScreen.js";
import { PhaseTimingsLines } from "./PhaseTimingsLines.js";

/** Pure routing logic — exported for testing. Returns null when the keystroke is not a recognised confirm choice. */
export function resolveSummaryConfirmChoice(input: string, isEnter: boolean): boolean | null {
  if (input.toLowerCase() === "y") return true;
  if (input.toLowerCase() === "n" || isEnter) return false;
  return null;
}

interface SummaryScreenProps {
  suggestions: Suggestion[];
  decisions: Map<number, ReviewDecision>;
  reroutedRepos: ReroutedRepo[];
  strategy?: ConsolidationStrategy;
  existingListCount?: number;
  scopeMode?: ScopeMode;
  phaseTimings?: PhaseTimings;
  onConfirm: (apply: boolean) => void;
}

const STRATEGY_LABELS: Record<ConsolidationStrategy, string> = {
  "keep-existing": "Keep existing",
  recreate: "Re-create all",
  "allow-rename": "Allow rename",
};

export function SummaryScreen({
  suggestions,
  decisions,
  reroutedRepos,
  strategy = "keep-existing",
  existingListCount = 0,
  scopeMode,
  phaseTimings,
  onConfirm,
}: SummaryScreenProps) {
  const accepted: Suggestion[] = [];
  const skipped: Suggestion[] = [];
  const rejected: Suggestion[] = [];

  decisions.forEach((decision, idx) => {
    const s = suggestions[idx];
    if (!s) return;
    if (decision === "accepted") accepted.push(s);
    else if (decision === "skipped") skipped.push(s);
    else if (decision === "rejected") rejected.push(s);
  });

  useInput((input, key) => {
    const choice = resolveSummaryConfirmChoice(input, key.return);
    if (choice !== null) onConfirm(choice);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between">
        <Text bold color="magenta">
          Review Summary
        </Text>
        <Text color="cyan">[{STRATEGY_LABELS[strategy]}]</Text>
      </Box>

      {scopeMode === "unlisted-only" && (
        <Box marginTop={1}>
          <Text color="yellow">Scope: unlisted repos only</Text>
        </Box>
      )}

      {strategy === "recreate" && existingListCount > 0 && (
        <Box marginTop={1} borderStyle="round" borderColor="red" padding={1}>
          <Text color="red" bold>
            ⚠ Will DELETE {existingListCount} existing list{existingListCount !== 1 ? "s" : ""}{" "}
            before applying
          </Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text>
          Accepted:{" "}
          <Text bold color="green">
            {accepted.length}
          </Text>
        </Text>
        <Text>
          Skipped:{" "}
          <Text bold color="yellow">
            {skipped.length}
          </Text>
        </Text>
        <Text>
          Rejected:{" "}
          <Text bold color="red">
            {rejected.length}
          </Text>
        </Text>
      </Box>

      {accepted.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Accepted actions:</Text>
          {accepted.map((s, i) => {
            if (s.type === "rename-list") {
              return (
                <Text key={i} color="gray">
                  {" "}
                  Rename list <Text color="white">'{s.oldName}'</Text> →{" "}
                  <Text color="cyan">'{s.newName}'</Text>
                </Text>
              );
            }
            if (s.type === "delete-list") {
              return (
                <Text key={i} color="gray">
                  {" "}
                  Delete list <Text color="white">'{s.listName}'</Text>
                </Text>
              );
            }
            return (
              <Text key={i} color="gray">
                {" "}
                {s.type === "create-list" ? "Create" : "Move"}{" "}
                <Text color="white">
                  {s.repo.owner}/{s.repo.name}
                </Text>{" "}
                → <Text color="cyan">{s.targetListName}</Text>
              </Text>
            );
          })}
        </Box>
      )}

      {reroutedRepos.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Re-routed repos:</Text>
          {reroutedRepos.map((r, i) =>
            r.targetList ? (
              <Text key={i} color="gray">
                {" "}
                <Text color="white">{r.repoName}</Text> ({r.category}) →{" "}
                <Text color="cyan">{r.targetList}</Text>
              </Text>
            ) : (
              <Text key={i} color="yellow">
                {" "}
                ⚠ <Text color="white">{r.repoName}</Text> ({r.category}) — no suitable list found,
                not assigned
              </Text>
            ),
          )}
        </Box>
      )}

      {accepted.length > 0 ? (
        <Box marginTop={1}>
          <Text color="yellow">Apply these {accepted.length} changes? [y/N] </Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="gray">No accepted changes. Exiting...</Text>
        </Box>
      )}

      {phaseTimings && <PhaseTimingsLines phaseTimings={phaseTimings} />}
    </Box>
  );
}
