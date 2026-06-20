export type LoopBounds = {
  maxIterations: number;
  maxModelCalls: number;
  maxElapsedMs: number;
  noProgressLimit: number;
};

export type LoopBoundsState = {
  startedAt: string;
  modelCalls: number;
  noProgressCount: number;
  lastProgressSignature?: string;
  limits: LoopBounds;
};

export const DEFAULT_LOOP_BOUNDS: LoopBounds = {
  maxIterations: 8,
  maxModelCalls: 8,
  maxElapsedMs: 120_000,
  noProgressLimit: 2
};

export function createLoopBoundsState(now: string, limits: LoopBounds = DEFAULT_LOOP_BOUNDS): LoopBoundsState {
  return {
    startedAt: now,
    modelCalls: 0,
    noProgressCount: 0,
    limits
  };
}

export function buildProgressSignature(args: {
  factsCount: number;
  assumptionsCount: number;
  humanDecisionsCount: number;
  actionReceiptsCount: number;
  openQuestions: string[];
  nextAction?: string;
}): string {
  return JSON.stringify({
    factsCount: args.factsCount,
    assumptionsCount: args.assumptionsCount,
    humanDecisionsCount: args.humanDecisionsCount,
    actionReceiptsCount: args.actionReceiptsCount,
    openQuestions: args.openQuestions,
    nextAction: args.nextAction
  });
}

export function advanceLoopBounds(state: LoopBoundsState, progressSignature: string): LoopBoundsState {
  const noProgressCount =
    state.lastProgressSignature === progressSignature ? state.noProgressCount + 1 : 0;
  return {
    ...state,
    noProgressCount,
    lastProgressSignature: progressSignature
  };
}

export function exceededLoopBounds(args: {
  iteration: number;
  nowMs: number;
  bounds: LoopBoundsState;
}): "max_iterations" | "max_model_calls" | "max_elapsed_ms" | "no_progress" | undefined {
  if (args.iteration >= args.bounds.limits.maxIterations) {
    return "max_iterations";
  }
  if (args.bounds.modelCalls >= args.bounds.limits.maxModelCalls) {
    return "max_model_calls";
  }
  if (args.nowMs - Date.parse(args.bounds.startedAt) >= args.bounds.limits.maxElapsedMs) {
    return "max_elapsed_ms";
  }
  if (args.bounds.noProgressCount >= args.bounds.limits.noProgressLimit) {
    return "no_progress";
  }
  return undefined;
}
