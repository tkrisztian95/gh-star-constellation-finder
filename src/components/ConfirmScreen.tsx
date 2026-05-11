import React from "react";
import { Box, Text, useInput } from "ink";

/** Pure routing logic — exported for testing. Returns null when the keystroke is not a recognised confirm choice. */
export function resolveConfirmChoice(input: string, isEnter: boolean): boolean | null {
  if (input.toLowerCase() === "y") return true;
  if (input.toLowerCase() === "n" || isEnter) return false;
  return null;
}

interface ConfirmScreenProps {
  repoCount: number;
  listCount: number;
  login: string;
  onConfirm: (proceed: boolean) => void;
  showAnalyticsNotice?: boolean;
}

export function ConfirmScreen({
  repoCount,
  listCount,
  login,
  onConfirm,
  showAnalyticsNotice,
}: ConfirmScreenProps) {
  useInput((input, key) => {
    const choice = resolveConfirmChoice(input, key.return);
    if (choice !== null) onConfirm(choice);
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text>
        Found{" "}
        <Text bold color="cyan">
          {repoCount}
        </Text>{" "}
        starred repo{repoCount !== 1 ? "s" : ""} and{" "}
        <Text bold color="cyan">
          {listCount}
        </Text>{" "}
        list{listCount !== 1 ? "s" : ""} for{" "}
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
      {showAnalyticsNotice && (
        <Text color="gray" dimColor>
          {
            "  Anonymous usage data is collected to improve this tool. Run with --no-analytics to opt out."
          }
        </Text>
      )}
      <Text color="yellow">Proceed? [y/N] </Text>
    </Box>
  );
}
