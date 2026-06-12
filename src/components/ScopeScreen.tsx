import React from "react";
import { Box, Text, useInput } from "ink";

import type { ScopeMode } from "../types.js";

/** Pure routing logic — exported for testing */
export function resolveScopeChoice(input: string, isEnter: boolean): ScopeMode | null {
  if (input === "2") return "unlisted-only";
  if (input === "1" || isEnter) return "all";
  return null;
}

/** Pure count formatter — exported for testing */
export function formatScopeCount(count: number): string {
  return `(${count})`;
}

interface ScopeScreenProps {
  onSelect: (mode: ScopeMode) => void;
  totalCount: number;
  unlistedCount: number;
}

export function ScopeScreen({ onSelect, totalCount, unlistedCount }: ScopeScreenProps) {
  useInput((input, key) => {
    const choice = resolveScopeChoice(input, key.return);
    if (choice) onSelect(choice);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Scope:</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          {"  "}
          <Text color="cyan">1)</Text> All starred repos{" "}
          <Text color="gray">{formatScopeCount(totalCount)}</Text>
          {"  "}
          <Text color="gray">— analyze everything (default)</Text>
        </Text>
        <Text>
          {"  "}
          <Text color="cyan">2)</Text> Unlisted repos only{" "}
          <Text color="gray">{formatScopeCount(unlistedCount)}</Text>
          {"  "}
          <Text color="gray">— skip repos already in a list</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="yellow">Select [1/2, Enter = 1]: </Text>
      </Box>
    </Box>
  );
}
