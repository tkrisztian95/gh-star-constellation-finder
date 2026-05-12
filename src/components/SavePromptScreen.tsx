import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { PhaseTimings } from "../types.js";
import { PhaseTimingsLines } from "./PhaseTimingsLines.js";

export function resolveSavePromptValue(input: string): string {
  return input.trim();
}

interface SavePromptScreenProps {
  onSubmit: (path: string) => void;
  defaultPath: string;
  errorMessage?: string;
  phaseTimings?: PhaseTimings;
}

export function SavePromptScreen({
  onSubmit,
  defaultPath,
  errorMessage,
  phaseTimings,
}: Readonly<SavePromptScreenProps>) {
  const [value, setValue] = useState(defaultPath);

  useInput((_input, key) => {
    if (key.escape) {
      onSubmit("");
    }
  });

  const handleSubmit = (raw: string) => {
    onSubmit(resolveSavePromptValue(raw));
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Save session results to file?
      </Text>
      <Box marginTop={1}>
        <Text color="gray">Path: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      <Box>
        <Text color="gray" dimColor>
          Enter to save · Esc to skip
        </Text>
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
