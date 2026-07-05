/**
 * OTUnit Revision Preview Boundary Contract
 *
 * This contract describes how an already recorded revision intent can be expressed
 * as a previewable, confirmable, and rejectable revision preview contract.
 *
 * PR #50 — Contract scaffold only.
 * No runtime functions, no persistence, no mutation, no new OTUnit creation.
 */

export const OTUNIT_REVISION_PREVIEW_STATUS_VALUES = [
  "previewed",
  "requires_confirmation",
  "confirmed",
  "rejected",
] as const;

export type OTUnitRevisionPreviewStatus =
  (typeof OTUNIT_REVISION_PREVIEW_STATUS_VALUES)[number];

export type OTUnitRevisionPreviewActor =
  | "user"
  | "runtime"
  | "agent";

export interface OTUnitRevisionPreviewSource {
  otunitId: string;
  revisionIntentRecordId: string;
  reasonText: string;
  directionText: string;
  evidenceRefs: readonly string[];
}

export interface OTUnitRevisionPreviewPatch {
  title?: string;
  objective?: string;
  owner?: string;
  dueDate?: string;
  judgmentCriteria?: string;
  planOrActionItems?: readonly string[];
  evidenceRefs?: readonly string[];
}

export interface OTUnitRevisionPreview {
  id: string;
  source: OTUnitRevisionPreviewSource;
  proposedPatch: OTUnitRevisionPreviewPatch;
  previewSummary: string;
  status: Extract<
    OTUnitRevisionPreviewStatus,
    "previewed" | "requires_confirmation"
  >;
  requiresConfirmation: true;
  runtimeMutationAllowed: false;
  sourceOTUnitMutationAllowed: false;
  newOTUnitCreated: false;
  createdAt?: string;
}

export interface OTUnitRevisionPreviewDecision {
  previewId: string;
  status: Extract<OTUnitRevisionPreviewStatus, "confirmed" | "rejected">;
  decidedBy: OTUnitRevisionPreviewActor;
  reason?: string;
  createdAt?: string;
}

export interface OTUnitRevisionPreviewBoundaryRecord {
  id: string;
  preview: OTUnitRevisionPreview;
  decision?: OTUnitRevisionPreviewDecision;
  status: OTUnitRevisionPreviewStatus;
}
