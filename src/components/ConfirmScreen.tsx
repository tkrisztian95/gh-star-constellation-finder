import React from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmScreenProps {
  repoCount: number;
  onConfirm: (proceed: boolean) => void;
}

export function ConfirmScreen({ repoCount, onConfirm }: ConfirmScreenProps) {
  useInput((input) => {
    if (input.toLowerCase() === "y") onConfirm(true);
    else if (input.toLowerCase() === "n" || input === "") onConfirm(false);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text>
        Found{" "}
        <Text bold color="cyan">
          {repoCount}
        </Text>{" "}
        starred repo{repoCount !== 1 ? "s" : ""}. This will make{" "}
        <Text bold color="yellow">
          {repoCount}
        </Text>{" "}
        AI API call{repoCount !== 1 ? "s" : ""}.
      </Text>
      <Box marginTop={1}>
        <Text color="yellow">Proceed? [y/N] </Text>
      </Box>
    </Box>
  );
}
