import React, { useState, useEffect } from "react";
import { render } from "ink";

import { App } from "../components/AppRoot.js";
import type { AppPhase } from "../state/phases.js";
import type { ScopeMode, ConsolidationStrategy } from "../types.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import type { InterruptChoice } from "../components/InterruptConfirmScreen.js";

export interface TuiHandles {
  setPhase: (p: AppPhase) => void;
  unmount: () => void;
  confirmPromise: Promise<boolean>;
  scopePromise: Promise<ScopeMode>;
  strategyPromise: Promise<ConsolidationStrategy>;
  reviewPromise: Promise<{ decisions: Map<number, ReviewDecision>; quit: boolean }>;
  summaryPromise: Promise<boolean>;
  interruptChoicePromise: Promise<InterruptChoice>;
  savePromptPromise: Promise<string>;
}

export function setupTui({
  interruptedRef,
  abortController,
  modelId,
}: {
  interruptedRef: { value: boolean };
  abortController: AbortController;
  modelId: string;
}): TuiHandles {
  let phase: AppPhase = { tag: "fetching-initial" };
  let setPhaseInner: (p: AppPhase) => void = () => {};

  let onConfirm: (proceed: boolean) => void = () => {};
  let onScopeSelect: (mode: ScopeMode) => void = () => {};
  let onStrategySelect: (strategy: ConsolidationStrategy) => void = () => {};
  let onReviewComplete: (d: Map<number, ReviewDecision>) => void = () => {};
  let onReviewQuit: (d: Map<number, ReviewDecision>) => void = () => {};
  let onSummaryConfirm: (apply: boolean) => void = () => {};
  let onSavePromptSubmit: (path: string) => void = () => {};
  let onInterruptChoice: (choice: InterruptChoice) => void = () => {};
  let onAnalysisInterrupt: () => void = () => {};

  let confirmResolve!: (v: boolean) => void;
  const confirmPromise = new Promise<boolean>((r) => {
    confirmResolve = r;
  });

  let scopeResolve!: (v: ScopeMode) => void;
  const scopePromise = new Promise<ScopeMode>((r) => {
    scopeResolve = r;
  });

  let strategyResolve!: (v: ConsolidationStrategy) => void;
  const strategyPromise = new Promise<ConsolidationStrategy>((r) => {
    strategyResolve = r;
  });

  let reviewResolve!: (v: { decisions: Map<number, ReviewDecision>; quit: boolean }) => void;
  const reviewPromise = new Promise<{ decisions: Map<number, ReviewDecision>; quit: boolean }>(
    (r) => {
      reviewResolve = r;
    },
  );

  let summaryResolve!: (v: boolean) => void;
  const summaryPromise = new Promise<boolean>((r) => {
    summaryResolve = r;
  });

  let interruptChoiceResolve!: (v: InterruptChoice) => void;
  const interruptChoicePromise = new Promise<InterruptChoice>((r) => {
    interruptChoiceResolve = r;
  });

  let savePromptResolve!: (v: string) => void;
  const savePromptPromise = new Promise<string>((r) => {
    savePromptResolve = r;
  });

  function ReactiveApp() {
    const [currentPhase, setCurrentPhaseState] = useState<AppPhase>(phase);

    useEffect(() => {
      setPhaseInner = (p) => {
        phase = p;
        setCurrentPhaseState(p);
      };
    }, []);

    onConfirm = (proceed) => confirmResolve(proceed);
    onScopeSelect = (mode) => scopeResolve(mode);
    onStrategySelect = (strategy) => strategyResolve(strategy);
    onReviewComplete = (decisions) => reviewResolve({ decisions, quit: false });
    onReviewQuit = (decisions) => reviewResolve({ decisions, quit: true });
    onSummaryConfirm = (apply) => summaryResolve(apply);
    onInterruptChoice = (choice) => interruptChoiceResolve(choice);
    onAnalysisInterrupt = () => {
      interruptedRef.value = true;
      abortController.abort();
      if (phase.tag === "analyzing") {
        setPhaseInner({ ...phase, stopping: true });
      }
    };
    onSavePromptSubmit = (path) => savePromptResolve(path);

    return (
      <App
        phase={currentPhase}
        modelId={modelId}
        onConfirm={onConfirm}
        onScopeSelect={onScopeSelect}
        onStrategySelect={onStrategySelect}
        onReviewComplete={onReviewComplete}
        onReviewQuit={onReviewQuit}
        onSummaryConfirm={onSummaryConfirm}
        onSavePromptSubmit={onSavePromptSubmit}
        onInterruptChoice={onInterruptChoice}
        onAnalysisInterrupt={onAnalysisInterrupt}
      />
    );
  }

  const { unmount } = render(<ReactiveApp />);

  return {
    setPhase: (p) => setPhaseInner(p),
    unmount,
    confirmPromise,
    scopePromise,
    strategyPromise,
    reviewPromise,
    summaryPromise,
    interruptChoicePromise,
    savePromptPromise,
  };
}
