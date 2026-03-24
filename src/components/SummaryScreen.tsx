import React from "react";
import { Box, Text, useInput } from "ink";
import type { Suggestion } from "../types.js";
import type { ReroutedRepo } from "../engine/suggestionEngine.js";
import type { ReviewDecision } from "./ReviewScreen.js";

interface SummaryScreenProps {
  suggestions: Suggestion[];
  decisions: Map<number, ReviewDecision>;
  reroutedRepos: ReroutedRepo[];
  onConfirm: (apply: boolean) => void;
}

export function SummaryScreen({
  suggestions,
  decisions,
  reroutedRepos,
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

  useInput((input) => {
    if (input.toLowerCase() === "y") onConfirm(true);
    else if (input.toLowerCase() === "n" || input === "") onConfirm(false);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        Review Summary
      </Text>

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
          {accepted.map((s, i) => (
            <Text key={i} color="gray">
              {" "}
              {s.type === "create-list" ? "Create" : "Move"}{" "}
              <Text color="white">
                {s.repo.owner}/{s.repo.name}
              </Text>{" "}
              → <Text color="cyan">{s.targetListName}</Text>
            </Text>
          ))}
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
    </Box>
  );
}
