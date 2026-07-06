/**
 * OTUnit Supersession Boundary Contract
 *
 * PR #54 — Accepted proposed revised OTUnit can declare supersession.
 * Pure boundary projection only. No persistence, no mutation, no LLM, no CLI.
 *
 * Contract invariants:
 * - accepted proposed revised OTUnit can declare supersession
 * - supersession declaration does NOT cover source OTUnit
 * - supersession declaration does NOT delete source OTUnit
 * - supersession declaration does NOT directly change source OTUnit status
 * - supersession declaration preserves version link
 * - supersession declaration does NOT do repository persistence
 * - supersession declaration does NOT connect CLI
 */

import type {
  ProposedRevisedOTUnitDecisionBoundaryRecord,
} from "./otunit-proposed-revision-decision-boundary";

export const OTUNIT_SUPERSESSION_STATUS_VALUES = [
  "declared",
] as const;

export type OTUnitSupersessionStatus =
  (typeof OTUNIT_SUPERSESSION_STATUS_VALUES)[number];

export const OTUNIT_SUPERSESSION_RELATION_VALUES = [
  "supersedes",
] as const;

export type OTUnitSupersessionRelation =
  (typeof OTUNIT_SUPERSESSION_RELATION_VALUES)[number];

export interface OTUnitSupersessionRelationRecord {
  sourceOTUnitId: string;
  revisedOTUnitId: string;
  decisionBoundaryRecordId: string;
  relation: OTUnitSupersessionRelation;
  versionLinkRequired: true;
  sourceHistoryPreserved: true;
}

export interface OTUnitSupersessionBoundaryRecord {
  id: string;
  decisionBoundaryRecord: ProposedRevisedOTUnitDecisionBoundaryRecord;
  relationRecord: OTUnitSupersessionRelationRecord;
  status: OTUnitSupersessionStatus;
  runtimeMutationAllowed: false;
  repositoryPersistenceAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

export interface DeclareOTUnitSupersessionInput {
  id: string;
  decisionBoundaryRecord: ProposedRevisedOTUnitDecisionBoundaryRecord;
  createdAt?: string;
}

export function declareOTUnitSupersessionFromAcceptedDecision(
  input: DeclareOTUnitSupersessionInput,
): OTUnitSupersessionBoundaryRecord {
  const boundary = input.decisionBoundaryRecord;

  if (boundary.status !== "accepted") {
    throw new Error("Only accepted proposed revised OTUnit can declare supersession.");
  }

  if (boundary.decision.status !== "accepted") {
    throw new Error("Only accepted decision can declare supersession.");
  }

  if (boundary.decision.proposedOTUnitId !== boundary.proposed.id) {
    throw new Error("Decision does not match proposed revised OTUnit.");
  }

  return {
    id: input.id,
    decisionBoundaryRecord: boundary,
    relationRecord: {
      sourceOTUnitId: boundary.proposed.sourceOTUnitId,
      revisedOTUnitId: boundary.proposed.id,
      decisionBoundaryRecordId: boundary.id,
      relation: "supersedes",
      versionLinkRequired: true,
      sourceHistoryPreserved: true,
    },
    status: "declared",
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}
