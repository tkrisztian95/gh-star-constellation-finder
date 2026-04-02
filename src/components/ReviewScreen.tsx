import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Repo, Suggestion, CreateListSuggestion, MoveToListSuggestion } from "../types.js";

function isRepoSuggestion(s: Suggestion): s is CreateListSuggestion | MoveToListSuggestion {
  return s.type === "create-list" || s.type === "move-to-list";
}

export type ReviewDecision = "accepted" | "skipped" | "rejected";

export function deriveIncomingRepos(
  suggestions: Suggestion[],
  listId: string,
): MoveToListSuggestion[] {
  return suggestions.filter(
    (s) => s.type === "move-to-list" && s.targetListId === "rename:" + listId,
  ) as MoveToListSuggestion[];
}

export function deriveExistingUnanalyzed(
  repos: Repo[],
  listId: string,
  incomingRepoIds: Set<string>,
): Repo[] {
  return repos.filter((r) => r.listIds.includes(listId) && !incomingRepoIds.has(r.id));
}

export function deriveRenameDecision(
  suggestions: Suggestion[],
  decisions: Map<number, ReviewDecision>,
  targetListId: string,
): ReviewDecision | undefined {
  const renameIdx = suggestions.findIndex(
    (s) => s.type === "rename-list" && "rename:" + s.listId === targetListId,
  );
  return renameIdx >= 0 ? decisions.get(renameIdx) : undefined;
}

interface QuitConfirmProps {
  acceptedCount: number;
  onConfirm: (applyBeforeQuit: boolean) => void;
}

function QuitConfirmPrompt({ acceptedCount, onConfirm }: QuitConfirmProps) {
  useInput((input) => {
    if (input.toLowerCase() === "y") onConfirm(true);
    else if (input.toLowerCase() === "n" || input === "") onConfirm(false);
  });

  return (
    <Box marginTop={1}>
      <Text color="yellow">
        Apply {acceptedCount} accepted suggestion(s) before quitting? [y/N]{" "}
      </Text>
    </Box>
  );
}

interface ReviewScreenProps {
  suggestions: Suggestion[];
  mergeWarnings: string[];
  repos: Repo[];
  onComplete: (decisions: Map<number, ReviewDecision>) => void;
  onQuit: (decisions: Map<number, ReviewDecision>) => void;
}

export function ReviewScreen({
  suggestions,
  mergeWarnings,
  repos,
  onComplete,
  onQuit,
}: ReviewScreenProps) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<number, ReviewDecision>>(new Map());
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const current = suggestions[index];
  const acceptedCount = Array.from(decisions.values()).filter((d) => d === "accepted").length;

  useInput((input, key) => {
    if (showQuitConfirm) return;

    if (input.toLowerCase() === "q" || key.escape) {
      setShowQuitConfirm(true);
      return;
    }

    if (input.toLowerCase() === "a" || key.return) {
      const next = new Map(decisions);
      next.set(index, "accepted");
      setDecisions(next);
      if (index + 1 >= suggestions.length) {
        onComplete(next);
      } else {
        setIndex(index + 1);
      }
      return;
    }

    if (input.toLowerCase() === "s") {
      const next = new Map(decisions);
      next.set(index, "skipped");
      setDecisions(next);
      if (index + 1 >= suggestions.length) {
        onComplete(next);
      } else {
        setIndex(index + 1);
      }
      return;
    }

    if (input.toLowerCase() === "r") {
      const next = new Map(decisions);
      next.set(index, "rejected");
      setDecisions(next);
      if (index + 1 >= suggestions.length) {
        onComplete(next);
      } else {
        setIndex(index + 1);
      }
      return;
    }
  });

  if (!current) return null;

  const repoSuggestion = isRepoSuggestion(current) ? current : null;

  let actionLabel: string;
  if (current.type === "rename-list") {
    actionLabel = `Rename list '${current.oldName}' → '${current.newName}'`;
  } else if (repoSuggestion?.type === "create-list") {
    actionLabel = `Create list "${repoSuggestion.targetListName}" and add`;
  } else if (repoSuggestion) {
    actionLabel = `Move to list "${repoSuggestion.targetListName}"`;
  } else {
    actionLabel = "";
  }

  return (
    <Box flexDirection="column">
      {/* Merge advisory */}
      {mergeWarnings.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          padding={1}
          marginBottom={1}
        >
          <Text bold color="yellow">
            ⚠ GitHub list limit advisory
          </Text>
          <Text color="yellow">
            Some categories were merged to stay within GitHub's 32-list limit:
          </Text>
          {mergeWarnings.map((w, i) => (
            <Text key={i} color="yellow">
              {" "}
              • {w}
            </Text>
          ))}
          <Text color="gray">Tip: delete unused lists to free up slots, then re-run analysis.</Text>
        </Box>
      )}

      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="magenta">
          Suggestion {index + 1} of {suggestions.length}
        </Text>
        <Text color="gray">[a/Enter] Accept [s] Skip [r] Reject [q] Quit</Text>
      </Box>

      {/* Suggestion panel */}
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} gap={0}>
        {current.type === "rename-list" ? (
          <Box flexDirection="column">
            <Text bold color="cyan">
              List Rename
            </Text>
            <Text>
              <Text color="white">'{current.oldName}'</Text>
              {" → "}
              <Text color="green">'{current.newName}'</Text>
            </Text>
            <Text color="gray">
              Accepting renames the list. Rejecting creates a new list with the new name instead.
            </Text>
            {(() => {
              const incomingRepos = deriveIncomingRepos(suggestions, current.listId);
              const incomingRepoIds = new Set(incomingRepos.map((s) => s.repo.id));
              const existingUnanalyzed = deriveExistingUnanalyzed(
                repos,
                current.listId,
                incomingRepoIds,
              );
              return (
                <>
                  {incomingRepos.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                      <Text color="gray" dimColor>
                        Moving in if accepted:
                      </Text>
                      {incomingRepos.slice(0, 5).map((s, i) => (
                        <Text key={i} color="gray" dimColor>
                          {"  "}
                          {s.repo.owner}/{s.repo.name}
                        </Text>
                      ))}
                      {incomingRepos.length > 5 && (
                        <Text color="gray" dimColor>
                          {"  "}…and {incomingRepos.length - 5} more
                        </Text>
                      )}
                    </Box>
                  )}
                  {existingUnanalyzed.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                      <Text color="gray" dimColor>
                        Already in list (not analyzed):
                      </Text>
                      {existingUnanalyzed.slice(0, 5).map((r, i) => (
                        <Text key={i} color="gray" dimColor>
                          {"  "}
                          {r.owner}/{r.name}
                        </Text>
                      ))}
                      {existingUnanalyzed.length > 5 && (
                        <Text color="gray" dimColor>
                          {"  "}…and {existingUnanalyzed.length - 5} more
                        </Text>
                      )}
                    </Box>
                  )}
                </>
              );
            })()}
          </Box>
        ) : repoSuggestion ? (
          <>
            <Text bold color="white">
              {repoSuggestion.repo.owner}/<Text color="green">{repoSuggestion.repo.name}</Text>
            </Text>

            {repoSuggestion.repo.description ? (
              <Text color="gray">{repoSuggestion.repo.description}</Text>
            ) : null}

            <Text>
              Language: <Text color="yellow">{repoSuggestion.repo.language ?? "N/A"}</Text>
            </Text>

            {repoSuggestion.repo.topics.length > 0 && (
              <Text color="gray">Topics: {repoSuggestion.repo.topics.join(", ")}</Text>
            )}

            <Box marginTop={1} flexDirection="column">
              <Text bold color="cyan">
                AI Analysis
              </Text>
              <Text>
                Category:{" "}
                <Text bold color="magenta">
                  {repoSuggestion.analysis.category}
                </Text>
              </Text>
              {repoSuggestion.analysis.category.toLowerCase().trim() === "other" && (
                <Text color="gray" dimColor>
                  ℹ "Other" is a reserved catch-all bucket for repos that don't fit a specific
                  category. It is always kept and cannot be renamed or deleted.
                </Text>
              )}
              {repoSuggestion.analysis.killerFeature ? (
                <Text>
                  Killer Feature: <Text italic>{repoSuggestion.analysis.killerFeature}</Text>
                </Text>
              ) : null}
            </Box>
          </>
        ) : null}

        <Box marginTop={1}>
          <Text>
            Action:{" "}
            <Text bold color="blue">
              {actionLabel}
            </Text>
          </Text>
        </Box>
        {current.type === "move-to-list" &&
          current.targetListId?.startsWith("rename:") &&
          (() => {
            const renameDecision = deriveRenameDecision(
              suggestions,
              decisions,
              current.targetListId!,
            );
            if (renameDecision === "rejected" || renameDecision === "skipped") {
              return (
                <Text color="gray" dimColor>
                  Rename was declined — repo will be added to a newly created list '
                  {current.targetListName}' instead
                </Text>
              );
            }
            return null;
          })()}
      </Box>

      {showQuitConfirm && (
        <QuitConfirmPrompt
          acceptedCount={acceptedCount}
          onConfirm={(apply) => {
            if (apply && acceptedCount > 0) {
              onQuit(decisions);
            } else {
              onQuit(new Map());
            }
          }}
        />
      )}
    </Box>
  );
}
