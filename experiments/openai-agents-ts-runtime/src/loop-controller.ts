import type { HumanIntentContract } from "./human-intent-contract.js";
import { DEFAULT_LOOP_BOUNDS, advanceLoopBounds, buildProgressSignature, createLoopBoundsState, exceededLoopBounds } from "./loop-bounds.js";
import type { GovernorResult } from "./hac-governor.js";
import { evaluateHacGovernor } from "./hac-governor.js";
import { verifyMinimumLoopOutcome } from "./independent-verifier.js";
import type { HumanDecision, LoopActionProposal, OperationalState } from "./operational-state.js";
import { addHumanDecision } from "./operational-state.js";
import { nowIso } from "./storage.js";

export type LoopEventName =
  | "intent_confirmed"
  | "operational_state_saved"
  | "operational_state_restored"
  | "loop_iteration_started"
  | "next_action_proposed"
  | "hac_governor_intervened"
  | "human_input_requested"
  | "human_decision_recorded"
  | "tool_authorization_requested"
  | "action_receipt_created"
  | "verification_completed"
  | "loop_completed"
  | "loop_stopped";

export type LoopEvent = {
  timestamp: string;
  loopId: string;
  iteration: number;
  type: LoopEventName;
  detail: string;
};

export type LoopStepResult = {
  state: OperationalState;
  proposal: LoopActionProposal;
  governor: GovernorResult;
  events: LoopEvent[];
};

function createGenericIntent(): HumanIntentContract {
  return {
    version: 1,
    goal: "Complete the confirmed task within the delegated scope.",
    successCriteria: ["Confirmed task outcome has verifiable evidence"],
    delegatedScope: ["Organize evidence", "Identify missing information", "Propose the next candidate action"],
    nonDelegableJudgments: ["Any judgment explicitly reserved by the human"],
    stopConditions: ["Human pauses or takes over", "Loop bounds are reached", "Required evidence is unavailable"],
    interactionPreference: "concise",
    confirmedByHuman: true
  };
}

export function createInitialOperationalState(
  loopId: string,
  now = nowIso(),
  intent: HumanIntentContract = createGenericIntent()
): OperationalState {
  return {
    loopId,
    intent,
    iteration: 0,
    status: "running",
    facts: [],
    assumptions: [],
    openQuestions: [],
    humanDecisions: [
      {
        id: "decision-intent-confirmed",
        kind: "intent_confirmed",
        content: "Human confirmed the initial goal, success criteria, delegated scope, and non-delegable judgments.",
        timestamp: now,
        explicit: true,
        evidenceRefs: ["intent:confirmed"]
      }
    ],
    actionReceipts: [],
    currentStep: "intent_confirmed",
    bounds: createLoopBoundsState(now, DEFAULT_LOOP_BOUNDS)
  };
}

export function event(state: OperationalState, type: LoopEventName, detail: string): LoopEvent {
  return {
    timestamp: nowIso(),
    loopId: state.loopId,
    iteration: state.iteration,
    type,
    detail
  };
}

function unresolvedHumanJudgment(state: OperationalState): string | undefined {
  const hasExplicitJudgment = state.humanDecisions.some(
    (decision) => decision.kind === "judgment_made" && decision.explicit
  );
  return hasExplicitJudgment ? undefined : state.intent.nonDelegableJudgments[0];
}

function pendingAuthorizedAction(state: OperationalState): HumanDecision | undefined {
  return state.humanDecisions.find((decision) => {
    if (decision.kind !== "judgment_made" || !decision.actionIntent?.requiresAuthorization) {
      return false;
    }
    const actionType = decision.actionIntent.externalActionType;
    if (!actionType) {
      return false;
    }
    return !state.actionReceipts.some((receipt) => receipt.toolName === actionType);
  });
}

export function proposeNextAction(state: OperationalState): LoopActionProposal {
  if (state.status === "completed" || state.status === "stopped") {
    return {
      kind: "complete",
      purpose: "Loop is already terminal.",
      expectedEvidence: [],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false
    };
  }

  if (state.facts.length === 0) {
    return {
      kind: "reason",
      purpose: `Inspect the current task materials and separate facts, inferences, assumptions, and missing evidence: ${state.intent.goal}`,
      expectedEvidence: ["evidence:task-materials", "evidence:missing-critical-detail"],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false
    };
  }

  if (state.openQuestions.length > 0) {
    const question = state.openQuestions[0] ?? "critical_missing_fact";
    return {
      kind: "ask_human",
      purpose: "Resolve the current blocking open question before continuing.",
      expectedEvidence: [`human_input:${question}`],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false,
      proactiveReason:
        "The current open question is marked as required evidence for the next decision; continuing would let an assumption stand in for a confirmed fact."
    };
  }

  const pendingAction = pendingAuthorizedAction(state);
  if (pendingAction?.actionIntent?.externalActionType) {
    return {
      kind: "invoke_tool",
      purpose: "Execute the authorized external action candidate through the existing action control path.",
      expectedEvidence: [`action_receipt:${pendingAction.actionIntent.externalActionType}`],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false
    };
  }

  const missingJudgment = unresolvedHumanJudgment(state);
  if (missingJudgment) {
    return {
      kind: "ask_human",
      purpose:
        state.intent.interactionPreference === "guided"
          ? "Present options, tradeoffs, key assumptions, and expected consequences for the reserved human judgment."
          : "Present options for the reserved human judgment and wait for the human decision.",
      expectedEvidence: [`judgment:${missingJudgment}`],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: true,
      outsideDelegatedScope: false,
      proactiveReason: "The next step touches a non-delegable judgment in the confirmed Human Intent Contract."
    };
  }

  return {
    kind: "complete",
    purpose: "Run independent verification against the confirmed success criteria and return the result to the human.",
    expectedEvidence: ["verification:success-criteria"],
    mayChangeGoal: false,
    mayChangeSuccessCriteria: false,
    touchesNonDelegableJudgment: false,
    outsideDelegatedScope: false
  };
}

export function advanceLoop(state: OperationalState): LoopStepResult {
  const proposal = proposeNextAction(state);
  const governor = evaluateHacGovernor(state, proposal);
  const started = event(state, "loop_iteration_started", `Iteration ${state.iteration + 1}`);
  const proposed = event(state, "next_action_proposed", `${proposal.kind}: ${proposal.purpose}`);

  let nextState: OperationalState = {
    ...state,
    iteration: state.iteration + 1,
    nextCandidateAction: proposal
  };

  const progressSignature = buildProgressSignature({
    factsCount: nextState.facts.length,
    assumptionsCount: nextState.assumptions.length,
    humanDecisionsCount: nextState.humanDecisions.length,
    actionReceiptsCount: nextState.actionReceipts.length,
    openQuestions: nextState.openQuestions,
    nextAction: `${proposal.kind}:${proposal.purpose}`
  });
  nextState = {
    ...nextState,
    bounds: advanceLoopBounds(nextState.bounds, progressSignature)
  };

  const exceeded = exceededLoopBounds({
    iteration: nextState.iteration,
    nowMs: Date.now(),
    bounds: nextState.bounds
  });
  if (exceeded) {
    return {
      state: { ...nextState, status: "stopped", stopReason: exceeded },
      proposal,
      governor: { outcome: "stop", reasonCode: exceeded },
      events: [started, proposed, event(nextState, "loop_stopped", exceeded)]
    };
  }

  if (governor.outcome === "stop") {
    return {
      state: { ...nextState, status: "stopped", stopReason: governor.reasonCode },
      proposal,
      governor,
      events: [started, proposed, event(nextState, "loop_stopped", governor.reasonCode)]
    };
  }

  if (governor.outcome === "ask_human" || proposal.kind === "ask_human") {
    return {
      state: { ...nextState, status: "waiting_human" },
      proposal,
      governor,
      events: [
        started,
        proposed,
        event(nextState, "hac_governor_intervened", governor.outcome === "ask_human" ? governor.reasonCode : "proposal_requested_human"),
        event(nextState, "human_input_requested", proposal.proactiveReason ?? proposal.purpose)
      ]
    };
  }

  return {
    state: nextState,
    proposal,
    governor,
    events: [started, proposed]
  };
}

export function applyConfirmedIntentPreference(
  state: OperationalState,
  intent: HumanIntentContract
): OperationalState {
  return addHumanDecision(
    { ...state, intent },
    {
      id: "decision-preference-guided",
      kind: "preference_changed",
      content: `Human explicitly changed interaction preference to ${intent.interactionPreference}.`,
      timestamp: nowIso(),
      explicit: true,
      evidenceRefs: ["intent:preference_changed"]
    }
  );
}

export function completeWithVerification(state: OperationalState): OperationalState {
  const verification = verifyMinimumLoopOutcome(state);
  return {
    ...state,
    lastVerification: verification,
    status: verification.passed ? "completed" : "waiting_human",
    currentStep: "independent_verification"
  };
}
