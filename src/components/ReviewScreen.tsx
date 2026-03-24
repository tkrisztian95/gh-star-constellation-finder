import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Suggestion } from '../types.js';

export type ReviewDecision = 'accepted' | 'skipped' | 'rejected';

interface QuitConfirmProps {
  acceptedCount: number;
  onConfirm: (applyBeforeQuit: boolean) => void;
}

function QuitConfirmPrompt({ acceptedCount, onConfirm }: QuitConfirmProps) {
  useInput((input) => {
    if (input.toLowerCase() === 'y') onConfirm(true);
    else if (input.toLowerCase() === 'n' || input === '') onConfirm(false);
  });

  return (
    <Box marginTop={1}>
      <Text color="yellow">
        Apply {acceptedCount} accepted suggestion(s) before quitting? [y/N]{' '}
      </Text>
    </Box>
  );
}

interface ReviewScreenProps {
  suggestions: Suggestion[];
  mergeWarnings: string[];
  onComplete: (decisions: Map<number, ReviewDecision>) => void;
  onQuit: (decisions: Map<number, ReviewDecision>) => void;
}

export function ReviewScreen({ suggestions, mergeWarnings, onComplete, onQuit }: ReviewScreenProps) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<number, ReviewDecision>>(new Map());
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const current = suggestions[index];
  const acceptedCount = Array.from(decisions.values()).filter((d) => d === 'accepted').length;

  useInput((input, key) => {
    if (showQuitConfirm) return;

    if (input.toLowerCase() === 'q' || key.escape) {
      setShowQuitConfirm(true);
      return;
    }

    if (input.toLowerCase() === 'a' || key.return) {
      const next = new Map(decisions);
      next.set(index, 'accepted');
      setDecisions(next);
      if (index + 1 >= suggestions.length) {
        onComplete(next);
      } else {
        setIndex(index + 1);
      }
      return;
    }

    if (input.toLowerCase() === 's') {
      const next = new Map(decisions);
      next.set(index, 'skipped');
      setDecisions(next);
      if (index + 1 >= suggestions.length) {
        onComplete(next);
      } else {
        setIndex(index + 1);
      }
      return;
    }

    if (input.toLowerCase() === 'r') {
      const next = new Map(decisions);
      next.set(index, 'rejected');
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

  const actionLabel =
    current.type === 'create-list'
      ? `Create list "${current.targetListName}" and add`
      : `Move to list "${current.targetListName}"`;

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
          <Text bold color="yellow">⚠ GitHub list limit advisory</Text>
          <Text color="yellow">Some categories were merged to stay within GitHub's 32-list limit:</Text>
          {mergeWarnings.map((w, i) => (
            <Text key={i} color="yellow">  • {w}</Text>
          ))}
          <Text color="gray">Tip: delete unused lists to free up slots, then re-run analysis.</Text>
        </Box>
      )}

      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="magenta">
          Suggestion {index + 1} of {suggestions.length}
        </Text>
        <Text color="gray">[a/Enter] Accept  [s] Skip  [r] Reject  [q] Quit</Text>
      </Box>

      {/* Suggestion panel */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        gap={0}
      >
        <Text bold color="white">
          {current.repo.owner}/
          <Text color="green">{current.repo.name}</Text>
        </Text>

        {current.repo.description ? (
          <Text color="gray">{current.repo.description}</Text>
        ) : null}

        <Text>
          Language:{' '}
          <Text color="yellow">{current.repo.language ?? 'N/A'}</Text>
        </Text>

        {current.repo.topics.length > 0 && (
          <Text color="gray">Topics: {current.repo.topics.join(', ')}</Text>
        )}

        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">AI Analysis</Text>
          <Text>
            Category:{' '}
            <Text bold color="magenta">
              {current.analysis.category}
            </Text>
          </Text>
          {current.analysis.killerFeature ? (
            <Text>
              Killer Feature:{' '}
              <Text italic>{current.analysis.killerFeature}</Text>
            </Text>
          ) : null}
        </Box>

        <Box marginTop={1}>
          <Text>
            Action:{' '}
            <Text bold color="blue">
              {actionLabel}
            </Text>
          </Text>
        </Box>
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
