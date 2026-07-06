import { describe, expect, it } from "vitest";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import {
  createInMemoryOTUnitRevisionRepository,
  IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND,
} from "../otunit-revision-in-memory-repository";

import type {
  OTUnitRevisionRepositoryContract,
  OTUnitRevisionRepositoryRecordEnvelope,
} from "../otunit-revision-repository-contract";

import type {
  OTUnitRevisionLifecycleProjection,
  OTUnitRevisionPreview,
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

// ── Test Suite ───────────────────────────────────────────────────────────────

describe("InMemoryOTUnitRevisionRepository", () => {
  // ── Adapter File Existence ──────────────────────────────────────────────

  it("adapter source file exists at the expected path", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const adapterPath = path.resolve(
      currentDir,
      "../otunit-revision-in-memory-repository.ts",
    );
    expect(fs.existsSync(adapterPath)).toBe(true);
  });

  // ── Exports / Adapter Shape ─────────────────────────────────────────────

  it("exports IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND", () => {
    expect(IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND).toBe(
      "in_memory_otunit_revision_repository",
    );
  });

  it("exports createInMemoryOTUnitRevisionRepository as a function", () => {
    expect(typeof createInMemoryOTUnitRevisionRepository).toBe("function");
  });

  it("repository kind equals the expected constant value", () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    expect(repo.kind).toBe("in_memory_otunit_revision_repository");
  });

  it("adapter implements all required contract methods", () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    expect(typeof repo.appendRevisionRecord).toBe("function");
    expect(typeof repo.listRevisionRecords).toBe("function");
    expect(typeof repo.readRevisionLifecycleProjection).toBe("function");
    expect(typeof repo.snapshot).toBe("function");
  });

  it("satisfies the OTUnitRevisionRepositoryContract interface", () => {
    const repo: OTUnitRevisionRepositoryContract =
      createInMemoryOTUnitRevisionRepository();
    expect(typeof repo.appendRevisionRecord).toBe("function");
    expect(typeof repo.listRevisionRecords).toBe("function");
    expect(typeof repo.readRevisionLifecycleProjection).toBe("function");
  });

  // ── Default State ───────────────────────────────────────────────────────

  it("starts empty by default", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    const snap = repo.snapshot();
    expect(snap.records).toHaveLength(0);
  });

  it("exposes the expected kind constant from repo instance", () => {
    const repo = createInMemoryOTUnitRevisionRepository();
    expect(repo.kind).toBe(IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND);
  });

  // ── Append Revision Intent Record ───────────────────────────────────────

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

  // ── Append Revision Preview Record ──────────────────────────────────────

  it("appends a revision preview record and preserves all envelope fields", async () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    const preview: OTUnitRevisionPreview = {
      id: "revision_preview_001",
      source: {
        otunitId: "otunit_001",
        revisionIntentRecordId: "revision_intent_001",
        reasonText: "Needs clearer judgment criteria.",
        directionText: "Clarify judgment criteria before execution.",
        evidenceRefs: ["evidence_001"],
      },
      proposedPatch: {
        judgmentCriteria: "Completion can be judged by one observable outcome.",
      },
      previewSummary: "Preview only. No source OTUnit mutation.",
      status: "requires_confirmation",
      requiresConfirmation: true,
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      newOTUnitCreated: false,
    };

    const record: OTUnitRevisionRepositoryRecordEnvelope = {
      id: "rp-001",
      kind: "revision_preview",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      payload: preview,
      appendOnly: true,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      sourceOTUnitReplacementAllowed: false,
      autoReplaceSourceOTUnit: false,
    };

    const result = await repo.appendRevisionRecord({ record });

    expect(result.recordId).toBe("rp-001");
    expect(result.kind).toBe("revision_preview");
    expect(result.sourceOTUnitId).toBe("otunit_001");
    expect(result.revisionIntentRecordId).toBe("revision_intent_001");
    expect(result.appended).toBe(true);
    expect(result.appendOnly).toBe(true);
    expect(result.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.sourceOTUnitReplacementAllowed).toBe(false);
    expect(result.autoReplaceSourceOTUnit).toBe(false);

    // Verify the record can be listed back
    const listResult = await repo.listRevisionRecords({
      sourceOTUnitId: "otunit_001",
    });
    expect(listResult.records).toHaveLength(1);
    expect(listResult.records[0].kind).toBe("revision_preview");
  });

  // ── List Records ────────────────────────────────────────────────────────

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

  // ── Lifecycle Projection ────────────────────────────────────────────────

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

  // ── Snapshot ────────────────────────────────────────────────────────────

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

  it("snapshot does not expose update / delete methods", () => {
    const repo = createInMemoryOTUnitRevisionRepository();

    expect("updateRevisionRecord" in repo).toBe(false);
    expect("deleteRevisionRecord" in repo).toBe(false);
    expect("replaceRevisionRecord" in repo).toBe(false);
    expect("clearRevisionRecords" in repo).toBe(false);
  });

  // ── Initial Records ─────────────────────────────────────────────────────

  it("accepts initial records via factory input", async () => {
    const initialRecord = makeRevisionIntentRecord({ id: "ri-init", revisionIntentRecordId: "ri-init" });

    const repo = createInMemoryOTUnitRevisionRepository({
      initialRecords: [initialRecord],
    });

    const snap = repo.snapshot();
    expect(snap.records).toHaveLength(1);
    expect(snap.records[0].id).toBe("ri-init");
  });

  // ── Append Order ────────────────────────────────────────────────────────

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

  // ── Guard: Append-Only Assertions ───────────────────────────────────────

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

  // ── Production Adapter Forbidden Source Text ────────────────────────────

  it("production adapter source does not contain forbidden persistence / DB / CLI / provider strings", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const adapterPath = path.resolve(
      currentDir,
      "../otunit-revision-in-memory-repository.ts",
    );
    const source = fs.readFileSync(adapterPath, "utf8");

    // Persistence imports
    expect(source).not.toMatch(/from\s+"fs"/);
    expect(source).not.toMatch(/from\s+'fs'/);
    expect(source).not.toMatch(/node:fs/);
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("appendFile");
    expect(source).not.toContain("readFile");

    // Database strings
    expect(source).not.toContain("sqlite");
    expect(source).not.toContain("postgres");
    expect(source).not.toContain("prisma");

    // CLI strings
    expect(source).not.toContain("commander");
    expect(source).not.toContain("inquirer");

    // Provider strings
    expect(source).not.toContain("openai");
    expect(source).not.toContain("deepseek");

    // Patch residue
    expect(source).not.toContain("*** End of File");
  });
});
