import type { Repo, ScopeMode, Suggestion, ConsolidationStrategy, PhaseTimings } from "../types.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import type { ReroutedRepo } from "../engine/suggestionEngine.js";
import type { MutationResult } from "../github/mutator.js";

export type AppPhase =
  | { tag: "fetching-initial" }
  | {
      tag: "confirm";
      repoCount: number;
      listCount: number;
      login: string;
      showAnalyticsNotice: boolean;
    }
  | { tag: "pick-scope" }
  | { tag: "pick-strategy"; scopeMode: ScopeMode; hasLists: boolean }
  | { tag: "fetching"; filterLabel?: string }
  | {
      tag: "analyzing";
      analyzed: number;
      total: number;
      filterLabel?: string;
      stopping?: boolean;
      currentRepo?: string;
      startedAt?: number;
    }
  | { tag: "consolidating"; subStep?: string }
  | { tag: "interrupt-confirm"; analyzedCount: number; totalCount: number }
  | { tag: "review"; suggestions: Suggestion[]; mergeWarnings: string[]; repos: Repo[] }
  | {
      tag: "summary";
      suggestions: Suggestion[];
      decisions: Map<number, ReviewDecision>;
      reroutedRepos: ReroutedRepo[];
      strategy: ConsolidationStrategy;
      existingListCount: number;
      scopeMode: ScopeMode;
      phaseTimings: PhaseTimings;
    }
  | { tag: "applying"; results: MutationResult[] }
  | { tag: "done"; results: MutationResult[]; phaseTimings: PhaseTimings }
  | { tag: "info"; message: string }
  | { tag: "error"; message: string }
  | {
      tag: "save-prompt";
      suggestions: Suggestion[];
      decisions: Map<number, ReviewDecision>;
      mutationResults?: MutationResult[];
      saveError?: string;
      phaseTimings: PhaseTimings;
      defaultPath: string;
    };
