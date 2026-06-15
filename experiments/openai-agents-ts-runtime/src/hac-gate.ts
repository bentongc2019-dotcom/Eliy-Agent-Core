export type HacGateEvaluation = {
  requiresHumanApproval: boolean;
  reason: string;
  policyVersion: string;
};

export const HAC_GATE_POLICY_VERSION = "hac-thin-gate-v0.1";

export const HAC_REJECT_MESSAGE =
  "The human rejected this tool call. The tool was not executed. Do not claim that the refund was submitted, prepared, processed, or completed.";

export function evaluateHacGate(toolName: string): HacGateEvaluation {
  if (toolName === "prepare_refund") {
    return {
      requiresHumanApproval: true,
      reason: "prepare_refund changes a customer-facing financial workflow and requires explicit human approval.",
      policyVersion: HAC_GATE_POLICY_VERSION
    };
  }

  return {
    requiresHumanApproval: false,
    reason: "No human approval policy matched this tool.",
    policyVersion: HAC_GATE_POLICY_VERSION
  };
}
