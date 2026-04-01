import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

interface ConsolidatingScreenProps {
  subStep?: string;
}

export function ConsolidatingScreen({ subStep }: ConsolidatingScreenProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text>
        <Text color="cyan">{SPINNER_FRAMES[frame]} </Text>
        <Text>{subStep ?? "Consolidating categories…"}</Text>
      </Text>
    </Box>
  );
}
