import React from "react";
import { Box, Text, useInput } from "ink";

export type InterruptChoice = "continue" | "save" | "exit";

/** Pure routing logic — exported for testing */
export function resolveInterruptChoice(
  input: string,
  analyzedCount: number,
): InterruptChoice | null {
  if (analyzedCount > 0) {
    if (input === "1" || input === "") return "continue";
    if (input === "2") return "save";
    if (input === "3") return "exit";
    return null;
  } else {
    if (input === "1" || input === "" || input === "3") return "exit";
    return null;
  }
}

interface InterruptConfirmScreenProps {
  analyzedCount: number;
  totalCount: number;
  onChoice: (choice: InterruptChoice) => void;
}

export function InterruptConfirmScreen({
  analyzedCount,
  totalCount,
  onChoice,
}: InterruptConfirmScreenProps) {
  useInput((input) => {
    const choice = resolveInterruptChoice(input, analyzedCount);
    if (choice) onChoice(choice);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">
        Analysis stopped.{" "}
        <Text bold color="white">
          {analyzedCount}
        </Text>
        {" of "}
        <Text bold color="white">
          {totalCount}
        </Text>
        {" repos analyzed."}
      </Text>

      {analyzedCount > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>What would you like to do?</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>
              {"  "}
              <Text color="cyan">1)</Text> Continue with partial results{"  "}
              <Text color="gray">
                — organize {analyzedCount} analyzed repos into lists (default)
              </Text>
            </Text>
            <Text>
              {"  "}
              <Text color="cyan">2)</Text> Save partial results to file{"  "}
              <Text color="gray">— write analysis JSON and exit</Text>
            </Text>
            <Text>
              {"  "}
              <Text color="cyan">3)</Text> Exit{"  "}
              <Text color="gray">— discard and quit</Text>
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="yellow">Select [1/2/3, Enter = 1]: </Text>
          </Box>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">No repos were analyzed — nothing to organize or save.</Text>
          <Box marginTop={1}>
            <Text color="yellow">Press Enter to exit.</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
