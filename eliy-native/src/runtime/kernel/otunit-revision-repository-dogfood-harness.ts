/**
 * OTUnit Revision Repository Dogfood Harness
 *
 * Process-local dogfood harness for the OTUnit revision repository chain.
 * It wires revision intent → preview → proposed revised OTUnit → decision
 * → supersession → lifecycle projection → repository read projection.
 *
 * No CLI integration, no filesystem persistence, no database persistence,
 * no provider / real LLM integration, no runtime behavior change, and no
 * source OTUnit mutation or replacement.
 *
 * PR #60 — Dogfood harness only. No CLI, no filesystem, no DB, no LLM.
 * PR #50–#59 boundary / contract / adapter / projection surfaces remain untouched.
 */

import {
  createProposedRevisedOTUnitFromConfirmedPreview,
  decideProposedRevisedOTUnit,
  declareOTUnitSupersessionFromAcceptedDecision,
  projectOTUnitRevisionLifecycle,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreview,
  OTUnitRevisionPreviewDecision,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
  ProposedRevisedOTUnitBoundaryRecord,
  ProposedRevisedOTUnitDecisionBoundaryRecord,
  OTUnitSupersessionBoundaryRecord,
  OTUnitRevisionLifecycleProjection,
} from "./otunit-revision-chain-boundary";

import type {
  AppendOTUnitRevisionRepositoryRecordResult,
  OTUnitRevisionRepositoryRecordEnvelope,
} from "./otunit-revision-repository-contract";

import {
  createInMemoryOTUnitRevisionRepository,
  IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND,
} from "./otunit-revision-in-memory-repository";

import { projectOTUnitRevisionRepositoryReadProjection } from "./otunit-revision-repository-read-projection";

import type { OTUnitRevisionRepositoryReadProjection } from "./otunit-revision-repository-read-projection";

// ── Harness Kind ─────────────────────────────────────────────────────────────

export const OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND =
  "otunit_revision_repository_dogfood_harness" as const;

// ── Input ────────────────────────────────────────────────────────────────────

export interface RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  id: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  revisionIntent: OTUnitRevisionIntentSnapshot;
  proposedPatch: OTUnitRevisionPreviewPatch;
  createdAt?: string;
}

// ── Record Set ───────────────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryDogfoodHarnessRecordSet {
  revisionIntentRecord: OTUnitRevisionRepositoryRecordEnvelope;
  revisionPreviewRecord: OTUnitRevisionRepositoryRecordEnvelope;
  proposedBoundaryRecord: OTUnitRevisionRepositoryRecordEnvelope;
  decisionBoundaryRecord: OTUnitRevisionRepositoryRecordEnvelope;
  supersessionBoundaryRecord: OTUnitRevisionRepositoryRecordEnvelope;
  lifecycleProjectionRecord: OTUnitRevisionRepositoryRecordEnvelope;
}

// ── Result ───────────────────────────────────────────────────────────────────

export interface OTUnitRevisionRepositoryDogfoodHarnessResult {
  id: string;
  kind: typeof OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND;
  repositoryKind: typeof IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND;
  preview: OTUnitRevisionPreview;
  proposedBoundary: ProposedRevisedOTUnitBoundaryRecord;
  decisionBoundary: ProposedRevisedOTUnitDecisionBoundaryRecord;
  supersessionBoundary: OTUnitSupersessionBoundaryRecord;
  lifecycleProjection: OTUnitRevisionLifecycleProjection;
  records: OTUnitRevisionRepositoryDogfoodHarnessRecordSet;
  appendResults: readonly AppendOTUnitRevisionRepositoryRecordResult[];
  readProjection: OTUnitRevisionRepositoryReadProjection;
  sourceSnapshotAfterDogfood: SourceOTUnitSnapshot;
  runtimeMutationAllowed: false;
  repositoryPersistenceAllowed: false;
  filesystemPersistenceAllowed: false;
  databasePersistenceAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createRepositoryRecordEnvelope(input: {
  id: string;
  kind: OTUnitRevisionRepositoryRecordEnvelope["kind"];
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  payload: OTUnitRevisionRepositoryRecordEnvelope["payload"];
  createdAt?: string;
}): OTUnitRevisionRepositoryRecordEnvelope {
  return {
    id: input.id,
    kind: input.kind,
    sourceOTUnitId: input.sourceOTUnitId,
    revisionIntentRecordId: input.revisionIntentRecordId,
    payload: input.payload,
    appendOnly: true,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}

// ── Harness Function ─────────────────────────────────────────────────────────

export async function runOTUnitRevisionRepositoryDogfoodHarness(
  input: RunOTUnitRevisionRepositoryDogfoodHarnessInput,
): Promise<OTUnitRevisionRepositoryDogfoodHarnessResult> {
  const repository = createInMemoryOTUnitRevisionRepository();

  // Step 1: Build revision preview from intent
  const preview: OTUnitRevisionPreview = {
    id: `${input.id}-revision-preview`,
    source: {
      otunitId: input.sourceSnapshot.id,
      revisionIntentRecordId: input.revisionIntent.id,
      reasonText: input.revisionIntent.reasonText,
      directionText: input.revisionIntent.directionText,
      evidenceRefs: input.revisionIntent.evidenceRefs,
    },
    proposedPatch: input.proposedPatch,
    previewSummary: "Dogfood revision preview.",
    status: "requires_confirmation",
    requiresConfirmation: true,
    runtimeMutationAllowed: false,
    sourceOTUnitMutationAllowed: false,
    newOTUnitCreated: false,
    createdAt: input.createdAt,
  };

  // Step 2: User confirms revision preview
  const previewDecision: OTUnitRevisionPreviewDecision = {
    previewId: preview.id,
    status: "confirmed",
    decidedBy: "user",
    reason: "Dogfood confirmed revision preview.",
    createdAt: input.createdAt,
  };

  // Step 3: Create proposed revised OTUnit from confirmed preview
  const proposedBoundary = createProposedRevisedOTUnitFromConfirmedPreview({
    id: `${input.id}-proposed-boundary`,
    proposedOTUnitId: `${input.sourceSnapshot.id}-revision-dogfood`,
    sourceSnapshot: input.sourceSnapshot,
    preview,
    decision: previewDecision,
    createdAt: input.createdAt,
  });

  // Step 4: Decide proposed revised OTUnit
  const decisionBoundary = decideProposedRevisedOTUnit({
    id: `${input.id}-decision-boundary`,
    proposed: proposedBoundary.proposed,
    decision: {
      id: `${input.id}-proposed-decision`,
      proposedOTUnitId: proposedBoundary.proposed.id,
      status: "accepted",
      decidedBy: "user",
      reason: "Dogfood accepted proposed revised OTUnit.",
      createdAt: input.createdAt,
    },
    createdAt: input.createdAt,
  });

  // Step 5: Declare supersession from accepted decision
  const supersessionBoundary = declareOTUnitSupersessionFromAcceptedDecision({
    id: `${input.id}-supersession-boundary`,
    decisionBoundaryRecord: decisionBoundary,
    createdAt: input.createdAt,
  });

  // Step 6: Project lifecycle
  const lifecycleProjection = projectOTUnitRevisionLifecycle({
    id: `${input.id}-lifecycle-projection`,
    revisionIntent: input.revisionIntent,
    preview,
    proposedBoundary,
    decisionBoundary,
    supersessionBoundary,
    createdAt: input.createdAt,
  });

  // Step 7: Create repository records
  const sourceOTUnitId = input.sourceSnapshot.id;
  const revisionIntentRecordId = input.revisionIntent.id;

  const records: OTUnitRevisionRepositoryDogfoodHarnessRecordSet = {
    revisionIntentRecord: createRepositoryRecordEnvelope({
      id: `${input.id}-record-revision-intent`,
      kind: "revision_intent_snapshot",
      sourceOTUnitId,
      revisionIntentRecordId,
      payload: input.revisionIntent,
      createdAt: input.createdAt,
    }),
    revisionPreviewRecord: createRepositoryRecordEnvelope({
      id: `${input.id}-record-revision-preview`,
      kind: "revision_preview",
      sourceOTUnitId,
      revisionIntentRecordId,
      payload: preview,
      createdAt: input.createdAt,
    }),
    proposedBoundaryRecord: createRepositoryRecordEnvelope({
      id: `${input.id}-record-proposed-boundary`,
      kind: "proposed_revised_otunit_boundary",
      sourceOTUnitId,
      revisionIntentRecordId,
      payload: proposedBoundary,
      createdAt: input.createdAt,
    }),
    decisionBoundaryRecord: createRepositoryRecordEnvelope({
      id: `${input.id}-record-decision-boundary`,
      kind: "proposed_revised_otunit_decision_boundary",
      sourceOTUnitId,
      revisionIntentRecordId,
      payload: decisionBoundary,
      createdAt: input.createdAt,
    }),
    supersessionBoundaryRecord: createRepositoryRecordEnvelope({
      id: `${input.id}-record-supersession-boundary`,
      kind: "supersession_boundary",
      sourceOTUnitId,
      revisionIntentRecordId,
      payload: supersessionBoundary,
      createdAt: input.createdAt,
    }),
    lifecycleProjectionRecord: createRepositoryRecordEnvelope({
      id: `${input.id}-record-lifecycle-projection`,
      kind: "lifecycle_projection",
      sourceOTUnitId,
      revisionIntentRecordId,
      payload: lifecycleProjection,
      createdAt: input.createdAt,
    }),
  };

  // Step 8: Append all records in order
  const orderedRecords = [
    records.revisionIntentRecord,
    records.revisionPreviewRecord,
    records.proposedBoundaryRecord,
    records.decisionBoundaryRecord,
    records.supersessionBoundaryRecord,
    records.lifecycleProjectionRecord,
  ];

  const appendResults: AppendOTUnitRevisionRepositoryRecordResult[] = [];

  for (const record of orderedRecords) {
    appendResults.push(await repository.appendRevisionRecord({ record }));
  }

  // Step 9: List records from repository
  const listed = await repository.listRevisionRecords({
    sourceOTUnitId,
    revisionIntentRecordId,
  });

  // Step 10: Build read projection
  const readProjection = projectOTUnitRevisionRepositoryReadProjection({
    id: `${input.id}-repository-read-projection`,
    sourceOTUnitId,
    revisionIntentRecordId,
    records: listed.records,
    createdAt: input.createdAt,
  });

  // Step 11: Return complete result with safety assertions
  return {
    id: input.id,
    kind: OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND,
    repositoryKind: repository.kind,
    preview,
    proposedBoundary,
    decisionBoundary,
    supersessionBoundary,
    lifecycleProjection,
    records,
    appendResults,
    readProjection,
    sourceSnapshotAfterDogfood: input.sourceSnapshot,
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    filesystemPersistenceAllowed: false,
    databasePersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
  };
}
