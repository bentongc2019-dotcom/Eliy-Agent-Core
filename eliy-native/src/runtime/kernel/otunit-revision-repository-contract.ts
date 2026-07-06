/**
 * OTUnit Revision Repository Contract
 *
 * Contract-only repository surface for OTUnit revision records.
 * No repository implementation, no filesystem persistence, no database,
 * no CLI integration, and no runtime behavior change.
 *
 * PR #57 — Repository contract definition only.
 * PR #50–#56 boundary surfaces remain untouched.
 */

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionLifecycleProjection,
  OTUnitRevisionPreview,
  ProposedRevisedOTUnitBoundaryRecord,
  ProposedRevisedOTUnitDecisionBoundaryRecord,
  OTUnitSupersessionBoundaryRecord,
} from "./otunit-revision-chain-boundary";

// ── Record Kind Registry ─────────────────────────────────────────────────────

export const OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES = [
  "revision_intent_snapshot",
  "revision_preview",
  "proposed_revised_otunit_boundary",
  "proposed_revised_otunit_decision_boundary",
  "supersession_boundary",
  "lifecycle_projection",
] as const;

export type OTUnitRevisionRepositoryRecordKind =
  (typeof OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES)[number];

// ── Operation Registry ───────────────────────────────────────────────────────

export const OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES = [
  "append_revision_record",
  "list_revision_records",
  "read_lifecycle_projection",
] as const;

export type OTUnitRevisionRepositoryOperation =
  (typeof OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES)[number];

// ── Record Payload ───────────────────────────────────────────────────────────

export type OTUnitRevisionRepositoryRecordPayload =
  | OTUnitRevisionIntentSnapshot
  | OTUnitRevisionPreview
  | ProposedRevisedOTUnitBoundaryRecord
  | ProposedRevisedOTUnitDecisionBoundaryRecord
  | OTUnitSupersessionBoundaryRecord
  | OTUnitRevisionLifecycleProjection;

// ── Record Envelope ──────────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryRecordEnvelope {
  id: string;
  kind: OTUnitRevisionRepositoryRecordKind;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  payload: OTUnitRevisionRepositoryRecordPayload;
  appendOnly: true;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

// ── Append Operation ─────────────────────────────────────────────────────────

export interface AppendOTUnitRevisionRepositoryRecordInput {
  record: OTUnitRevisionRepositoryRecordEnvelope;
}

export interface AppendOTUnitRevisionRepositoryRecordResult {
  recordId: string;
  kind: OTUnitRevisionRepositoryRecordKind;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  appended: true;
  appendOnly: true;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
}

// ── List Operation ───────────────────────────────────────────────────────────

export interface ListOTUnitRevisionRepositoryRecordsInput {
  sourceOTUnitId: string;
  revisionIntentRecordId?: string;
}

export interface ListOTUnitRevisionRepositoryRecordsResult {
  sourceOTUnitId: string;
  revisionIntentRecordId?: string;
  records: readonly OTUnitRevisionRepositoryRecordEnvelope[];
}

// ── Read Lifecycle Projection Operation ──────────────────────────────────────

export interface ReadOTUnitRevisionLifecycleProjectionInput {
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
}

export interface ReadOTUnitRevisionLifecycleProjectionResult {
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  projection?: OTUnitRevisionLifecycleProjection;
}

// ── Repository Contract ──────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryContract {
  appendRevisionRecord(
    input: AppendOTUnitRevisionRepositoryRecordInput,
  ): Promise<AppendOTUnitRevisionRepositoryRecordResult>;

  listRevisionRecords(
    input: ListOTUnitRevisionRepositoryRecordsInput,
  ): Promise<ListOTUnitRevisionRepositoryRecordsResult>;

  readRevisionLifecycleProjection(
    input: ReadOTUnitRevisionLifecycleProjectionInput,
  ): Promise<ReadOTUnitRevisionLifecycleProjectionResult>;
}
