import React from "react";
import { Box, Text } from "ink";

const STEPS: { label: string; tags: string[] }[] = [
  { label: "Fetch", tags: ["fetching-initial"] },
  { label: "Setup", tags: ["confirm", "pick-scope", "pick-strategy"] },
  { label: "Analyze", tags: ["fetching", "analyzing"] },
  { label: "Consolidate", tags: ["consolidating"] },
  { label: "Review", tags: ["review", "summary"] },
  { label: "Apply", tags: ["applying"] },
  { label: "Done", tags: ["done"] },
];

interface StepIndicatorProps {
  phaseTag: string;
}

export function StepIndicator({ phaseTag }: StepIndicatorProps) {
  const currentStep = STEPS.findIndex((s) => s.tags.includes(phaseTag));

  return (
    <Box flexDirection="row" alignItems="center">
      {STEPS.map((step, i) => {
        const isDone = currentStep >= 0 && i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <Box key={i} flexDirection="row" alignItems="center">
            <Text bold={isCurrent} color={isDone ? "green" : isCurrent ? "cyan" : "gray"}>
              {isDone ? `✓ ${step.label}` : `${i + 1} ${step.label}`}
            </Text>
            {i < STEPS.length - 1 && <Text color="gray"> › </Text>}
          </Box>
        );
      })}
    </Box>
  );
}
