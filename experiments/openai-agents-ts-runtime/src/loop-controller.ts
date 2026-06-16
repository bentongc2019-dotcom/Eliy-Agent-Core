import { createHacActionReceipt } from "./hac-action-receipt.js";
import { decideHacAction } from "./hac-decision-model.js";
import { createInitialComplaintIntent, type HumanIntentContract } from "./human-intent-contract.js";
import { DEFAULT_LOOP_BOUNDS, advanceLoopBounds, buildProgressSignature, createLoopBoundsState, exceededLoopBounds } from "./loop-bounds.js";
import type { GovernorResult } from "./hac-governor.js";
import { evaluateHacGovernor } from "./hac-governor.js";
import { verifyMinimumLoopOutcome } from "./independent-verifier.js";
import type { EvidenceItem, HumanDecision, LoopActionProposal, OperationalState } from "./operational-state.js";
import { addActionReceipt, addEvidence, addHumanDecision } from "./operational-state.js";
import { getToolExecutionCount, prepareRefundTool, resetToolExecutions } from "./tool.js";
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

export function createInitialOperationalState(loopId: string, now = nowIso()): OperationalState {
  const intent = createInitialComplaintIntent();
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
        content: "Human confirmed initial complaint handling goal and boundaries.",
        timestamp: now,
        explicit: true
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

export function readComplaintMaterials(state: OperationalState): OperationalState {
  const items: EvidenceItem[] = [
    {
      id: "fact-complaint-delayed-delivery",
      kind: "fact",
      content: "客户投诉内容确认存在交付延误。",
      source: "customer_complaint_material",
      status: "confirmed"
    },
    {
      id: "fact-delivery-responsibility",
      kind: "fact",
      content: "商家需要在回应中明确承认交付延误责任。",
      source: "human_intent_contract",
      status: "confirmed"
    },
    {
      id: "inference-relationship-risk",
      kind: "inference",
      content: "如果回应回避责任，客户关系修复概率会下降。",
      source: "loop_reasoning",
      status: "unverified"
    },
    {
      id: "assumption-delay-duration-unknown",
      kind: "assumption",
      content: "交付延误天数尚未确认，补偿力度可能受影响。",
      source: "missing_complaint_detail",
      status: "unverified"
    }
  ];

  const next = items.reduce((current, item) => addEvidence(current, item), state);
  return {
    ...next,
    openQuestions: ["delivery_delay_days"],
    currentStep: "complaint_materials_read"
  };
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

  if (!state.facts.some((item) => item.id === "fact-complaint-delayed-delivery")) {
    return {
      kind: "reason",
      purpose: "读取客户投诉资料并区分事实、推断和假设。",
      expectedEvidence: ["fact:complaint", "inference:relationship-risk", "assumption:missing-delay-duration"],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false
    };
  }

  if (state.openQuestions.includes("delivery_delay_days")) {
    return {
      kind: "ask_human",
      purpose: "确认交付延误天数，避免在关键信息不足时决定补偿力度。",
      expectedEvidence: ["human_input:delivery_delay_days"],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false,
      proactiveReason: "延误天数会影响补偿方案强度；继续形成最终方案会让假设替代事实。"
    };
  }

  const compensationDecision = state.humanDecisions.find(
    (decision) => decision.kind === "compensation_selected"
  );
  if (!compensationDecision) {
    return {
      kind: "ask_human",
      purpose:
        state.intent.interactionPreference === "guided"
          ? "提出退款、优惠券、解释与改善承诺等候选方案，并说明成本、客户关系影响和关键假设差异。"
          : "提出两个以上补偿候选方案，等待人选择。",
      expectedEvidence: ["human_decision:compensation_selected"],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: true,
      outsideDelegatedScope: false,
      proactiveReason: "补偿选择属于 Human Intent Contract 中的 nonDelegableJudgment。"
    };
  }

  if (compensationDecision.content.includes("只提供解释与改善承诺")) {
    return {
      kind: "complete",
      purpose: "准备不含退款的解释与改善承诺回应。",
      expectedEvidence: ["fact:response-draft", "verification:success-criteria"],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false
    };
  }

  if (!state.actionReceipts.some((receipt) => receipt.toolName === "prepare_refund")) {
    return {
      kind: "invoke_tool",
      purpose: "根据人类选择的退款方案准备退款。",
      expectedEvidence: ["action_receipt:prepare_refund"],
      mayChangeGoal: false,
      mayChangeSuccessCriteria: false,
      touchesNonDelegableJudgment: false,
      outsideDelegatedScope: false
    };
  }

  return {
    kind: "complete",
    purpose: "对照成功标准完成独立验证，并将结果交还给人。",
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

export function provideDelayDays(state: OperationalState, days: number): OperationalState {
  const decision: HumanDecision = {
    id: "decision-delay-days",
    kind: "information_provided",
    content: `用户确认交付延误 ${days} 天。`,
    timestamp: nowIso(),
    explicit: true
  };
  return addEvidence(
    {
      ...addHumanDecision(state, decision),
      status: "running",
      openQuestions: state.openQuestions.filter((question) => question !== "delivery_delay_days")
    },
    {
      id: "fact-delay-days",
      kind: "fact",
      content: `交付延误 ${days} 天。`,
      source: "human_input",
      status: "confirmed"
    }
  );
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
      content: `用户明确将互动偏好调整为 ${intent.interactionPreference}。`,
      timestamp: nowIso(),
      explicit: true
    }
  );
}

export function selectCompensation(state: OperationalState, content: string): OperationalState {
  return addHumanDecision(
    { ...state, status: "running" },
    {
      id: `decision-compensation-${state.humanDecisions.length + 1}`,
      kind: "compensation_selected",
      content,
      timestamp: nowIso(),
      explicit: true
    }
  );
}

export async function authorizeRefundPath(state: OperationalState, approve: boolean): Promise<{
  state: OperationalState;
  beforeApprovalCount: number;
  afterDecisionCount: number;
  receiptMessage: string;
}> {
  await resetToolExecutions();
  const facts = {
    actionId: "loop-prepare-refund",
    actionType: "prepare_refund",
    hasExternalSideEffect: true,
    requiresHumanValueJudgment: false,
    prohibited: false
  };
  const decision = decideHacAction(facts);
  if (decision.mode !== "AUTHORIZE") {
    throw new Error("prepare_refund must be AUTHORIZE.");
  }
  const approvalRequired = await prepareRefundTool.needsApproval(
    {} as never,
    { amount: 12.34, reason: "delayed delivery" },
    facts.actionId
  );
  if (!approvalRequired) {
    throw new Error("prepare_refund must require approval before execution.");
  }
  const beforeApprovalCount = await getToolExecutionCount();

  if (!approve) {
    const receipt = createHacActionReceipt({
      toolCallId: facts.actionId,
      toolName: "prepare_refund",
      humanDecision: "rejected",
      runtimeOutcome: { status: "not_executed" }
    });
    return {
      state: addActionReceipt(addHumanDecision(state, {
        id: "decision-refund-rejected",
        kind: "refund_rejected",
        content: "用户拒绝退款行动。",
        timestamp: nowIso(),
        explicit: true
      }), receipt),
      beforeApprovalCount,
      afterDecisionCount: await getToolExecutionCount(),
      receiptMessage: receipt.authoritativeMessage
    };
  }

  const result = await prepareRefundTool.invoke(
    {} as never,
    JSON.stringify({ amount: 12.34, reason: "delayed delivery" }),
    {
      toolCall: {
        type: "function_call",
        callId: facts.actionId,
        name: "prepare_refund",
        arguments: JSON.stringify({ amount: 12.34, reason: "delayed delivery" })
      } as never,
      resumeState: "minimum-loop-approved-runstate"
    }
  );
  const resultMessage =
    typeof result === "string"
      ? result
      : typeof result === "object" && result !== null && "message" in result
        ? String((result as { message: unknown }).message)
        : JSON.stringify(result);
  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: "prepare_refund",
    humanDecision: "approved",
    runtimeOutcome: { status: "succeeded", resultMessage }
  });
  const withReceipt = addActionReceipt(addHumanDecision(state, {
    id: "decision-refund-approved",
    kind: "refund_approved",
    content: "用户明确批准退款准备行动。",
    timestamp: nowIso(),
    explicit: true
  }), receipt);
  return {
    state: withReceipt,
    beforeApprovalCount,
    afterDecisionCount: await getToolExecutionCount(),
    receiptMessage: receipt.authoritativeMessage
  };
}

export function addResponseDraftEvidence(state: OperationalState, content: string): OperationalState {
  return addEvidence(state, {
    id: `fact-response-draft-${state.facts.length + 1}`,
    kind: "fact",
    content: `可执行回应：${content}`,
    source: "loop_output",
    status: "confirmed"
  });
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
