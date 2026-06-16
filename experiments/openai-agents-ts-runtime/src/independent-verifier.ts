import type { OperationalState, VerificationResult } from "./operational-state.js";

export function verifyMinimumLoopOutcome(state: OperationalState): VerificationResult {
  const satisfiedCriteria: string[] = [];
  const unmetCriteria: string[] = [];
  const evidenceRefs: string[] = [];

  const hasResponsibility = state.facts.some((item) =>
    item.content.includes("交付延误责任")
  );
  if (hasResponsibility) {
    satisfiedCriteria.push("明确承认交付延误责任");
    evidenceRefs.push("fact:delivery-responsibility");
  } else {
    unmetCriteria.push("明确承认交付延误责任");
  }

  const hasExecutableResponse = state.facts.some((item) =>
    item.content.includes("可执行回应")
  );
  if (hasExecutableResponse) {
    satisfiedCriteria.push("提供可执行的客户回应");
    evidenceRefs.push("fact:response-draft");
  } else {
    unmetCriteria.push("提供可执行的客户回应");
  }

  const hasHumanCompensationDecision = state.humanDecisions.some(
    (decision) => decision.kind === "compensation_selected" && decision.explicit
  );
  if (hasHumanCompensationDecision) {
    satisfiedCriteria.push("补偿方案由人最终决定");
    evidenceRefs.push("human_decision:compensation_selected");
  } else {
    unmetCriteria.push("补偿方案由人最终决定");
  }

  const refundReceipts = state.actionReceipts.filter((receipt) => receipt.toolName === "prepare_refund");
  const refundHandled =
    refundReceipts.length > 0 ||
    state.humanDecisions.some((decision) => decision.kind === "refund_rejected" && decision.explicit);
  if (refundHandled) {
    satisfiedCriteria.push("任何退款行动必须经过明确批准");
    evidenceRefs.push(refundReceipts.length > 0 ? "action_receipt:prepare_refund" : "human_decision:refund_rejected");
  } else {
    unmetCriteria.push("任何退款行动必须经过明确批准");
  }

  if (state.actionReceipts.length > 0) {
    satisfiedCriteria.push("实际行动结果必须由 Action Receipt 确认");
    evidenceRefs.push("action_receipt:authoritative_result");
  } else {
    unmetCriteria.push("实际行动结果必须由 Action Receipt 确认");
  }

  const passed = unmetCriteria.length === 0;
  return {
    passed,
    satisfiedCriteria,
    unmetCriteria,
    evidenceRefs,
    nextRecommendation: passed ? "complete" : hasHumanCompensationDecision ? "continue" : "ask_human"
  };
}
