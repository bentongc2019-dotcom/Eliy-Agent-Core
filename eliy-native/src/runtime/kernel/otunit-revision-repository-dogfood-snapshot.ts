/**
 * OTUnit Revision Repository Dogfood Snapshot Contract
 *
 * Pure snapshot projection that turns a process-local dogfood harness result
 * into a stable snapshot for future terminal show / CLI command use.
 *
 * No CLI integration, no filesystem persistence, no database persistence,
 * no provider / real LLM integration, no runtime behavior change, and no
 * source OTUnit mutation or replacement.
 */

import type {
  OTUnitRevisionRepositoryDogfoodHarnessResult,
} from "./otunit-revision-repository-dogfood-harness";

import type {
  OTUnitRevisionRepositoryRecordKind,
} from "./otunit-revision-repository-contract";

import type {
  OTUnitRevisionLifecycleStage,
} from "./otunit-revision-chain-boundary";

// ── Snapshot Kind ────────────────────────────────────────────────────────────

export const OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND =
  "otunit_revision_repository_dogfood_snapshot" as const;

// ── Sub-Snapshot Types ───────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryDogfoodAppendSnapshot {
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

export interface OTUnitRevisionRepositoryDogfoodReadSnapshot {
  chainCount: number;
  recordCount: number;
  currentStage?: OTUnitRevisionLifecycleStage;
  decisionStatus?: "accepted" | "rejected";
  supersessionDeclared: boolean;
  recordKinds: readonly OTUnitRevisionRepositoryRecordKind[];
}

export interface OTUnitRevisionRepositoryDogfoodSupersessionSnapshot {
  sourceOTUnitId: string;
  revisedOTUnitId: string;
  relation: "supersedes";
  versionLinkRequired: true;
  sourceHistoryPreserved: true;
}

// ── Main Snapshot ────────────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryDogfoodSnapshot {
  id: string;
  kind: typeof OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND;
  harnessId: string;
  repositoryKind: string;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  currentStage?: OTUnitRevisionLifecycleStage;
  decisionStatus?: "accepted" | "rejected";
  supersessionDeclared: boolean;
  appendCount: number;
  recordCount: number;
  recordKinds: readonly OTUnitRevisionRepositoryRecordKind[];
  appendResults: readonly OTUnitRevisionRepositoryDogfoodAppendSnapshot[];
  readSnapshot: OTUnitRevisionRepositoryDogfoodReadSnapshot;
  supersessionSnapshot: OTUnitRevisionRepositoryDogfoodSupersessionSnapshot;
  sourceSnapshotPreserved: true;
  runtimeMutationAllowed: false;
  repositoryPersistenceAllowed: false;
  filesystemPersistenceAllowed: false;
  databasePersistenceAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

// ── Projection Input ─────────────────────────────────────────────────────────

export interface ProjectOTUnitRevisionRepositoryDogfoodSnapshotInput {
  id: string;
  harnessResult: OTUnitRevisionRepositoryDogfoodHarnessResult;
  createdAt?: string;
}

// ── Pure Projection Function ─────────────────────────────────────────────────

export function projectOTUnitRevisionRepositoryDogfoodSnapshot(
  input: ProjectOTUnitRevisionRepositoryDogfoodSnapshotInput,
): OTUnitRevisionRepositoryDogfoodSnapshot {
  const { harnessResult } = input;
  const chain = harnessResult.readProjection.chains[0];

  if (!chain) {
    throw new Error("Dogfood snapshot requires one revision read projection chain.");
  }

  if (harnessResult.readProjection.chainCount !== 1) {
    throw new Error("Dogfood snapshot requires exactly one revision chain.");
  }

  if (chain.sourceOTUnitId !== harnessResult.lifecycleProjection.sourceOTUnitId) {
    throw new Error("Read projection source OTUnit does not match lifecycle projection.");
  }

  if (
    chain.revisionIntentRecordId !==
    harnessResult.lifecycleProjection.revisionIntentRecordId
  ) {
    throw new Error("Read projection revision intent does not match lifecycle projection.");
  }

  if (chain.recordCount !== harnessResult.appendResults.length) {
    throw new Error("Read projection record count does not match append results.");
  }

  if (chain.currentStage !== harnessResult.lifecycleProjection.currentStage) {
    throw new Error("Read projection current stage does not match lifecycle projection.");
  }

  if (chain.decisionStatus !== harnessResult.lifecycleProjection.decisionStatus) {
    throw new Error("Read projection decision status does not match lifecycle projection.");
  }

  if (
    chain.supersessionDeclared !==
    harnessResult.lifecycleProjection.supersessionDeclared
  ) {
    throw new Error("Read projection supersession status does not match lifecycle projection.");
  }

  const supersessionRelation =
    harnessResult.supersessionBoundary.relationRecord;

  if (
    supersessionRelation.sourceOTUnitId !==
    harnessResult.sourceSnapshotAfterDogfood.id
  ) {
    throw new Error("Supersession source OTUnit does not match source snapshot.");
  }

  if (
    supersessionRelation.revisedOTUnitId !==
    harnessResult.proposedBoundary.proposed.id
  ) {
    throw new Error("Supersession revised OTUnit does not match proposed revised OTUnit.");
  }

  return {
    id: input.id,
    kind: OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND,
    harnessId: harnessResult.id,
    repositoryKind: harnessResult.repositoryKind,
    sourceOTUnitId: chain.sourceOTUnitId,
    revisionIntentRecordId: chain.revisionIntentRecordId,
    currentStage: chain.currentStage,
    decisionStatus: chain.decisionStatus,
    supersessionDeclared: chain.supersessionDeclared,
    appendCount: harnessResult.appendResults.length,
    recordCount: chain.recordCount,
    recordKinds: chain.recordKinds,
    appendResults: harnessResult.appendResults.map((appendResult) => ({
      recordId: appendResult.recordId,
      kind: appendResult.kind,
      sourceOTUnitId: appendResult.sourceOTUnitId,
      revisionIntentRecordId: appendResult.revisionIntentRecordId,
      appended: true,
      appendOnly: true,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      sourceOTUnitReplacementAllowed: false,
      autoReplaceSourceOTUnit: false,
    })),
    readSnapshot: {
      chainCount: harnessResult.readProjection.chainCount,
      recordCount: chain.recordCount,
      currentStage: chain.currentStage,
      decisionStatus: chain.decisionStatus,
      supersessionDeclared: chain.supersessionDeclared,
      recordKinds: chain.recordKinds,
    },
    supersessionSnapshot: {
      sourceOTUnitId: supersessionRelation.sourceOTUnitId,
      revisedOTUnitId: supersessionRelation.revisedOTUnitId,
      relation: supersessionRelation.relation,
      versionLinkRequired: true,
      sourceHistoryPreserved: true,
    },
    sourceSnapshotPreserved: true,
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    filesystemPersistenceAllowed: false,
    databasePersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}
