import { describe, expect, it } from "vitest";

import {
  createInMemoryOTUnitRevisionRepository,
  IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND,
} from "../otunit-revision-in-memory-repository";

import type {
  OTUnitRevisionRepositoryRecordEnvelope,
} from "../otunit-revision-repository-contract";

import type {
  OTUnitRevisionLifecycleProjection,
} from "../otunit-revision-chain-boundary";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRevisionIntentRecord(
  overrides?: Partial<OTUnitRevisionRepositoryRecordEnvelope>,
): OTUnitRevisionRepositoryRecordEnvelope {
  return {
    id: "ri-1",
    kind: "revision_intent_snapshot",
    sourceOTUnitId: "otunit-1",
    revisionIntentRecordId: "ri-1",
    payload: {
      id: "ri-1",
      sourceOTUnitId: "otunit-1",
      reasonText: "Need tighter scope",
      directionText: "Reduce scope to core constraint",
      evidenceRefs: ["ev-1"],
    },
    appendOnly: true,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    ...overrides,
  };
}

function makeLifecycleProjectionRecord(
  sourceOTUnitId: string,
  revisionIntentRecordId: string,
  overrides?: Partial<OTUnitRevisionRepositoryRecordEnvelope>,
): OTUnitRevisionRepositoryRecordEnvelope {
  const projection: OTUnitRevisionLifecycleProjection = {
    id: `projection-${revisionIntentRecordId}`,
    sourceOTUnitId,
    revisionIntentRecordId,
    currentStage: "revision_intent_recorded",
    revisionIntent: {
      id: revisionIntentRecordId,
      sourceOTUnitId,
      reasonText: "Need tighter scope",
      directionText: "Reduce scope to core constraint",
      evidenceRefs: ["ev-1"],
    },
    supersessionDeclared: false,
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
  };

  return {
    id: `lp-${revisionIntentRecordId}`,
    kind: "lifecycle_projection",
    sourceOTUnitId,
    revisionIntentRecordId,
    payload: projection,
    appendOnly: true,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("InMemoryOTUnitRevisionRepository", () => {
  it("starts empty by default", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const snap = repo.snapshot();
    expect(snap.records).toHaveLength(0);
  });

  it("exposes the expected kind constant", () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    expect(repo.kind).toBe(IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND);
  });

  it("appends a revision intent record and returns the expected result", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const record = makeRevisionIntentRecord();

    const result = await repo.appendRevisionRecord({ record });

    expect(result.recordId).toBe("ri-1");
    expect(result.kind).toBe("revision_intent_snapshot");
    expect(result.sourceOTUnitId).toBe("otunit-1");
    expect(result.revisionIntentRecordId).toBe("ri-1");
    expect(result.appended).toBe(true);
    expect(result.appendOnly).toBe(true);
    expect(result.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.sourceOTUnitReplacementAllowed).toBe(false);
    expect(result.autoReplaceSourceOTUnit).toBe(false);
  });

  it("lists revision records by sourceOTUnitId", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-1", revisionIntentRecordId: "ri-1" }),
    });
    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({
        id: "ri-2",
        sourceOTUnitId: "otunit-2",
        revisionIntentRecordId: "ri-2",
      }),
    });

    const result = await repo.listRevisionRecords({ sourceOTUnitId: "otunit-1" });
    expect(result.sourceOTUnitId).toBe("otunit-1");
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("ri-1");
  });

  it("lists revision records filtered by revisionIntentRecordId", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-1", revisionIntentRecordId: "ri-1" }),
    });
    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({
        id: "ri-2",
        revisionIntentRecordId: "ri-2",
      }),
    });

    const result = await repo.listRevisionRecords({
      sourceOTUnitId: "otunit-1",
      revisionIntentRecordId: "ri-1",
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("ri-1");
    expect(result.records[0].revisionIntentRecordId).toBe("ri-1");
  });

  it("returns an empty list when no records match sourceOTUnitId", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-1", revisionIntentRecordId: "ri-1" }),
    });

    const result = await repo.listRevisionRecords({ sourceOTUnitId: "otunit-999" });
    expect(result.records).toHaveLength(0);
  });

  it("reads the latest lifecycle projection for a given sourceOTUnitId and revisionIntentRecordId", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    const lpRecord = makeLifecycleProjectionRecord("otunit-1", "ri-1");
    await repo.appendRevisionRecord({ record: lpRecord });

    const result = await repo.readRevisionLifecycleProjection({
      sourceOTUnitId: "otunit-1",
      revisionIntentRecordId: "ri-1",
    });

    expect(result.sourceOTUnitId).toBe("otunit-1");
    expect(result.revisionIntentRecordId).toBe("ri-1");
    expect(result.projection).toBeDefined();
    expect(result.projection!.id).toBe("projection-ri-1");
    expect(result.projection!.currentStage).toBe("revision_intent_recorded");
  });

  it("returns undefined projection when no lifecycle_projection record exists", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    const result = await repo.readRevisionLifecycleProjection({
      sourceOTUnitId: "otunit-1",
      revisionIntentRecordId: "ri-1",
    });

    expect(result.projection).toBeUndefined();
  });

  it("reads the most recent lifecycle projection when multiple exist", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    const earlyProjection: OTUnitRevisionLifecycleProjection = {
      id: "projection-ri-1-v1",
      sourceOTUnitId: "otunit-1",
      revisionIntentRecordId: "ri-1",
      currentStage: "revision_intent_recorded",
      revisionIntent: {
        id: "ri-1",
        sourceOTUnitId: "otunit-1",
        reasonText: "Need tighter scope",
        directionText: "Reduce scope",
        evidenceRefs: ["ev-1"],
      },
      supersessionDeclared: false,
      runtimeMutationAllowed: false,
      repositoryPersistenceAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
    };

    const lateProjection: OTUnitRevisionLifecycleProjection = {
      ...earlyProjection,
      id: "projection-ri-1-v2",
      currentStage: "supersession_declared",
      supersessionDeclared: true,
    };

    await repo.appendRevisionRecord({
      record: makeLifecycleProjectionRecord("otunit-1", "ri-1", {
        id: "lp-ri-1-v1",
        payload: earlyProjection,
      }),
    });

    await repo.appendRevisionRecord({
      record: makeLifecycleProjectionRecord("otunit-1", "ri-1", {
        id: "lp-ri-1-v2",
        payload: lateProjection,
      }),
    });

    const result = await repo.readRevisionLifecycleProjection({
      sourceOTUnitId: "otunit-1",
      revisionIntentRecordId: "ri-1",
    });

    expect(result.projection).toBeDefined();
    expect(result.projection!.id).toBe("projection-ri-1-v2");
    expect(result.projection!.currentStage).toBe("supersession_declared");
    expect(result.projection!.supersessionDeclared).toBe(true);
  });

  it("snapshot captures the current state without exposing internal mutation", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-1", revisionIntentRecordId: "ri-1" }),
    });

    const snap = repo.snapshot();
    expect(snap.records).toHaveLength(1);
    expect(snap.records[0].id).toBe("ri-1");

    // Snapshot should be a copy — mutating the snapshot should not affect the repo
    (snap as { records: OTUnitRevisionRepositoryRecordEnvelope[] }).records.pop();
    expect(snap.records).toHaveLength(0);

    const subsequentSnap = repo.snapshot();
    expect(subsequentSnap.records).toHaveLength(1);
  });

  it("accepts initial records via factory input", async () => {
    const initialRecord = makeRevisionIntentRecord({ id: "ri-init", revisionIntentRecordId: "ri-init" });

    const repo = createInMemoryOTUnitRevisionRepository({
      initialRecords: [initialRecord],
    });

    const snap = repo.snapshot();
    expect(snap.records).toHaveLength(1);
    expect(snap.records[0].id).toBe("ri-init");
  });

  it("rejects records with appendOnly !== true", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const badRecord = makeRevisionIntentRecord({ appendOnly: false as unknown as true });

    await expect(
      repo.appendRevisionRecord({ record: badRecord }),
    ).rejects.toThrow("OTUnit revision repository record must be append-only.");
  });

  it("rejects records with sourceOTUnitMutationAllowed !== false", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const badRecord = makeRevisionIntentRecord({
      sourceOTUnitMutationAllowed: true as unknown as false,
    });

    await expect(
      repo.appendRevisionRecord({ record: badRecord }),
    ).rejects.toThrow("OTUnit revision repository record cannot mutate source OTUnit.");
  });

  it("rejects records with sourceOTUnitStatusChangeAllowed !== false", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const badRecord = makeRevisionIntentRecord({
      sourceOTUnitStatusChangeAllowed: true as unknown as false,
    });

    await expect(
      repo.appendRevisionRecord({ record: badRecord }),
    ).rejects.toThrow("OTUnit revision repository record cannot change source OTUnit status.");
  });

  it("rejects records with sourceOTUnitReplacementAllowed !== false", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const badRecord = makeRevisionIntentRecord({
      sourceOTUnitReplacementAllowed: true as unknown as false,
    });

    await expect(
      repo.appendRevisionRecord({ record: badRecord }),
    ).rejects.toThrow("OTUnit revision repository record cannot replace source OTUnit.");
  });

  it("rejects records with autoReplaceSourceOTUnit !== false", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const badRecord = makeRevisionIntentRecord({
      autoReplaceSourceOTUnit: true as unknown as false,
    });

    await expect(
      repo.appendRevisionRecord({ record: badRecord }),
    ).rejects.toThrow("OTUnit revision repository record cannot auto-replace source OTUnit.");
  });

  it("rejects initial records that violate append-only constraints", () => {
    const badRecord = makeRevisionIntentRecord({ appendOnly: false as unknown as true });

    expect(() =>
      createInMemoryOTUnitRevisionRepository({ initialRecords: [badRecord] }),
    ).toThrow("OTUnit revision repository record must be append-only.");
  });

  it("maintains append order across multiple records", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-1", revisionIntentRecordId: "ri-1" }),
    });
    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-2", revisionIntentRecordId: "ri-2" }),
    });
    await repo.appendRevisionRecord({
      record: makeRevisionIntentRecord({ id: "ri-3", revisionIntentRecordId: "ri-3" }),
    });

    const snap = repo.snapshot();
    expect(snap.records.map((r) => r.id)).toEqual(["ri-1", "ri-2", "ri-3"]);
  });

  it("satisfies the OTUnitRevisionRepositoryContract interface", () => {
    const repo: OTUnitRevisionRepositoryContract =
      createInMemoryOTUnitRevisionRepository();
    expect(typeof repo.appendRevisionRecord).toBe("function");
    expect(typeof repo.listRevisionRecords).toBe("function");
    expect(typeof repo.readRevisionLifecycleProjection).toBe("function");
  });
});
