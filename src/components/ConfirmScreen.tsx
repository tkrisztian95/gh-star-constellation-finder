import React from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmScreenProps {
  repoCount: number;
  login: string;
  onConfirm: (proceed: boolean) => void;
}

export function ConfirmScreen({ repoCount, login, onConfirm }: ConfirmScreenProps) {
  useInput((input) => {
    if (input.toLowerCase() === "y") onConfirm(true);
    else if (input.toLowerCase() === "n" || input === "") onConfirm(false);
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text>
        Found{" "}
        <Text bold color="cyan">
          {repoCount}
        </Text>{" "}
        starred repo{repoCount !== 1 ? "s" : ""} for{" "}
        <Text bold color="magenta">
          @{login}
        </Text>
        .
      </Text>
      <Text color="gray" dimColor>
        {"  Note: this will make "}
        <Text color="gray" dimColor bold>
          {repoCount}
        </Text>
        {" AI API call"}
        {repoCount !== 1 ? "s" : ""}.
      </Text>
      <Text color="yellow">Proceed? [y/N] </Text>
    </Box>
  );
}
