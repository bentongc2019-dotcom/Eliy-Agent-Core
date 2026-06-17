import type { HacActionReceipt } from "./hac-action-receipt.js";
import type { HumanIntentContract } from "./human-intent-contract.js";
import type { EvidenceItem, OperationalState } from "./operational-state.js";

export type StateTransitionActor = "human" | "agent" | "runtime" | "system";

export type StateTransitionOperation =
  | {
      type: "correct_fact";
      factId: string;
      content: string;
      source: string;
      status?: EvidenceItem["status"];
    }
  | {
      type: "add_assumption";
      assumption: {
        id: string;
        content: string;
        source: string;
        status?: EvidenceItem["status"];
        evidenceRefs?: string[];
      };
    }
  | {
      type: "apply_action_receipt";
      receipt: HacActionReceipt;
      status?: OperationalState["status"];
    }
  | {
      type: "update_status";
      status: OperationalState["status"];
      currentStep?: string;
      stopReason?: string;
    }
  | {
      type: "activate_shared_state";
      source: "preflight" | "runtime" | "human";
      reasons: string[];
      activatedAt: string;
    }
  | {
      type: "update_intent";
      intent: HumanIntentContract;
    };

export type StateTransition = {
  transitionId: string;
  expectedVersion: number;
  actor: StateTransitionActor;
  operation: StateTransitionOperation;
  reason: string;
  evidenceRefs: string[];
  timestamp: string;
};

export type AppliedTransitionRecord = {
  transitionId: string;
  actor: StateTransitionActor;
  operation: StateTransitionOperation["type"];
  reason: string;
  evidenceRefs: string[];
  timestamp: string;
  versionBefore: number;
  versionAfter: number;
};

export type StateTransitionErrorCode =
  | "VERSION_CONFLICT"
  | "FACT_NOT_FOUND"
  | "INTENT_PROTECTED"
  | "EVIDENCE_REQUIRED";

export type StateTransitionResult =
  | {
      ok: true;
      applied: true;
      state: OperationalState;
      transition: AppliedTransitionRecord;
      idempotent?: false;
    }
  | {
      ok: true;
      applied: false;
      idempotent: true;
      state: OperationalState;
      transition: AppliedTransitionRecord;
    }
  | {
      ok: false;
      state: OperationalState;
      error: {
        code: StateTransitionErrorCode;
        message: string;
      };
    };

function cloneState(state: OperationalState): OperationalState {
  return JSON.parse(JSON.stringify(state)) as OperationalState;
}

function sameReceipt(left: HacActionReceipt, right: HacActionReceipt): boolean {
  return left.toolCallId === right.toolCallId && left.toolName === right.toolName;
}

function commit(
  currentState: OperationalState,
  transition: StateTransition,
  nextState: OperationalState
): StateTransitionResult {
  const versionAfter = currentState.version + 1;
  const committed: OperationalState = {
    ...nextState,
    version: versionAfter,
    updatedAt: transition.timestamp
  };
  return {
    ok: true,
    applied: true,
    state: committed,
    transition: {
      transitionId: transition.transitionId,
      actor: transition.actor,
      operation: transition.operation.type,
      reason: transition.reason,
      evidenceRefs: [...transition.evidenceRefs],
      timestamp: transition.timestamp,
      versionBefore: currentState.version,
      versionAfter
    }
  };
}

export function applyStateTransition(
  currentState: OperationalState,
  transition: StateTransition
): StateTransitionResult {
  if (transition.expectedVersion !== currentState.version) {
    return {
      ok: false,
      state: currentState,
      error: {
        code: "VERSION_CONFLICT",
        message: `Expected version ${transition.expectedVersion}, but current version is ${currentState.version}.`
      }
    };
  }

  if (transition.operation.type === "update_intent") {
    return {
      ok: false,
      state: currentState,
      error: {
        code: "INTENT_PROTECTED",
        message: "Confirmed Human Intent cannot be changed through State Transition."
      }
    };
  }

  if (transition.operation.type === "apply_action_receipt" && transition.evidenceRefs.length === 0) {
    return {
      ok: false,
      state: currentState,
      error: {
        code: "EVIDENCE_REQUIRED",
        message: "Action Receipt transitions require evidenceRefs."
      }
    };
  }

  const nextState = cloneState(currentState);

  if (transition.operation.type === "correct_fact") {
    const operation = transition.operation;
    const factIndex = nextState.facts.findIndex((fact) => fact.id === operation.factId);
    if (factIndex < 0) {
      return {
        ok: false,
        state: currentState,
        error: {
          code: "FACT_NOT_FOUND",
          message: `Fact ${operation.factId} was not found.`
        }
      };
    }

    const existing = nextState.facts[factIndex]!;
    nextState.facts[factIndex] = {
      ...existing,
      kind: "fact",
      content: operation.content,
      source: operation.source,
      status: operation.status ?? existing.status,
      evidenceRefs: Array.from(
        new Set([...(existing.evidenceRefs ?? []), ...transition.evidenceRefs, `transition:${transition.transitionId}`])
      )
    };
    return commit(currentState, transition, nextState);
  }

  if (transition.operation.type === "add_assumption") {
    nextState.assumptions = [
      ...nextState.assumptions,
      {
        id: transition.operation.assumption.id,
        kind: "assumption",
        content: transition.operation.assumption.content,
        source: transition.operation.assumption.source,
        status: transition.operation.assumption.status ?? "unverified",
        evidenceRefs: transition.operation.assumption.evidenceRefs ?? transition.evidenceRefs
      }
    ];
    return commit(currentState, transition, nextState);
  }

  if (transition.operation.type === "apply_action_receipt") {
    const operation = transition.operation;
    const alreadyApplied = nextState.actionReceipts.some((receipt) =>
      sameReceipt(receipt, operation.receipt)
    );
    const noOpRecord: AppliedTransitionRecord = {
      transitionId: transition.transitionId,
      actor: transition.actor,
      operation: transition.operation.type,
      reason: transition.reason,
      evidenceRefs: [...transition.evidenceRefs],
      timestamp: transition.timestamp,
      versionBefore: currentState.version,
      versionAfter: currentState.version
    };
    if (alreadyApplied) {
      return {
        ok: true,
        applied: false,
        idempotent: true,
        state: currentState,
        transition: noOpRecord
      };
    }

    nextState.actionReceipts = [...nextState.actionReceipts, operation.receipt];
    if (operation.status) {
      nextState.status = operation.status;
    }
    return commit(currentState, transition, nextState);
  }

  if (transition.operation.type === "activate_shared_state") {
    const noOpRecord: AppliedTransitionRecord = {
      transitionId: transition.transitionId,
      actor: transition.actor,
      operation: transition.operation.type,
      reason: transition.reason,
      evidenceRefs: [...transition.evidenceRefs],
      timestamp: transition.timestamp,
      versionBefore: currentState.version,
      versionAfter: currentState.version
    };
    if (currentState.stateMode === "shared-state") {
      return {
        ok: true,
        applied: false,
        idempotent: true,
        state: currentState,
        transition: noOpRecord
      };
    }

    nextState.stateMode = "shared-state";
    nextState.sharedStateActivation = {
      source: transition.operation.source,
      reasons: Array.from(new Set(transition.operation.reasons)),
      activatedAt: transition.operation.activatedAt
    };
    return commit(currentState, transition, nextState);
  }

  nextState.status = transition.operation.status;
  if (transition.operation.currentStep !== undefined) {
    nextState.currentStep = transition.operation.currentStep;
  }
  if (transition.operation.stopReason !== undefined) {
    nextState.stopReason = transition.operation.stopReason;
  }
  return commit(currentState, transition, nextState);
}
