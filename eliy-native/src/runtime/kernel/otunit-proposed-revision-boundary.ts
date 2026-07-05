
/**
 * OTUnit Proposed Revision Boundary Contract
 *
 * PR #52 — Confirmed revision preview creates a proposed revised OTUnit.
 * Pure boundary projection only. No persistence, no mutation, no LLM.
 *
 * Contract invariants:
 * - confirmed revision preview can generate proposed revised OTUnit
 * - proposed revised OTUnit still requires subsequent confirmation
 * - source OTUnit is NOT modified
 * - source OTUnit status does NOT change
 * - proposed revised OTUnit does NOT auto-replace source OTUnit
 */

import type {
  OTUnitRevisionPreview,
  OTUnitRevisionPreviewDecision,
} from "./otunit-revision-preview-boundary";

export const PROPOSED_REVISED_OTUNIT_STATUS_VALUES = [
  "proposed",
  "accepted",
  "rejected",
] as const;

export type ProposedRevisedOTUnitStatus =
  (typeof PROPOSED_REVISED_OTUNIT_STATUS_VALUES)[number];

export interface SourceOTUnitSnapshot {
  id: string;
  title: string;
  objective?: string;
  owner?: string;
  dueDate?: string;
  judgmentCriteria?: string;
  planOrActionItems?: readonly string[];
  evidenceRefs: readonly string[];
  status?: string;
}

export interface ProposedRevisedOTUnit {
  id: string;
  sourceOTUnitId: string;
  revisionPreviewId: string;
  revisionIntentRecordId: string;
  status: Extract<ProposedRevisedOTUnitStatus, "proposed">;
  title: string;
  objective?: string;
  owner?: string;
  dueDate?: string;
  judgmentCriteria?: string;
  planOrActionItems?: readonly string[];
  evidenceRefs: readonly string[];
  requiresConfirmation: true;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

export interface ProposedRevisedOTUnitBoundaryRecord {
  id: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  proposed: ProposedRevisedOTUnit;
  status: ProposedRevisedOTUnitStatus;
}

export interface CreateProposedRevisedOTUnitInput {
  id: string;
  proposedOTUnitId: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  preview: OTUnitRevisionPreview;
  decision: OTUnitRevisionPreviewDecision;
  createdAt?: string;
}

export function createProposedRevisedOTUnitFromConfirmedPreview(
  input: CreateProposedRevisedOTUnitInput,
): ProposedRevisedOTUnitBoundaryRecord {
  if (input.decision.status !== "confirmed") {
    throw new Error("Cannot create proposed revised OTUnit from rejected preview decision.");
  }

  if (input.decision.previewId !== input.preview.id) {
    throw new Error("Revision preview decision does not match preview.");
  }

  if (input.preview.source.otunitId !== input.sourceSnapshot.id) {
    throw new Error("Revision preview source OTUnit does not match source snapshot.");
  }

  const patch = input.preview.proposedPatch;

  const proposed: ProposedRevisedOTUnit = {
    id: input.proposedOTUnitId,
    sourceOTUnitId: input.sourceSnapshot.id,
    revisionPreviewId: input.preview.id,
    revisionIntentRecordId: input.preview.source.revisionIntentRecordId,
    status: "proposed",
    title: patch.title ?? input.sourceSnapshot.title,
    objective: patch.objective ?? input.sourceSnapshot.objective,
    owner: patch.owner ?? input.sourceSnapshot.owner,
    dueDate: patch.dueDate ?? input.sourceSnapshot.dueDate,
    judgmentCriteria:
      patch.judgmentCriteria ?? input.sourceSnapshot.judgmentCriteria,
    planOrActionItems:
      patch.planOrActionItems ?? input.sourceSnapshot.planOrActionItems,
    evidenceRefs: patch.evidenceRefs ?? input.sourceSnapshot.evidenceRefs,
    requiresConfirmation: true,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };

  return {
    id: input.id,
    sourceSnapshot: input.sourceSnapshot,
    proposed,
    status: "proposed",
  };
}
