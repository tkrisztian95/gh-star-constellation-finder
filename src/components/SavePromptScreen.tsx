import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { PhaseTimings } from "../types.js";
import { PhaseTimingsLines } from "./PhaseTimingsLines.js";

interface SavePromptScreenProps {
  onSubmit: (path: string) => void;
  errorMessage?: string;
  phaseTimings?: PhaseTimings;
}

export function SavePromptScreen({
  onSubmit,
  errorMessage,
  phaseTimings,
}: Readonly<SavePromptScreenProps>) {
  const [value, setValue] = useState("");

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Save session results to file?
      </Text>
      <Box marginTop={1}>
        <Text color="gray">Path (Enter to skip): </Text>
        <TextInput value={value} onChange={setValue} onSubmit={onSubmit} />
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color="red">Error: {errorMessage}</Text>
        </Box>
      )}
      {phaseTimings && <PhaseTimingsLines phaseTimings={phaseTimings} />}
    </Box>
  );
}
