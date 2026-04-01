import React from "react";
import { Box, Text, useInput } from "ink";
import type { ConsolidationStrategy, ScopeMode } from "../types.js";

interface StrategyScreenProps {
  onSelect: (strategy: ConsolidationStrategy) => void;
  scopeMode?: ScopeMode;
  hasLists?: boolean;
}

export function StrategyScreen({ onSelect, scopeMode, hasLists = true }: StrategyScreenProps) {
  useInput((input) => {
    if (hasLists && input === "2") onSelect("recreate");
    else if (hasLists && input === "3") onSelect("allow-rename");
    else if (input === "1" || input === "") onSelect("keep-existing");
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
