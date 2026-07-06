/**
 * OTUnit Revision Lifecycle Projection Boundary Contract
 *
 * PR #55 — Read-only lifecycle projection across 5 stages:
 *   revision_intent_recorded
 *   → revision_previewed
 *   → proposed_revised_otunit_created
 *   → proposed_revised_otunit_decided
 *   → supersession_declared
 *
 * Pure boundary projection only. No repository persistence, no CLI, no runtime mutation.
 */

import type {
  OTUnitRevisionPreview,
} from "./otunit-revision-preview-boundary";

import type {
  ProposedRevisedOTUnitBoundaryRecord,
} from "./otunit-proposed-revision-boundary";

import type {
  ProposedRevisedOTUnitDecisionBoundaryRecord,
} from "./otunit-proposed-revision-decision-boundary";

import type {
  OTUnitSupersessionBoundaryRecord,
} from "./otunit-supersession-boundary";

export const OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES = [
  "revision_intent_recorded",
  "revision_previewed",
  "proposed_revised_otunit_created",
  "proposed_revised_otunit_decided",
  "supersession_declared",
] as const;

export type OTUnitRevisionLifecycleStage =
  (typeof OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES)[number];

export interface OTUnitRevisionIntentSnapshot {
  id: string;
  sourceOTUnitId: string;
  reasonText: string;
  directionText: string;
  evidenceRefs: readonly string[];
  createdAt?: string;
}

export interface OTUnitRevisionLifecycleProjectionInput {
  id: string;
  revisionIntent: OTUnitRevisionIntentSnapshot;
  preview?: OTUnitRevisionPreview;
  proposedBoundary?: ProposedRevisedOTUnitBoundaryRecord;
  decisionBoundary?: ProposedRevisedOTUnitDecisionBoundaryRecord;
  supersessionBoundary?: OTUnitSupersessionBoundaryRecord;
  createdAt?: string;
}

export interface OTUnitRevisionLifecycleProjection {
  id: string;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  currentStage: OTUnitRevisionLifecycleStage;
  revisionIntent: OTUnitRevisionIntentSnapshot;
  preview?: OTUnitRevisionPreview;
  proposedBoundary?: ProposedRevisedOTUnitBoundaryRecord;
  decisionBoundary?: ProposedRevisedOTUnitDecisionBoundaryRecord;
  supersessionBoundary?: OTUnitSupersessionBoundaryRecord;
  decisionStatus?: "accepted" | "rejected";
  supersessionDeclared: boolean;
  runtimeMutationAllowed: false;
  repositoryPersistenceAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

export function projectOTUnitRevisionLifecycle(
  input: OTUnitRevisionLifecycleProjectionInput,
): OTUnitRevisionLifecycleProjection {
  const sourceOTUnitId = input.revisionIntent.sourceOTUnitId;
  const revisionIntentRecordId = input.revisionIntent.id;

  if (input.preview) {
    if (input.preview.source.otunitId !== sourceOTUnitId) {
      throw new Error("Revision preview source OTUnit does not match revision intent.");
    }

    if (input.preview.source.revisionIntentRecordId !== revisionIntentRecordId) {
      throw new Error("Revision preview does not match revision intent record.");
    }
  }

  if (input.proposedBoundary) {
    if (!input.preview) {
      throw new Error("Proposed revised OTUnit boundary requires revision preview.");
    }

    if (input.proposedBoundary.proposed.sourceOTUnitId !== sourceOTUnitId) {
      throw new Error("Proposed revised OTUnit source does not match revision intent.");
    }

    if (input.proposedBoundary.proposed.revisionPreviewId !== input.preview.id) {
      throw new Error("Proposed revised OTUnit does not match revision preview.");
    }

    if (
      input.proposedBoundary.proposed.revisionIntentRecordId !==
      revisionIntentRecordId
    ) {
      throw new Error("Proposed revised OTUnit does not match revision intent record.");
    }
  }

  if (input.decisionBoundary) {
    if (!input.proposedBoundary) {
      throw new Error("Decision boundary requires proposed revised OTUnit boundary.");
    }

    if (
      input.decisionBoundary.proposed.id !==
      input.proposedBoundary.proposed.id
    ) {
      throw new Error("Decision boundary does not match proposed revised OTUnit.");
    }

    if (
      input.decisionBoundary.decision.proposedOTUnitId !==
      input.proposedBoundary.proposed.id
    ) {
      throw new Error("Decision does not match proposed revised OTUnit.");
    }
  }

  if (input.supersessionBoundary) {
    if (!input.decisionBoundary) {
      throw new Error("Supersession boundary requires decision boundary.");
    }

    if (input.decisionBoundary.status !== "accepted") {
      throw new Error("Supersession boundary requires accepted decision.");
    }

    if (
      input.supersessionBoundary.decisionBoundaryRecord.id !==
      input.decisionBoundary.id
    ) {
      throw new Error("Supersession boundary does not match decision boundary.");
    }

    if (
      input.supersessionBoundary.relationRecord.sourceOTUnitId !==
      sourceOTUnitId
    ) {
      throw new Error("Supersession source OTUnit does not match revision intent.");
    }

    if (
      input.supersessionBoundary.relationRecord.revisedOTUnitId !==
      input.decisionBoundary.proposed.id
    ) {
      throw new Error("Supersession revised OTUnit does not match accepted proposal.");
    }
  }

  const currentStage: OTUnitRevisionLifecycleStage = input.supersessionBoundary
    ? "supersession_declared"
    : input.decisionBoundary
      ? "proposed_revised_otunit_decided"
      : input.proposedBoundary
        ? "proposed_revised_otunit_created"
        : input.preview
          ? "revision_previewed"
          : "revision_intent_recorded";

  return {
    id: input.id,
    sourceOTUnitId,
    revisionIntentRecordId,
    currentStage,
    revisionIntent: input.revisionIntent,
    preview: input.preview,
    proposedBoundary: input.proposedBoundary,
    decisionBoundary: input.decisionBoundary,
    supersessionBoundary: input.supersessionBoundary,
    decisionStatus: input.decisionBoundary?.status,
    supersessionDeclared: Boolean(input.supersessionBoundary),
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}
