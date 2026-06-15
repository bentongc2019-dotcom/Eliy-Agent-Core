export type HacActionFacts = {
  actionId: string;
  actionType: string;
  hasExternalSideEffect: boolean;
  requiresHumanValueJudgment: boolean;
  prohibited: boolean;
};

export type HacDecisionMode = "AUTONOMOUS" | "PROPOSE" | "AUTHORIZE" | "BLOCK";

export type HacDecision = {
  mode: HacDecisionMode;
  reasonCode: string;
  reason: string;
  policyVersion: string;
  requiredHumanInput?: string;
};

export const HAC_DECISION_MODEL_POLICY_VERSION = "hac-minimum-action-decision-model-v0.1";

export function decideHacAction(facts: HacActionFacts): HacDecision {
  if (facts.prohibited) {
    return {
      mode: "BLOCK",
      reasonCode: "ACTION_PROHIBITED",
      reason: "The current action is prohibited and must not enter a normal approval path.",
      policyVersion: HAC_DECISION_MODEL_POLICY_VERSION,
      requiredHumanInput: "Remove prohibited content or reformulate a safe action before continuing."
    };
  }

  if (facts.hasExternalSideEffect) {
    return {
      mode: "AUTHORIZE",
      reasonCode: "EXTERNAL_SIDE_EFFECT",
      reason: "The current action has an external side effect and requires explicit human authorization.",
      policyVersion: HAC_DECISION_MODEL_POLICY_VERSION,
      requiredHumanInput: "Approve or reject execution of this specific action."
    };
  }

  if (facts.requiresHumanValueJudgment) {
    return {
      mode: "PROPOSE",
      reasonCode: "HUMAN_VALUE_JUDGMENT",
      reason: "The current action requires a human value judgment and must remain a proposal.",
      policyVersion: HAC_DECISION_MODEL_POLICY_VERSION,
      requiredHumanInput: "Choose, revise, or reject the proposed option before any execution step."
    };
  }

  return {
    mode: "AUTONOMOUS",
    reasonCode: "NO_HUMAN_INPUT_REQUIRED",
    reason: "The current action has no external side effect, no required human value judgment, and is not prohibited.",
    policyVersion: HAC_DECISION_MODEL_POLICY_VERSION
  };
}
