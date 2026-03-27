import React from "react";
import { Box, Text, useInput } from "ink";

export type ScopeMode = "all" | "unlisted-only";

interface ScopeScreenProps {
  onSelect: (mode: ScopeMode) => void;
}

export function ScopeScreen({ onSelect }: ScopeScreenProps) {
  useInput((input) => {
    if (input === "2") onSelect("unlisted-only");
    else if (input === "1" || input === "") onSelect("all");
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Scope:</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          {"  "}
          <Text color="cyan">1)</Text> All starred repos{"  "}
          <Text color="gray">— analyze everything (default)</Text>
        </Text>
        <Text>
          {"  "}
          <Text color="cyan">2)</Text> Unlisted repos only{"  "}
          <Text color="gray">— skip repos already in a list</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="yellow">Select [1/2, Enter = 1]: </Text>
      </Box>
    </Box>
  );
}
