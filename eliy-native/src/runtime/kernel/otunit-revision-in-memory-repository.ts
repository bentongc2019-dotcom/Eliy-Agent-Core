/**
 * In-memory OTUnit Revision Repository Adapter
 *
 * Process-local adapter for OTUnit revision repository records.
 * Implements OTUnitRevisionRepositoryContract for tests / dogfood only.
 * No filesystem persistence, no database, no CLI integration, and no source
 * OTUnit mutation or replacement.
 */

import type {
  AppendOTUnitRevisionRepositoryRecordInput,
  AppendOTUnitRevisionRepositoryRecordResult,
  ListOTUnitRevisionRepositoryRecordsInput,
  ListOTUnitRevisionRepositoryRecordsResult,
  OTUnitRevisionRepositoryContract,
  OTUnitRevisionRepositoryRecordEnvelope,
  ReadOTUnitRevisionLifecycleProjectionInput,
  ReadOTUnitRevisionLifecycleProjectionResult,
} from "./otunit-revision-repository-contract";

import type {
  OTUnitRevisionLifecycleProjection,
} from "./otunit-revision-chain-boundary";

export const IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND =
  "in_memory_otunit_revision_repository" as const;

export interface InMemoryOTUnitRevisionRepositorySnapshot {
  records: readonly OTUnitRevisionRepositoryRecordEnvelope[];
}

export interface InMemoryOTUnitRevisionRepository
  extends OTUnitRevisionRepositoryContract {
  readonly kind: typeof IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND;
  snapshot(): InMemoryOTUnitRevisionRepositorySnapshot;
}

export interface CreateInMemoryOTUnitRevisionRepositoryInput {
  initialRecords?: readonly OTUnitRevisionRepositoryRecordEnvelope[];
}

function assertAppendOnlyRevisionRecord(
  record: OTUnitRevisionRepositoryRecordEnvelope,
): void {
  if (record.appendOnly !== true) {
    throw new Error("OTUnit revision repository record must be append-only.");
  }

  if (record.sourceOTUnitMutationAllowed !== false) {
    throw new Error("OTUnit revision repository record cannot mutate source OTUnit.");
  }

  if (record.sourceOTUnitStatusChangeAllowed !== false) {
    throw new Error("OTUnit revision repository record cannot change source OTUnit status.");
  }

  if (record.sourceOTUnitReplacementAllowed !== false) {
    throw new Error("OTUnit revision repository record cannot replace source OTUnit.");
  }

  if (record.autoReplaceSourceOTUnit !== false) {
    throw new Error("OTUnit revision repository record cannot auto-replace source OTUnit.");
  }
}

export function createInMemoryOTUnitRevisionRepository(
  input: CreateInMemoryOTUnitRevisionRepositoryInput = {},
): InMemoryOTUnitRevisionRepository {
  const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
    ...(input.initialRecords ?? []),
  ];

  for (const record of records) {
    assertAppendOnlyRevisionRecord(record);
  }

  return {
    kind: IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND,

    async appendRevisionRecord(
      appendInput: AppendOTUnitRevisionRepositoryRecordInput,
    ): Promise<AppendOTUnitRevisionRepositoryRecordResult> {
      const { record } = appendInput;

      assertAppendOnlyRevisionRecord(record);

      records.push(record);

      return {
        recordId: record.id,
        kind: record.kind,
        sourceOTUnitId: record.sourceOTUnitId,
        revisionIntentRecordId: record.revisionIntentRecordId,
        appended: true,
        appendOnly: true,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        sourceOTUnitReplacementAllowed: false,
        autoReplaceSourceOTUnit: false,
      };
    },

    async listRevisionRecords(
      listInput: ListOTUnitRevisionRepositoryRecordsInput,
    ): Promise<ListOTUnitRevisionRepositoryRecordsResult> {
      return {
        sourceOTUnitId: listInput.sourceOTUnitId,
        revisionIntentRecordId: listInput.revisionIntentRecordId,
        records: records.filter((record) => {
          if (record.sourceOTUnitId !== listInput.sourceOTUnitId) {
            return false;
          }

          if (
            listInput.revisionIntentRecordId &&
            record.revisionIntentRecordId !== listInput.revisionIntentRecordId
          ) {
            return false;
          }

          return true;
        }),
      };
    },

    async readRevisionLifecycleProjection(
      readInput: ReadOTUnitRevisionLifecycleProjectionInput,
    ): Promise<ReadOTUnitRevisionLifecycleProjectionResult> {
      const matchingProjectionRecord = [...records]
        .reverse()
        .find(
          (record) =>
            record.kind === "lifecycle_projection" &&
            record.sourceOTUnitId === readInput.sourceOTUnitId &&
            record.revisionIntentRecordId === readInput.revisionIntentRecordId,
        );

      return {
        sourceOTUnitId: readInput.sourceOTUnitId,
        revisionIntentRecordId: readInput.revisionIntentRecordId,
        projection: matchingProjectionRecord?.payload as
          | OTUnitRevisionLifecycleProjection
          | undefined,
      };
    },

    snapshot(): InMemoryOTUnitRevisionRepositorySnapshot {
      return {
        records: [...records],
      };
    },
  };
}
