// Eliy Workspace / Company Brain Lite — Schema Contracts
//
// This file defines type-only schema contracts for future workspace
// and Company Brain Lite persistence and retrieval boundaries.
//
// Design constraints:
//  - Type-only file.
//  - No runtime functions.
//  - No default exports.
//  - No side effects.
//  - No persistence implementation.
//  - No imports unless absolutely required.
//  - Prefer no imports.

export type WorkspaceScope = "personal" | "team" | "organization";

export type CompanyBrainLiteRecordKind =
  | "objective"
  | "otunit"
  | "evidence"
  | "decision"
  | "follow_up"
  | "review_check"
  | "adjust"
  | "revision_intent"
  | "reference_asset"
  | "process_asset"
  | "capability";

export type CompanyBrainLiteRecordSource =
  | "user_input"
  | "runtime_record"
  | "skill_asset"
  | "reference_asset"
  | "process_asset"
  | "capability_manifest";

export type CompanyBrainLiteRecordStatus =
  | "draft"
  | "active"
  | "archived";

export interface WorkspaceSchema {
  id: string;
  name: string;
  scope: WorkspaceScope;
  ownerId?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyBrainLiteRecord {
  id: string;
  workspaceId: string;
  kind: CompanyBrainLiteRecordKind;
  title: string;
  source: CompanyBrainLiteRecordSource;
  status: CompanyBrainLiteRecordStatus;
  sourceRef?: string;
  capabilityId?: string;
  relatedOTUnitId?: string;
  relatedObjectiveId?: string;
  evidenceRefs: readonly string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceCompanyBrainLiteSchema {
  version: string;
  workspace: WorkspaceSchema;
  records: readonly CompanyBrainLiteRecord[];
}
