import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

interface LoadingScreenProps {
  analyzed: number;
  total: number;
  phase: "fetching" | "analyzing";
  filterLabel?: string;
  stopping?: boolean;
  currentRepo?: string;
  onInterrupt?: () => void;
}

export function LoadingScreen({
  analyzed,
  total,
  phase,
  filterLabel,
  stopping,
  currentRepo,
  onInterrupt,
}: LoadingScreenProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useInput((_, key) => {
    if (key.escape && phase === "analyzing" && onInterrupt) {
      onInterrupt();
    }
  });

  const spinner = SPINNER_FRAMES[frame];

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      {filterLabel && (
        <Text color="yellow" dimColor>
          {" "}
          Filter: {filterLabel}
        </Text>
      )}
      {phase === "fetching" ? (
        <Text>
          <Text color="yellow">{spinner} </Text>
          <Text>
            {total === 0
              ? "Fetching starred repositories and lists..."
              : "Fetching starred repositories..."}
          </Text>
        </Text>
      ) : stopping ? (
        <Text>
          <Text color="yellow">{spinner} </Text>
          <Text>Stopping analysis, waiting for in-flight requests to complete…</Text>
        </Text>
      ) : (
        <Box flexDirection="column" gap={0}>
          <Text>
            <Text color="cyan">{spinner} </Text>
            {analyzed === 0 ? (
              <Text>Analyzing repositories...</Text>
            ) : (
              <Text>
                {"Analyzing "}
                <Text bold color="white">
                  {analyzed}
                </Text>
                {" / "}
                <Text bold color="white">
                  {total}
                </Text>
                {" repositories..."}
              </Text>
            )}
          </Text>
          {currentRepo && (
            <Text color="gray" dimColor>
              {"  "}
              {currentRepo}
            </Text>
          )}
        </Box>
      )}
      {phase === "analyzing" && (
        <Box>
          <Text color="gray"> </Text>
          <Text color="white" bold inverse>
            {" ESC "}
          </Text>
          <Text color="gray"> to interrupt and continue with analyzed repos</Text>
        </Box>
      )}
    </Box>
  );
}
