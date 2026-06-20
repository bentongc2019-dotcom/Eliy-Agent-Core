import type { LoopActionProposal, OperationalState } from "./operational-state.js";

export type GovernorResult =
  | { outcome: "allow" }
  | {
      outcome: "ask_human";
      reasonCode: string;
      requiredHumanInput: string;
    }
  | {
      outcome: "stop";
      reasonCode: string;
    };

export function evaluateHacGovernor(
  state: OperationalState,
  proposal: LoopActionProposal
): GovernorResult {
  const lastHumanDecision = state.humanDecisions.at(-1);
  if (lastHumanDecision?.kind === "pause") {
    return { outcome: "stop", reasonCode: "human_requested_pause" };
  }
  if (lastHumanDecision?.kind === "redirect") {
    return { outcome: "ask_human", reasonCode: "human_requested_redirect", requiredHumanInput: "Confirm the revised direction before continuing." };
  }
  if (lastHumanDecision?.kind === "takeover") {
    return { outcome: "stop", reasonCode: "human_takeover" };
  }

  if (proposal.mayChangeGoal) {
    return {
      outcome: "ask_human",
      reasonCode: "goal_change_requires_confirmation",
      requiredHumanInput: "Confirm a new Human Intent Contract before changing the goal."
    };
  }

  if (proposal.mayChangeSuccessCriteria) {
    return {
      outcome: "ask_human",
      reasonCode: "success_criteria_change_requires_confirmation",
      requiredHumanInput: "Confirm revised success criteria before continuing."
    };
  }

  if (proposal.touchesNonDelegableJudgment) {
    return {
      outcome: "ask_human",
      reasonCode: "non_delegable_judgment",
      requiredHumanInput: "Human must choose, modify, or reject this judgment."
    };
  }

  if (proposal.outsideDelegatedScope) {
    return {
      outcome: "ask_human",
      reasonCode: "outside_delegated_scope",
      requiredHumanInput: "Confirm delegation scope before continuing."
    };
  }

  if (proposal.kind !== "ask_human" && state.openQuestions.includes("delivery_delay_days")) {
    return {
      outcome: "ask_human",
      reasonCode: "critical_fact_missing",
      requiredHumanInput: "Confirm delay duration or allow the harness to proceed with an explicit assumption."
    };
  }

  const contestedEvidence = [...state.facts, ...state.assumptions].find((item) => item.status === "contested");
  if (contestedEvidence) {
    return {
      outcome: "ask_human",
      reasonCode: "directional_evidence_conflict",
      requiredHumanInput: `Resolve contested evidence: ${contestedEvidence.content}`
    };
  }

  if (state.bounds.noProgressCount >= state.bounds.limits.noProgressLimit) {
    return { outcome: "stop", reasonCode: "no_progress" };
  }

  return { outcome: "allow" };
}
