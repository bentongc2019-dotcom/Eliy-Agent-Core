import { decideHacAction, type HacActionFacts } from "./hac-decision-model.js";

export type { HacActionFacts } from "./hac-decision-model.js";

export type HacGateEvaluation = {
  requiresHumanApproval: boolean;
  reason: string;
  policyVersion: string;
};

export const HAC_GATE_POLICY_VERSION = "hac-thin-gate-v0.1";

export const HAC_REJECT_MESSAGE =
  "The human rejected this tool call. The tool was not executed. Do not claim that the refund was submitted, prepared, processed, or completed.";

export function evaluateHacGate(actionFacts: HacActionFacts): HacGateEvaluation {
  const decision = decideHacAction(actionFacts);
  return {
    requiresHumanApproval: decision.mode === "AUTHORIZE",
    reason: decision.reason,
    policyVersion: HAC_GATE_POLICY_VERSION
  };
}
