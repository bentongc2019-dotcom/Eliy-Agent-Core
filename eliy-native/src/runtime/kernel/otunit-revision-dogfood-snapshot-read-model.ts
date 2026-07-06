/**
 * OTUnit Revision Dogfood Snapshot Read Model Contract
 *
 * Pure read model projection that turns a dogfood snapshot into a
 * terminal-show-ready read model with structured sections, record steps,
 * and safety invariants.
 *
 * PR #62 — Read model only. No CLI, no filesystem, no database,
 * no provider / real LLM integration, no runtime behavior change,
 * and no source OTUnit mutation or replacement.
 *
 * This is a **pure projection** with zero side effects. The input snapshot
 * is read-only; no mutations are applied to any system.
 */

import type {
  OTUnitRevisionRepositoryDogfoodSnapshot,
} from "./otunit-revision-repository-dogfood-snapshot";

import type {
  OTUnitRevisionRepositoryRecordKind,
} from "./otunit-revision-repository-contract";

import type {
  OTUnitRevisionLifecycleStage,
} from "./otunit-revision-chain-boundary";

// ── Read Model Kind ─────────────────────────────────────────────────────────

export const OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND =
  "otunit_revision_dogfood_snapshot_read_model" as const;

// ── Sub-Types ───────────────────────────────────────────────────────────────

export interface OTUnitRevisionDogfoodSnapshotReadModelLine {
  label: string;
  value: string;
}

export interface OTUnitRevisionDogfoodSnapshotReadModelSection {
  title: string;
  lines: readonly OTUnitRevisionDogfoodSnapshotReadModelLine[];
}

export interface OTUnitRevisionDogfoodSnapshotReadModelRecordStep {
  index: number;
  kind: OTUnitRevisionRepositoryRecordKind;
  label: string;
}

// ── Read Model ──────────────────────────────────────────────────────────────

export interface OTUnitRevisionDogfoodSnapshotReadModel {
  id: string;
  kind: typeof OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND;
  snapshotId: string;
  title: "OTUnit Revision Dogfood Snapshot";
  summary: string;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  currentStage?: OTUnitRevisionLifecycleStage;
  decisionStatus?: "accepted" | "rejected";
  supersessionDeclared: boolean;
  appendCount: number;
  recordCount: number;
  recordSteps: readonly OTUnitRevisionDogfoodSnapshotReadModelRecordStep[];
  sections: readonly OTUnitRevisionDogfoodSnapshotReadModelSection[];
  terminalShowReady: true;
  plainTextOnly: true;
  ansiColorAllowed: false;
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

// ── Projection Input ────────────────────────────────────────────────────────

export interface ProjectOTUnitRevisionDogfoodSnapshotReadModelInput {
  id: string;
  snapshot: OTUnitRevisionRepositoryDogfoodSnapshot;
  createdAt?: string;
}

// ── Pure Projection Function ────────────────────────────────────────────────

export function projectOTUnitRevisionDogfoodSnapshotReadModel(
  input: ProjectOTUnitRevisionDogfoodSnapshotReadModelInput,
): OTUnitRevisionDogfoodSnapshotReadModel {
  const { snapshot } = input;

  if (snapshot.appendCount !== snapshot.recordCount) {
    throw new Error("Dogfood snapshot read model requires appendCount to equal recordCount.");
  }

  if (snapshot.recordKinds.length !== snapshot.recordCount) {
    throw new Error("Dogfood snapshot read model requires recordKinds length to equal recordCount.");
  }

  if (snapshot.readSnapshot.recordCount !== snapshot.recordCount) {
    throw new Error("Dogfood snapshot read model requires readSnapshot recordCount to match snapshot recordCount.");
  }

  if (snapshot.readSnapshot.chainCount !== 1) {
    throw new Error("Dogfood snapshot read model requires exactly one readSnapshot chain.");
  }

  if (snapshot.readSnapshot.currentStage !== snapshot.currentStage) {
    throw new Error("Dogfood snapshot read model requires readSnapshot currentStage to match snapshot currentStage.");
  }

  if (snapshot.readSnapshot.decisionStatus !== snapshot.decisionStatus) {
    throw new Error("Dogfood snapshot read model requires readSnapshot decisionStatus to match snapshot decisionStatus.");
  }

  if (snapshot.readSnapshot.supersessionDeclared !== snapshot.supersessionDeclared) {
    throw new Error("Dogfood snapshot read model requires readSnapshot supersessionDeclared to match snapshot supersessionDeclared.");
  }

  if (snapshot.supersessionSnapshot.relation !== "supersedes") {
    throw new Error("Dogfood snapshot read model requires supersession relation to be supersedes.");
  }

  if (snapshot.supersessionSnapshot.sourceOTUnitId !== snapshot.sourceOTUnitId) {
    throw new Error("Dogfood snapshot read model requires supersession source OTUnit to match snapshot source OTUnit.");
  }

  const recordSteps = snapshot.recordKinds.map((kind, index) => ({
    index: index + 1,
    kind,
    label: `${index + 1}. ${kind}`,
  }));

  const summary =
    `Revision chain ${snapshot.decisionStatus ?? "unknown"} at ${snapshot.currentStage ?? "unknown"}; ` +
    `records=${snapshot.recordCount}; supersessionDeclared=${String(snapshot.supersessionDeclared)}.`;

  return {
    id: input.id,
    kind: OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND,
    snapshotId: snapshot.id,
    title: "OTUnit Revision Dogfood Snapshot",
    summary,
    sourceOTUnitId: snapshot.sourceOTUnitId,
    revisionIntentRecordId: snapshot.revisionIntentRecordId,
    currentStage: snapshot.currentStage,
    decisionStatus: snapshot.decisionStatus,
    supersessionDeclared: snapshot.supersessionDeclared,
    appendCount: snapshot.appendCount,
    recordCount: snapshot.recordCount,
    recordSteps,
    sections: [
      {
        title: "Revision Chain",
        lines: [
          { label: "Source OTUnit", value: snapshot.sourceOTUnitId },
          { label: "Revision Intent", value: snapshot.revisionIntentRecordId },
          { label: "Current Stage", value: snapshot.currentStage ?? "unknown" },
          { label: "Decision Status", value: snapshot.decisionStatus ?? "unknown" },
          { label: "Supersession Declared", value: String(snapshot.supersessionDeclared) },
        ],
      },
      {
        title: "Repository Records",
        lines: [
          { label: "Append Count", value: String(snapshot.appendCount) },
          { label: "Record Count", value: String(snapshot.recordCount) },
          { label: "Record Kinds", value: snapshot.recordKinds.join(" → ") },
        ],
      },
      {
        title: "Supersession",
        lines: [
          { label: "Relation", value: snapshot.supersessionSnapshot.relation },
          { label: "Source OTUnit", value: snapshot.supersessionSnapshot.sourceOTUnitId },
          { label: "Revised OTUnit", value: snapshot.supersessionSnapshot.revisedOTUnitId },
          { label: "Version Link Required", value: String(snapshot.supersessionSnapshot.versionLinkRequired) },
          { label: "Source History Preserved", value: String(snapshot.supersessionSnapshot.sourceHistoryPreserved) },
        ],
      },
      {
        title: "Safety Invariants",
        lines: [
          { label: "Runtime Mutation Allowed", value: String(snapshot.runtimeMutationAllowed) },
          { label: "Repository Persistence Allowed", value: String(snapshot.repositoryPersistenceAllowed) },
          { label: "Filesystem Persistence Allowed", value: String(snapshot.filesystemPersistenceAllowed) },
          { label: "Database Persistence Allowed", value: String(snapshot.databasePersistenceAllowed) },
          { label: "Source OTUnit Mutation Allowed", value: String(snapshot.sourceOTUnitMutationAllowed) },
          { label: "Source OTUnit Status Change Allowed", value: String(snapshot.sourceOTUnitStatusChangeAllowed) },
          { label: "Source OTUnit Replacement Allowed", value: String(snapshot.sourceOTUnitReplacementAllowed) },
          { label: "Auto Replace Source OTUnit", value: String(snapshot.autoReplaceSourceOTUnit) },
        ],
      },
    ],
    terminalShowReady: true,
    plainTextOnly: true,
    ansiColorAllowed: false,
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
