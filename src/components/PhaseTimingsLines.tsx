import React from "react";
import { Box, Text } from "ink";
import type { PhaseTimings } from "../types.js";
import { formatDuration } from "../util/duration.js";

interface PhaseLabel {
  key: keyof PhaseTimings;
  label: string;
}

const PHASE_ORDER: PhaseLabel[] = [
  { key: "fetchStarsListsMs", label: "Fetch" },
  { key: "fetchReadmesMs", label: "READMEs" },
  { key: "analysisMs", label: "Analysis" },
  { key: "consolidationMs", label: "Consolidate" },
  { key: "suggestionsMs", label: "Suggest" },
  { key: "applyMs", label: "Apply" },
];

interface Props {
  phaseTimings: PhaseTimings;
  showTotal?: boolean;
}

export function PhaseTimingsLines({ phaseTimings, showTotal = true }: Props) {
  const parts = PHASE_ORDER.filter((p) => typeof phaseTimings[p.key] === "number").map(
    (p) => `${p.label} ${formatDuration(phaseTimings[p.key] as number)}`,
  );
  if (parts.length === 0) return null;
  const analysisMs = phaseTimings.analysisMs;
  return (
    <Box flexDirection="column" marginTop={1}>
      {showTotal && typeof analysisMs === "number" && (
        <Text color="gray">Analysis took {formatDuration(analysisMs)}</Text>
      )}
      <Text color="gray" dimColor>
        {parts.join(" · ")}
      </Text>
    </Box>
  );
}
