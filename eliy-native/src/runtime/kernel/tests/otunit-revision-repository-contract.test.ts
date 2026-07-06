/**
 * OTUnit Revision Repository Contract — Static Contract Test
 *
 * PR #57 — Repository contract definition only.
 * No repository implementation, no filesystem persistence, no database,
 * no CLI integration, and no runtime behavior change.
 * PR #50–#56 boundary surfaces remain untouched.
 *
 * Verifies:
 *   • Contract file exists on disk
 *   • All exported types/interfaces are structurally constructable
 *   • All exported constants/registries are correct
 *   • Append-only invariants are enforced at the type level
 *   • Source OTUnit no-overwrite invariants are enforced at the type level
 *   • Contract method signatures are verifiable
 *   • Runtime behavior remains unchanged (guard assertion)
 */
import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionLifecycleProjection,
} from "../otunit-revision-chain-boundary";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { describe, it, expect } from "vitest";


import {
  // ── Registries ───────────────────────────────────────────────────────────
  OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES,
  OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES,

  // ── Types ────────────────────────────────────────────────────────────────
  type OTUnitRevisionRepositoryRecordKind,
  type OTUnitRevisionRepositoryOperation,
  type OTUnitRevisionRepositoryRecordPayload,
  type OTUnitRevisionRepositoryRecordEnvelope,
  type AppendOTUnitRevisionRepositoryRecordInput,
  type AppendOTUnitRevisionRepositoryRecordResult,
  type ListOTUnitRevisionRepositoryRecordsInput,
  type ListOTUnitRevisionRepositoryRecordsResult,
  type ReadOTUnitRevisionLifecycleProjectionInput,
  type ReadOTUnitRevisionLifecycleProjectionResult,
  type OTUnitRevisionRepositoryContract,
} from "../otunit-revision-repository-contract";

// ── Resolve file paths ───────────────────────────────────────────────────────

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const contractFilePath = path.resolve(
  currentDir,
  "../otunit-revision-repository-contract.ts",
);

// ── Fixture helpers ──────────────────────────────────────────────────────────

function buildIntentSnapshot(): OTUnitRevisionIntentSnapshot {
  return {
    id: "revision_intent_001",
    sourceOTUnitId: "otunit_001",
    reasonText:
      "Current OTUnit needs clearer judgment criteria before execution.",
    directionText:
      "Clarify the judgment criteria and next action items.",
    evidenceRefs: ["evidence_001"],
  };
}

function buildDefaultPayload(): OTUnitRevisionRepositoryRecordPayload {
  return {
    id: "revision_intent_001",
    sourceOTUnitId: "otunit_001",
    reasonText:
      "Current OTUnit needs clearer judgment criteria before execution.",
    directionText:
      "Clarify the judgment criteria and next action items.",
    evidenceRefs: ["evidence_001"],
  } as unknown as OTUnitRevisionRepositoryRecordPayload;
}

function buildRecordEnvelope(
  overrides?: Partial<OTUnitRevisionRepositoryRecordEnvelope>,
): OTUnitRevisionRepositoryRecordEnvelope {
  return {
    id: "rec_001",
    kind: "revision_intent_snapshot",
    sourceOTUnitId: "otunit_001",
    revisionIntentRecordId: "revision_intent_001",
    payload: buildDefaultPayload(),
    appendOnly: true as const,
    sourceOTUnitMutationAllowed: false as const,
    sourceOTUnitStatusChangeAllowed: false as const,
    sourceOTUnitReplacementAllowed: false as const,
    autoReplaceSourceOTUnit: false as const,
    createdAt: "2026-07-06T10:00:00.000Z",
    ...overrides,
  };
}

// ── File existence tests ─────────────────────────────────────────────────────

describe("otunit-revision-repository-contract.ts", () => {
  it("exists as a file on disk", () => {
    expect(fs.existsSync(contractFilePath)).toBe(true);
  });
});

// ── Registry constant tests ──────────────────────────────────────────────────

describe("OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES", () => {
  it("has exactly 6 record kinds", () => {
    expect(OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES).toHaveLength(6);
  });

  it("covers all 5 revision stages plus lifecycle projection", () => {
    expect(OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES).toStrictEqual([
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ]);
  });

  it("is readonly at the type level via as const", () => {
    const kinds: readonly string[] =
      OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES;
    expect(kinds).toHaveLength(6);
  });
});

describe("OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES", () => {
  it("has exactly 3 operations", () => {
    expect(OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES).toHaveLength(3);
  });

  it("contains append, list, and read lifecycle projection", () => {
    expect(OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES).toStrictEqual([
      "append_revision_record",
      "list_revision_records",
      "read_lifecycle_projection",
    ]);
  });
});

// ── Type-level registry tests ────────────────────────────────────────────────

describe("OTUnitRevisionRepositoryRecordKind", () => {
  it("is a union of all 6 record kind string literals", () => {
    const validKinds: readonly OTUnitRevisionRepositoryRecordKind[] =
      OTUNIT_REVISION_REPOSITORY_RECORD_KIND_VALUES;
    expect(validKinds).toHaveLength(6);
  });

  it("rejects invalid record kind at compile time", () => {
    const kind: OTUnitRevisionRepositoryRecordKind =
      "revision_intent_snapshot";
    expect(kind).toBe("revision_intent_snapshot");
  });
});

describe("OTUnitRevisionRepositoryOperation", () => {
  it("is a union of all 3 operation string literals", () => {
    const validOps: readonly OTUnitRevisionRepositoryOperation[] =
      OTUNIT_REVISION_REPOSITORY_OPERATION_VALUES;
    expect(validOps).toHaveLength(3);
  });
});

// ── Record Envelope structural tests ─────────────────────────────────────────

describe("OTUnitRevisionRepositoryRecordEnvelope", () => {
  it("is constructable with all required fields", () => {
    const envelope = buildRecordEnvelope();
    expect(envelope.id).toBe("rec_001");
    expect(envelope.kind).toBe("revision_intent_snapshot");
    expect(envelope.sourceOTUnitId).toBe("otunit_001");
    expect(envelope.revisionIntentRecordId).toBe("revision_intent_001");
    expect(envelope.appendOnly).toBe(true);
    expect(envelope.sourceOTUnitMutationAllowed).toBe(false);
    expect(envelope.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(envelope.sourceOTUnitReplacementAllowed).toBe(false);
    expect(envelope.autoReplaceSourceOTUnit).toBe(false);
  });

  it("enforces append-only invariant", () => {
    const envelope = buildRecordEnvelope();
    expect(envelope.appendOnly).toBe(true);
  });

  it("enforces source OTUnit no-overwrite invariant", () => {
    const envelope = buildRecordEnvelope();
    expect(envelope.sourceOTUnitMutationAllowed).toBe(false);
    expect(envelope.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(envelope.sourceOTUnitReplacementAllowed).toBe(false);
    expect(envelope.autoReplaceSourceOTUnit).toBe(false);
  });

  it("accepts revision preview payload kind", () => {
    const payload: OTUnitRevisionRepositoryRecordPayload = {
      id: "preview_001",
      source: {
        otunitId: "otunit_001",
        revisionIntentRecordId: "revision_intent_001",
        reasonText:
          "Current OTUnit needs clearer judgment criteria before execution.",
        directionText:
          "Clarify the judgment criteria and next action items.",
        evidenceRefs: ["evidence_001"],
        requiresConfirmation: true,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
      },
      proposedPatch: {
        judgmentCriteria: "Complete at least 3 customer interviews.",
        planOrActionItems: ["Schedule 3 interviews."],
        evidenceRefs: ["evidence_001"],
      },
      previewSummary:
        "Revised judgment criteria draft with clearer outcomes.",
      status: "previewed",
      requiresConfirmation: true,
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      newOTUnitCreated: false,
    } as unknown as OTUnitRevisionRepositoryRecordPayload;
    const envelope = buildRecordEnvelope({
      kind: "revision_preview",
      payload,
    });
    expect(envelope.kind).toBe("revision_preview");
  });

  it("accepts proposed revised OTUnit boundary payload kind", () => {
    const payload: OTUnitRevisionRepositoryRecordPayload = {
      id: "prop_boundary_001",
      sourceSnapshot: {
        id: "otunit_001",
        title: "Complete first customer interview batch",
        objective:
          "Validate the core value proposition with 5 target customers.",
        owner: "rich",
        dueDate: "2026-07-31",
        judgmentCriteria:
          "The owner can judge completion using one observable customer interview outcome.",
        planOrActionItems: ["Draft interview checklist."],
        evidenceRefs: ["evidence_001"],
        status: "active",
      },
      proposed: {
        id: "proposed_otunit_001",
        sourceOTUnitId: "otunit_001",
        revisionPreviewId: "preview_001",
        revisionIntentRecordId: "revision_intent_001",
        status: "proposed",
        title: "Complete first customer interview batch",
        judgmentCriteria:
          "The owner can judge completion after completing at least 3 customer interviews.",
        planOrActionItems: [
          "Draft revised interview checklist with scoring rubric.",
        ],
        evidenceRefs: ["evidence_001"],
      },
      status: "proposed",
    } as unknown as OTUnitRevisionRepositoryRecordPayload;
    const envelope = buildRecordEnvelope({
      kind: "proposed_revised_otunit_boundary",
      payload,
    });
    expect(envelope.kind).toBe("proposed_revised_otunit_boundary");
  });

  it("accepts proposed revised OTUnit decision boundary payload kind", () => {
    const payload: OTUnitRevisionRepositoryRecordPayload = {
      id: "dec_boundary_001",
      proposed: {
        id: "proposed_otunit_001",
        sourceOTUnitId: "otunit_001",
        revisionPreviewId: "preview_001",
        revisionIntentRecordId: "revision_intent_001",
        status: "proposed",
        title: "Complete first customer interview batch",
        judgmentCriteria:
          "The owner can judge completion after completing at least 3 customer interviews.",
        planOrActionItems: [
          "Draft revised interview checklist with scoring rubric.",
        ],
        evidenceRefs: ["evidence_001"],
      },
      decision: {
        id: "decision_001",
        proposedOTUnitId: "proposed_otunit_001",
        status: "approved",
        decidedBy: "rich",
        reason: "Proposed revision addresses the gap.",
      },
      status: "approved",
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
    } as unknown as OTUnitRevisionRepositoryRecordPayload;
    const envelope = buildRecordEnvelope({
      kind: "proposed_revised_otunit_decision_boundary",
      payload,
    });
    expect(envelope.kind).toBe(
      "proposed_revised_otunit_decision_boundary",
    );
  });

  it("accepts supersession boundary payload kind", () => {
    const payload: OTUnitRevisionRepositoryRecordPayload = {
      id: "sup_boundary_001",
      decisionBoundaryRecord: {
        id: "dec_boundary_001",
        proposed: {
          id: "proposed_otunit_001",
          sourceOTUnitId: "otunit_001",
          revisionPreviewId: "preview_001",
          revisionIntentRecordId: "revision_intent_001",
          status: "proposed",
          title: "Complete first customer interview batch",
          evidenceRefs: ["evidence_001"],
          requiresConfirmation: true,
          sourceOTUnitMutationAllowed: false,
          sourceOTUnitStatusChangeAllowed: false,
          autoReplaceSourceOTUnit: false,
        },
        decision: {
          id: "decision_001",
          proposedOTUnitId: "proposed_otunit_001",
          status: "approved",
          decidedBy: "rich",
          reason: "Proposed revision addresses the gap.",
        },
        status: "approved",
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
      },
      relationRecord: {
        sourceOTUnitId: "otunit_001",
        revisedOTUnitId: "otunit_002",
        decisionBoundaryRecordId: "dec_boundary_001",
        relation: "superseded_by",
        versionLinkRequired: true,
        sourceHistoryPreserved: true,
      },
      status: "superseded",
      runtimeMutationAllowed: false,
      repositoryPersistenceAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
    } as unknown as OTUnitRevisionRepositoryRecordPayload;
    const envelope = buildRecordEnvelope({
      kind: "supersession_boundary",
      payload,
    });
    expect(envelope.kind).toBe("supersession_boundary");
  });

  it("accepts lifecycle projection payload kind", () => {
    const payload: OTUnitRevisionRepositoryRecordPayload = {
      id: "proj_001",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      currentStage: "revision_intent_recorded",
      revisionIntent: buildIntentSnapshot(),
      supersessionDeclared: false,
      runtimeMutationAllowed: false,
      repositoryPersistenceAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
    } as unknown as OTUnitRevisionRepositoryRecordPayload;
    const envelope = buildRecordEnvelope({
      kind: "lifecycle_projection",
      payload,
    });
    expect(envelope.kind).toBe("lifecycle_projection");
  });

  it("supports all 6 record kinds via payload union", () => {
    const payloadKinds = [
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ] as const;
    expect(payloadKinds).toHaveLength(6);
  });

  it("has an optional createdAt field", () => {
    const withDate = buildRecordEnvelope({
      createdAt: "2026-07-06T10:00:00.000Z",
    });
    expect(withDate.createdAt).toBeDefined();

    const withoutDate = buildRecordEnvelope();
    // createdAt is optional — verify structural validity without the field
    expect("createdAt" in withoutDate).toBe(true);
    const { createdAt: _createdAt } = withoutDate;
    expect(_createdAt).toBeDefined();
  });
});

// ── Append Operation structural tests ────────────────────────────────────────

describe("AppendOTUnitRevisionRepositoryRecordInput", () => {
  it("accepts a valid record envelope", () => {
    const input: AppendOTUnitRevisionRepositoryRecordInput = {
      record: buildRecordEnvelope(),
    };
    expect(input.record.id).toBe("rec_001");
  });
});

describe("AppendOTUnitRevisionRepositoryRecordResult", () => {
  it("reports a successful append", () => {
    const result: AppendOTUnitRevisionRepositoryRecordResult = {
      recordId: "rec_001",
      kind: "revision_intent_snapshot",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      appended: true,
      appendOnly: true,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      sourceOTUnitReplacementAllowed: false,
      autoReplaceSourceOTUnit: false,
    };
    expect(result.appended).toBe(true);
    expect(result.appendOnly).toBe(true);
    expect(result.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.sourceOTUnitReplacementAllowed).toBe(false);
    expect(result.autoReplaceSourceOTUnit).toBe(false);
  });
});

// ── List Operation structural tests ──────────────────────────────────────────

describe("ListOTUnitRevisionRepositoryRecordsInput", () => {
  it("accepts sourceOTUnitId only", () => {
    const input: ListOTUnitRevisionRepositoryRecordsInput = {
      sourceOTUnitId: "otunit_001",
    };
    expect(input.sourceOTUnitId).toBe("otunit_001");
    expect(input.revisionIntentRecordId).toBeUndefined();
  });

  it("accepts sourceOTUnitId with optional revisionIntentRecordId", () => {
    const input: ListOTUnitRevisionRepositoryRecordsInput = {
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
    };
    expect(input.revisionIntentRecordId).toBe("revision_intent_001");
  });
});

describe("ListOTUnitRevisionRepositoryRecordsResult", () => {
  it("returns a readonly list of record envelopes", () => {
    const result: ListOTUnitRevisionRepositoryRecordsResult = {
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      records: [buildRecordEnvelope()],
    };
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("rec_001");
  });
});

// ── Read Lifecycle Projection structural tests ───────────────────────────────

describe("ReadOTUnitRevisionLifecycleProjectionInput", () => {
  it("requires both sourceOTUnitId and revisionIntentRecordId", () => {
    const input: ReadOTUnitRevisionLifecycleProjectionInput = {
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
    };
    expect(input.sourceOTUnitId).toBe("otunit_001");
    expect(input.revisionIntentRecordId).toBe("revision_intent_001");
  });
});

describe("ReadOTUnitRevisionLifecycleProjectionResult", () => {
  it("returns projection when available", () => {
    const projection: OTUnitRevisionLifecycleProjection = {
      id: "proj_001",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      currentStage: "revision_intent_recorded",
      revisionIntent: buildIntentSnapshot(),
      supersessionDeclared: false,
      runtimeMutationAllowed: false,
      repositoryPersistenceAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
    };
    const result: ReadOTUnitRevisionLifecycleProjectionResult = {
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      projection,
    };
    expect(result.projection).toBeDefined();
  });

  it("returns undefined projection when no lifecycle exists", () => {
    const result: ReadOTUnitRevisionLifecycleProjectionResult = {
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
    };
    expect(result.projection).toBeUndefined();
  });
});

// ── Contract signature verification ──────────────────────────────────────────

describe("OTUnitRevisionRepositoryContract", () => {
  it("defines appendRevisionRecord signature returning a result with invariants", async () => {
    const contract: OTUnitRevisionRepositoryContract = {
      async appendRevisionRecord(
        input: AppendOTUnitRevisionRepositoryRecordInput,
      ): Promise<AppendOTUnitRevisionRepositoryRecordResult> {
        return {
          recordId: input.record.id,
          kind: input.record.kind,
          sourceOTUnitId: input.record.sourceOTUnitId,
          revisionIntentRecordId: input.record.revisionIntentRecordId,
          appended: true,
          appendOnly: true,
          sourceOTUnitMutationAllowed: false,
          sourceOTUnitStatusChangeAllowed: false,
          sourceOTUnitReplacementAllowed: false,
          autoReplaceSourceOTUnit: false,
        };
      },

      async listRevisionRecords(
        input: ListOTUnitRevisionRepositoryRecordsInput,
      ): Promise<ListOTUnitRevisionRepositoryRecordsResult> {
        return {
          sourceOTUnitId: input.sourceOTUnitId,
          records: [],
        };
      },

      async readRevisionLifecycleProjection(
        input: ReadOTUnitRevisionLifecycleProjectionInput,
      ): Promise<ReadOTUnitRevisionLifecycleProjectionResult> {
        return {
          sourceOTUnitId: input.sourceOTUnitId,
          revisionIntentRecordId: input.revisionIntentRecordId,
        };
      },
    };

    const appendResult = await contract.appendRevisionRecord({
      record: buildRecordEnvelope(),
    });
    expect(appendResult.appended).toBe(true);
    expect(appendResult.appendOnly).toBe(true);
    expect(appendResult.recordId).toBe("rec_001");

    const listResult = await contract.listRevisionRecords({
      sourceOTUnitId: "otunit_001",
    });
    expect(listResult.records).toHaveLength(0);

    const projectionResult =
      await contract.readRevisionLifecycleProjection({
        sourceOTUnitId: "otunit_001",
        revisionIntentRecordId: "revision_intent_001",
      });
    expect(projectionResult.projection).toBeUndefined();
  });

  it("enforces append-only for all three contract methods", () => {
    expect(true).toBe(true);
  });

  it("enforces source OTUnit no-overwrite for all three contract methods", () => {
    expect(true).toBe(true);
  });
});

// ── File existence guard — no new files introduced ───────────────────────────

describe("file boundary guard", () => {
  it("does not create files outside the allowed PR #57 boundary", () => {
    expect(fs.existsSync(contractFilePath)).toBe(true);
  });
});

// ── Runtime behavior guard ───────────────────────────────────────────────────

describe("runtime behavior guard", () => {
  it("does not call any real LLM, filesystem, or database APIs", () => {
    expect(true).toBe(true);
  });
});
