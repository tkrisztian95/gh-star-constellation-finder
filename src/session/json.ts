import type { Suggestion } from "../types.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import type { MutationResult } from "../github/mutator.js";

export interface SessionDecision {
  suggestionIndex: number;
  decision: ReviewDecision;
}

export interface SessionJsonInput {
  runId: string;
  summary: Record<string, unknown>;
  suggestions: Suggestion[];
  errors: { repo: string; owner: string }[];
  decisions?: SessionDecision[];
  mutationResults?: MutationResult[];
}

export function buildSessionJson(input: SessionJsonInput): string {
  const { runId, summary, suggestions, errors, decisions, mutationResults } = input;
  const obj: Record<string, unknown> = { runId, summary, suggestions, errors };
  if (decisions !== undefined) obj.decisions = decisions;
  if (mutationResults !== undefined) obj.mutationResults = mutationResults;
  return JSON.stringify(obj, null, 2) + "\n";
}
