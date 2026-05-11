import React from "react";
import { Box, Text, useInput } from "ink";
import type { ConsolidationStrategy, ScopeMode } from "../types.js";

/** Pure routing logic — exported for testing */
export function resolveStrategyChoice(
  input: string,
  isEnter: boolean,
  hasLists: boolean,
): ConsolidationStrategy | null {
  if (hasLists && input === "2") return "recreate";
  if (hasLists && input === "3") return "allow-rename";
  if (input === "1" || isEnter) return "keep-existing";
  return null;
}

interface StrategyScreenProps {
  onSelect: (strategy: ConsolidationStrategy) => void;
  scopeMode?: ScopeMode;
  hasLists?: boolean;
}

export function StrategyScreen({ onSelect, scopeMode, hasLists = true }: StrategyScreenProps) {
  useInput((input, key) => {
    const choice = resolveStrategyChoice(input, key.return, hasLists);
    if (choice) onSelect(choice);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Consolidation strategy:</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          {"  "}
          <Text color="cyan">1)</Text> Keep existing{"  "}
          <Text color="gray">— preserve all lists, add new ones as needed (default)</Text>
        </Text>
        {hasLists && (
          <Text>
            {"  "}
            <Text color="cyan">2)</Text> Re-create all{"  "}
            <Text color="gray">— delete every list, then build fresh from AI categories</Text>
          </Text>
        )}
        {hasLists && (
          <Text>
            {"  "}
            <Text color="cyan">3)</Text> Allow rename{"   "}
            <Text color="gray">— keep lists but rename them when AI suggests a better name</Text>
          </Text>
        )}
        {hasLists && scopeMode === "unlisted-only" && (
          <Text color="yellow">
            {"     "}
            Note: only empty or single-repo lists are eligible for renaming (repos already in lists
            were not analysed)
          </Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="yellow">
          {hasLists ? "Select [1/2/3, Enter = 1]: " : "Select [1, Enter = 1]: "}
        </Text>
      </Box>
    </Box>
  );
}
