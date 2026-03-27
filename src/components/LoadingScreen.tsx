import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

interface LoadingScreenProps {
  analyzed: number;
  total: number;
  phase: "fetching" | "analyzing";
  filterLabel?: string;
}

export function LoadingScreen({ analyzed, total, phase, filterLabel }: LoadingScreenProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const spinner = SPINNER_FRAMES[frame];

  return (
    <Box flexDirection="column" padding={1}>
      {phase === "fetching" ? (
        <Text>
          <Text color="yellow">{spinner} </Text>
          <Text>Fetching starred repositories...</Text>
        </Text>
      ) : (
        <Text>
          <Text color="cyan">{spinner} </Text>
          <Text>
            Analyzing{" "}
            <Text bold color="white">
              {analyzed}
            </Text>
            {" / "}
            <Text bold color="white">
              {total}
            </Text>
            {" repositories..."}
          </Text>
        </Text>
      )}
      {filterLabel && (
        <Text color="yellow" dimColor>
          {" "}
          Filter: {filterLabel}
        </Text>
      )}
    </Box>
  );
}
