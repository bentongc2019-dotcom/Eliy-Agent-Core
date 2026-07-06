
/**
 * OTUnit Proposed Revision Decision Boundary Contract
 *
 * PR #53 — Proposed revised OTUnit can be accepted or rejected.
 * Pure boundary projection only. No persistence, no mutation, no LLM, no CLI.
 *
 * Contract invariants:
 * - proposed revised OTUnit can be accepted
 * - proposed revised OTUnit can be rejected
 * - accepting proposed revised OTUnit does NOT replace source OTUnit
 * - rejecting proposed revised OTUnit does NOT change source OTUnit
 * - decision boundary does NOT do repository persistence
 * - decision boundary does NOT connect CLI
 */

import type {
  ProposedRevisedOTUnit,
} from "./otunit-proposed-revision-boundary";

export const PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES = [
  "accepted",
  "rejected",
] as const;

export type ProposedRevisedOTUnitDecisionStatus =
  (typeof PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES)[number];

export type ProposedRevisedOTUnitDecisionActor =
  | "user"
  | "runtime"
  | "agent";

export interface ProposedRevisedOTUnitDecision {
  id: string;
  proposedOTUnitId: string;
  status: ProposedRevisedOTUnitDecisionStatus;
  decidedBy: ProposedRevisedOTUnitDecisionActor;
  reason?: string;
  createdAt?: string;
}

export interface ProposedRevisedOTUnitDecisionBoundaryRecord {
  id: string;
  proposed: ProposedRevisedOTUnit;
  decision: ProposedRevisedOTUnitDecision;
  status: ProposedRevisedOTUnitDecisionStatus;
  runtimeMutationAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

export interface DecideProposedRevisedOTUnitInput {
  id: string;
  proposed: ProposedRevisedOTUnit;
  decision: ProposedRevisedOTUnitDecision;
  createdAt?: string;
}

export function decideProposedRevisedOTUnit(
  input: DecideProposedRevisedOTUnitInput,
): ProposedRevisedOTUnitDecisionBoundaryRecord {
  if (input.proposed.status !== "proposed") {
    throw new Error("Only proposed revised OTUnit can be decided.");
  }

  if (input.decision.proposedOTUnitId !== input.proposed.id) {
    throw new Error("Decision does not match proposed revised OTUnit.");
  }

  return {
    id: input.id,
    proposed: input.proposed,
    decision: input.decision,
    status: input.decision.status,
    runtimeMutationAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}
