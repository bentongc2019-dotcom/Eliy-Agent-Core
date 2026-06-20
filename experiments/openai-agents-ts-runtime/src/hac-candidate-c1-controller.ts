import {
  decideReflectiveTrigger,
  type ReflectiveTriggerDecision,
  type ReflectiveTriggerSignals
} from "./hac-reflective-trigger-policy.js";
import { applySharedStateActivation } from "./hac-state-mode-controller.js";
import type { OperationalState } from "./operational-state.js";
import type { ReframeProposal } from "./reframe-proposal.js";
import {
  applyStateTransition,
  type StateTransitionResult
} from "./state-transition.js";

export type C1ControllerResult = {
  trigger: ReflectiveTriggerDecision;
  state: OperationalState;
  activationTransition?: StateTransitionResult;
  proposalTransition?: StateTransitionResult;
};

export function createAssumptionReframeProposal(args: {
  state: OperationalState;
  proposalId: string;
  triggerReasons: string[];
  evidenceRefs: string[];
  currentFrame: string;
  proposedFrame: string;
  rationale: string;
  expectedSystemEffect: string;
  risks: string[];
  falsificationCheck: string;
}): ReframeProposal {
  return {
    proposalId: args.proposalId,
    basedOnStateVersion: args.state.version,
    triggerReasons: Array.from(new Set(args.triggerReasons)),
    evidenceRefs: Array.from(new Set(args.evidenceRefs)),
    target: "assumption",
    currentFrame: args.currentFrame,
    proposedFrame: args.proposedFrame,
    rationale: args.rationale,
    expectedSystemEffect: args.expectedSystemEffect,
    risks: [...args.risks],
    falsificationCheck: args.falsificationCheck,
    requiresHumanConfirmation: true
  };
}

export function evaluateAndProposeAssumptionReframe(args: {
  state: OperationalState;
  signals: ReflectiveTriggerSignals;
  evidenceRefs: string[];
  proposal: ReframeProposal;
  timestamp: string;
}): C1ControllerResult {
  const trigger = decideReflectiveTrigger({
    signals: args.signals,
    evidenceRefs: args.evidenceRefs
  });

  if (!trigger.triggered) {
    return {
      trigger,
      state: args.state
    };
  }

  let state = args.state;
  let activationTransition: StateTransitionResult | undefined;
  if (state.stateMode !== "shared-state") {
    activationTransition = applySharedStateActivation(state, {
      source: args.signals.explicitHumanRequest ? "human" : "runtime",
      reasons: trigger.reasons,
      timestamp: args.timestamp
    });
    if (!activationTransition.ok) {
      return {
        trigger,
        state,
        activationTransition
      };
    }
    state = activationTransition.state;
  }

  const proposal: ReframeProposal = {
    ...args.proposal,
    basedOnStateVersion: state.version,
    triggerReasons: trigger.reasons,
    evidenceRefs: trigger.evidenceRefs
  };
  const proposalTransition = applyStateTransition(state, {
    transitionId: `propose-reframe-${proposal.proposalId}`,
    expectedVersion: state.version,
    actor: "system",
    operation: {
      type: "propose_reframe",
      proposal
    },
    reason: "Create human-confirmed assumption reframe proposal.",
    evidenceRefs: trigger.evidenceRefs,
    timestamp: args.timestamp
  });

  return {
    trigger,
    state: proposalTransition.ok ? proposalTransition.state : state,
    activationTransition,
    proposalTransition
  };
}

function submitReframeDecision(args: {
  state: OperationalState;
  proposalId: string;
  timestamp: string;
  operation: "confirm_reframe" | "reject_reframe" | "defer_reframe";
}): StateTransitionResult {
  const proposal = args.state.pendingReframeProposal;
  return applyStateTransition(args.state, {
    transitionId: `${args.operation}-${args.proposalId}`,
    expectedVersion: args.state.version,
    actor: "human",
    operation: {
      type: args.operation,
      proposalId: args.proposalId
    },
    reason: `Human submitted ${args.operation} for reframe proposal.`,
    evidenceRefs: proposal?.evidenceRefs ?? [`reframe:${args.proposalId}`],
    timestamp: args.timestamp
  });
}

export function confirmReframeProposal(args: {
  state: OperationalState;
  proposalId: string;
  timestamp: string;
}): StateTransitionResult {
  return submitReframeDecision({
    ...args,
    operation: "confirm_reframe"
  });
}

export function rejectReframeProposal(args: {
  state: OperationalState;
  proposalId: string;
  timestamp: string;
}): StateTransitionResult {
  return submitReframeDecision({
    ...args,
    operation: "reject_reframe"
  });
}

export function deferReframeProposal(args: {
  state: OperationalState;
  proposalId: string;
  timestamp: string;
}): StateTransitionResult {
  return submitReframeDecision({
    ...args,
    operation: "defer_reframe"
  });
}
