/**
 * OTUnit Revision Repository Read Projection Contract
 *
 * Pure read-only projection that transforms repository records into a stable
 * read projection, filtered and grouped by sourceOTUnitId / revisionIntentRecordId.
 *
 * PR #59 — Read projection only. No repository persistence, no CLI, no runtime mutation.
 */

import type {
  OTUnitRevisionLifecycleProjection,
  OTUnitRevisionLifecycleStage,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionRepositoryRecordEnvelope,
  OTUnitRevisionRepositoryRecordKind,
} from "./otunit-revision-repository-contract";

// ── Projection Kind ─────────────────────────────────────────────────────────

export const OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND =
  "otunit_revision_repository_read_projection" as const;

// ── Record Summary ──────────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryRecordSummary {
  id: string;
  kind: OTUnitRevisionRepositoryRecordKind;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  createdAt?: string;
}

// ── Chain Projection ────────────────────────────────────────────────────────

export interface OTUnitRevisionChainReadProjection {
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  recordCount: number;
  recordKinds: readonly OTUnitRevisionRepositoryRecordKind[];
  records: readonly OTUnitRevisionRepositoryRecordSummary[];
  latestLifecycleProjection?: OTUnitRevisionLifecycleProjection;
  currentStage?: OTUnitRevisionLifecycleStage;
  decisionStatus?: "accepted" | "rejected";
  supersessionDeclared: boolean;
  appendOnly: true;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
}

// ── Repository Read Projection ──────────────────────────────────────────────

export interface OTUnitRevisionRepositoryReadProjection {
  id: string;
  kind: typeof OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND;
  sourceOTUnitId: string;
  revisionIntentRecordId?: string;
  chainCount: number;
  recordCount: number;
  chains: readonly OTUnitRevisionChainReadProjection[];
  appendOnly: true;
  repositoryReadOnly: true;
  runtimeMutationAllowed: false;
  repositoryPersistenceAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

// ── Projection Input ────────────────────────────────────────────────────────

export interface ProjectOTUnitRevisionRepositoryReadProjectionInput {
  id: string;
  sourceOTUnitId: string;
  revisionIntentRecordId?: string;
  records: readonly OTUnitRevisionRepositoryRecordEnvelope[];
  createdAt?: string;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function toRecordSummary(
  record: OTUnitRevisionRepositoryRecordEnvelope,
): OTUnitRevisionRepositoryRecordSummary {
  return {
    id: record.id,
    kind: record.kind,
    sourceOTUnitId: record.sourceOTUnitId,
    revisionIntentRecordId: record.revisionIntentRecordId,
    createdAt: record.createdAt,
  };
}

function readLatestLifecycleProjection(
  records: readonly OTUnitRevisionRepositoryRecordEnvelope[],
): OTUnitRevisionLifecycleProjection | undefined {
  const latest = [...records]
    .reverse()
    .find((record) => record.kind === "lifecycle_projection");
  return latest?.payload as OTUnitRevisionLifecycleProjection | undefined;
}

// ── Pure Projection Function ────────────────────────────────────────────────

export function projectOTUnitRevisionRepositoryReadProjection(
  input: ProjectOTUnitRevisionRepositoryReadProjectionInput,
): OTUnitRevisionRepositoryReadProjection {
  const scopedRecords = input.records.filter((record) => {
    if (record.sourceOTUnitId !== input.sourceOTUnitId) {
      return false;
    }
    if (
      input.revisionIntentRecordId &&
      record.revisionIntentRecordId !== input.revisionIntentRecordId
    ) {
      return false;
    }
    return true;
  });

  const grouped = new Map<string, OTUnitRevisionRepositoryRecordEnvelope[]>();

  for (const record of scopedRecords) {
    const existing = grouped.get(record.revisionIntentRecordId) ?? [];
    grouped.set(record.revisionIntentRecordId, [...existing, record]);
  }

  const chains: OTUnitRevisionChainReadProjection[] = [...grouped.entries()].map(
    ([revisionIntentRecordId, chainRecords]) => {
      const latestLifecycleProjection =
        readLatestLifecycleProjection(chainRecords);

      return {
        sourceOTUnitId: input.sourceOTUnitId,
        revisionIntentRecordId,
        recordCount: chainRecords.length,
        recordKinds: chainRecords.map((record) => record.kind),
        records: chainRecords.map(toRecordSummary),
        latestLifecycleProjection,
        currentStage: latestLifecycleProjection?.currentStage,
        decisionStatus: latestLifecycleProjection?.decisionStatus,
        supersessionDeclared:
          latestLifecycleProjection?.supersessionDeclared ?? false,
        appendOnly: true,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        sourceOTUnitReplacementAllowed: false,
        autoReplaceSourceOTUnit: false,
      };
    },
  );

  return {
    id: input.id,
    kind: OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND,
    sourceOTUnitId: input.sourceOTUnitId,
    revisionIntentRecordId: input.revisionIntentRecordId,
    chainCount: chains.length,
    recordCount: scopedRecords.length,
    chains,
    appendOnly: true,
    repositoryReadOnly: true,
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}
