import {
  decideSharedStateActivation,
  type HacStateMode,
  type SharedStateActivationDecision,
  type SharedStateActivationSignals
} from "./hac-shared-state-activation-policy.js";
import { type OperationalState } from "./operational-state.js";
import {
  applyStateTransition,
  type StateTransitionResult
} from "./state-transition.js";

export type SharedStateActivationSource = "preflight" | "runtime" | "human";

export type SharedStateActivationRequest = {
  source: SharedStateActivationSource;
  reasons: string[];
  timestamp: string;
};

export type StateModeControllerResult = {
  mode: HacStateMode;
  state: OperationalState;
  decision: SharedStateActivationDecision;
  transition?: StateTransitionResult;
  usedCandidateBSnapshot: boolean;
  usedWorkspaceProjection: boolean;
};

export type RuntimeActivationEvent =
  | "authoritative_fact_corrected"
  | "stale_update_detected"
  | "receipt_replay_detected"
  | "state_conflict_detected";

function dedupeReasons(reasons: string[]): string[] {
  return Array.from(new Set(reasons));
}

export function applySharedStateActivation(
  state: OperationalState,
  request: SharedStateActivationRequest
): StateTransitionResult {
  return applyStateTransition(state, {
    transitionId: `activate-shared-state-${request.source}-${request.timestamp}`,
    expectedVersion: state.version,
    actor: "system",
    operation: {
      type: "activate_shared_state",
      source: request.source,
      reasons: dedupeReasons(request.reasons),
      activatedAt: request.timestamp
    },
    reason: `Activate shared-state mode from ${request.source}.`,
    evidenceRefs: [`activation:${request.source}`],
    timestamp: request.timestamp
  });
}

function sourceForDecision(decision: SharedStateActivationDecision): SharedStateActivationSource | undefined {
  if (decision.source === "human") {
    return "human";
  }
  if (decision.source === "preflight") {
    return "preflight";
  }
  if (decision.source === "runtime") {
    return "runtime";
  }
  return undefined;
}

export function runActivationPreflight(
  state: OperationalState,
  signals: Omit<SharedStateActivationSignals, "currentMode">,
  timestamp = new Date().toISOString()
): StateModeControllerResult {
  const decision = decideSharedStateActivation({
    ...signals,
    currentMode: state.stateMode
  });

  if (decision.mode !== "shared-state" || state.stateMode === "shared-state") {
    return {
      mode: state.stateMode,
      state,
      decision,
      usedCandidateBSnapshot: false,
      usedWorkspaceProjection: false
    };
  }

  const source = sourceForDecision(decision);
  if (!source) {
    return {
      mode: state.stateMode,
      state,
      decision,
      usedCandidateBSnapshot: false,
      usedWorkspaceProjection: false
    };
  }

  const transition = applySharedStateActivation(state, {
    source,
    reasons: decision.reasons,
    timestamp
  });
  return {
    mode: transition.ok ? transition.state.stateMode : state.stateMode,
    state: transition.ok ? transition.state : state,
    decision,
    transition,
    usedCandidateBSnapshot: false,
    usedWorkspaceProjection: false
  };
}

function signalsForRuntimeEvent(event: RuntimeActivationEvent): Omit<SharedStateActivationSignals, "currentMode"> {
  if (event === "authoritative_fact_corrected") {
    return { authoritativeFactCorrected: true };
  }
  if (event === "stale_update_detected") {
    return { staleUpdateDetected: true };
  }
  if (event === "receipt_replay_detected") {
    return { receiptReplayDetected: true };
  }
  return { stateConflictDetected: true };
}

export function applyRuntimeActivationEvent(
  state: OperationalState,
  event: RuntimeActivationEvent,
  timestamp = new Date().toISOString()
): StateModeControllerResult {
  const decision = decideSharedStateActivation({
    ...signalsForRuntimeEvent(event),
    currentMode: state.stateMode
  });

  if (decision.mode !== "shared-state" || state.stateMode === "shared-state") {
    return {
      mode: state.stateMode,
      state,
      decision,
      usedCandidateBSnapshot: false,
      usedWorkspaceProjection: false
    };
  }

  const transition = applySharedStateActivation(state, {
    source: "runtime",
    reasons: decision.reasons,
    timestamp
  });
  return {
    mode: transition.ok ? transition.state.stateMode : state.stateMode,
    state: transition.ok ? transition.state : state,
    decision,
    transition,
    usedCandidateBSnapshot: false,
    usedWorkspaceProjection: false
  };
}
