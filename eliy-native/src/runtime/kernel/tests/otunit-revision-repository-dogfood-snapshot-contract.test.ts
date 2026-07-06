/**
 * OTUnit Revision Repository Dogfood Snapshot Contract — Contract Test
 *
 * Verifies that the snapshot projection correctly turns a harness result
 * into a stable snapshot with cross-reference validation and safety flags.
 *
 * No CLI integration, no filesystem persistence, no database persistence,
 * no provider / real LLM integration, no runtime behavior change, and no
 * source OTUnit mutation or replacement.
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND,
  projectOTUnitRevisionRepositoryDogfoodSnapshot,
} from "../otunit-revision-repository-dogfood-snapshot";

import type { OTUnitRevisionRepositoryDogfoodSnapshot } from "../otunit-revision-repository-dogfood-snapshot";

import {
  runOTUnitRevisionRepositoryDogfoodHarness,
} from "../otunit-revision-repository-dogfood-harness";

import type {
  RunOTUnitRevisionRepositoryDogfoodHarnessInput,
  OTUnitRevisionRepositoryDogfoodHarnessResult,
} from "../otunit-revision-repository-dogfood-harness";

import { IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND } from "../otunit-revision-in-memory-repository";

import type { SourceOTUnitSnapshot } from "../otunit-revision-chain-boundary";
import type { OTUnitRevisionIntentSnapshot } from "../otunit-revision-chain-boundary";
import type { OTUnitRevisionPreviewPatch } from "../otunit-revision-chain-boundary";

// =============================================================================
// Fixture Helpers
// =============================================================================

function makeSourceOTUnitSnapshot(
  overrides?: Partial<SourceOTUnitSnapshot>,
): SourceOTUnitSnapshot {
  return {
    id: "otunit-test-001",
    title: "Test OTUnit",
    objective: "Test the OTUnit revision chain dogfood harness.",
    owner: "test-user",
    dueDate: "2026-07-30",
    judgmentCriteria: "Harness should complete full revision cycle.",
    planOrActionItems: ["Step 1: Run dogfood", "Step 2: Verify chain"],
    evidenceRefs: ["ev-dogfood-001"],
    status: "active",
    ...overrides,
  };
}

function makeRevisionIntent(
  overrides?: Partial<OTUnitRevisionIntentSnapshot>,
): OTUnitRevisionIntentSnapshot {
  return {
    id: "rev-intent-dogfood-001",
    sourceOTUnitId: "otunit-test-001",
    reasonText: "Scope needs tightening for Q3 delivery.",
    directionText: "Reduce scope to core constraint -- time and energy.",
    evidenceRefs: ["ev-scope-001", "ev-capacity-002"],
    ...overrides,
  };
}

function makeRevisionPatch(
  overrides?: Partial<OTUnitRevisionPreviewPatch>,
): OTUnitRevisionPreviewPatch {
  return {
    title: "Test OTUnit (Revised -- Tightened Scope)",
    objective: "Tighter scope for Q3 delivery.",
    owner: "test-user",
    dueDate: "2026-08-15",
    judgmentCriteria: "Revised scope must fit within current team capacity.",
    planOrActionItems: [
      "Reduce scope items to top 3 priorities.",
      "Re-estimate effort for each priority.",
    ],
    evidenceRefs: ["ev-scope-001", "ev-capacity-002"],
    ...overrides,
  };
}

function makeDefaultInput(): RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  return {
    id: "dogfood-run-001",
    sourceSnapshot: makeSourceOTUnitSnapshot(),
    revisionIntent: makeRevisionIntent(),
    proposedPatch: makeRevisionPatch(),
  };
}

async function runDefaultHarness(): Promise<OTUnitRevisionRepositoryDogfoodHarnessResult> {
  return runOTUnitRevisionRepositoryDogfoodHarness(makeDefaultInput());
}

// =============================================================================
// Snapshot Source File Existence
// =============================================================================

describe("otunit-revision-repository-dogfood-snapshot.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-repository-dogfood-snapshot.ts",
    );
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  it("exports OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND", () => {
    expect(OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND).toBe(
      "otunit_revision_repository_dogfood_snapshot",
    );
  });

  it("exports projectOTUnitRevisionRepositoryDogfoodSnapshot as a function", () => {
    expect(typeof projectOTUnitRevisionRepositoryDogfoodSnapshot).toBe("function");
  });
});

// =============================================================================
// Default Snapshot Projection
// =============================================================================

describe("projectOTUnitRevisionRepositoryDogfoodSnapshot", () => {
  it("projects a complete snapshot from a valid harness run", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-001",
      harnessResult,
    });

    expect(snapshot.id).toBe("snapshot-test-001");
    expect(snapshot.kind).toBe(OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND);
    expect(snapshot.harnessId).toBe("dogfood-run-001");
    expect(snapshot.repositoryKind).toBe(
      IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND,
    );
    expect(snapshot.sourceOTUnitId).toBe("otunit-test-001");
    expect(snapshot.revisionIntentRecordId).toBe("rev-intent-dogfood-001");
  });

  it("projects current stage, decision status, and supersession status", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-002",
      harnessResult,
    });

    expect(snapshot.currentStage).toBe("supersession_declared");
    expect(snapshot.decisionStatus).toBe("accepted");
    expect(snapshot.supersessionDeclared).toBe(true);
  });

  it("projects appendCount and recordCount", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-003",
      harnessResult,
    });

    expect(snapshot.appendCount).toBe(6);
    expect(snapshot.recordCount).toBe(6);
  });

  it("projects recordKinds in order", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-004",
      harnessResult,
    });

    expect(snapshot.recordKinds).toEqual([
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ]);
  });
});

// =============================================================================
// Append Results in Snapshot
// =============================================================================

describe("snapshot append results", () => {
  it("projects 6 append result snapshots in order", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-010",
      harnessResult,
    });

    expect(snapshot.appendResults).toHaveLength(6);

    const expectedKinds = [
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ] as const;

    for (let i = 0; i < expectedKinds.length; i++) {
      expect(snapshot.appendResults[i].kind).toBe(expectedKinds[i]);
    }
  });

  it("each append result has safe invariants", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-011",
      harnessResult,
    });

    for (const appendResult of snapshot.appendResults) {
      expect(appendResult.appended).toBe(true);
      expect(appendResult.appendOnly).toBe(true);
      expect(appendResult.sourceOTUnitMutationAllowed).toBe(false);
      expect(appendResult.sourceOTUnitStatusChangeAllowed).toBe(false);
      expect(appendResult.sourceOTUnitReplacementAllowed).toBe(false);
      expect(appendResult.autoReplaceSourceOTUnit).toBe(false);
    }
  });
});

// =============================================================================
// Read Snapshot
// =============================================================================

describe("snapshot read snapshot", () => {
  it("projects read snapshot with chain count and record count", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-020",
      harnessResult,
    });

    expect(snapshot.readSnapshot.chainCount).toBe(1);
    expect(snapshot.readSnapshot.recordCount).toBe(6);
  });

  it("projects read snapshot with lifecycle state", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-021",
      harnessResult,
    });

    expect(snapshot.readSnapshot.currentStage).toBe("supersession_declared");
    expect(snapshot.readSnapshot.decisionStatus).toBe("accepted");
    expect(snapshot.readSnapshot.supersessionDeclared).toBe(true);
  });

  it("projects read snapshot with record kinds", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-022",
      harnessResult,
    });

    expect(snapshot.readSnapshot.recordKinds).toHaveLength(6);
    expect(snapshot.readSnapshot.recordKinds).toContain("revision_intent_snapshot");
    expect(snapshot.readSnapshot.recordKinds).toContain("lifecycle_projection");
  });
});

// =============================================================================
// Supersession Snapshot
// =============================================================================

describe("snapshot supersession snapshot", () => {
  it("projects supersession with correct OTUnit references", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-030",
      harnessResult,
    });

    expect(snapshot.supersessionSnapshot.sourceOTUnitId).toBe("otunit-test-001");
    expect(snapshot.supersessionSnapshot.revisedOTUnitId).toMatch(
      /^otunit-test-001-revision-dogfood/,
    );
  });

  it("projects supersession with invariant flags", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-031",
      harnessResult,
    });

    expect(snapshot.supersessionSnapshot.relation).toBe("supersedes");
    expect(snapshot.supersessionSnapshot.versionLinkRequired).toBe(true);
    expect(snapshot.supersessionSnapshot.sourceHistoryPreserved).toBe(true);
  });
});

// =============================================================================
// Cross-Reference Consistency
// =============================================================================

describe("snapshot cross-reference consistency", () => {
  it("snapshot sourceOTUnitId matches harness lifecycle sourceOTUnitId", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-040",
      harnessResult,
    });

    expect(snapshot.sourceOTUnitId).toBe(
      harnessResult.lifecycleProjection.sourceOTUnitId,
    );
  });

  it("snapshot revisionIntentRecordId matches harness lifecycle revisionIntentRecordId", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-041",
      harnessResult,
    });

    expect(snapshot.revisionIntentRecordId).toBe(
      harnessResult.lifecycleProjection.revisionIntentRecordId,
    );
  });

  it("snapshot currentStage matches read projection chain currentStage", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-042",
      harnessResult,
    });

    expect(snapshot.currentStage).toBe(
      harnessResult.readProjection.chains[0].currentStage,
    );
  });

  it("snapshot appendCount matches appendResults length", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-043",
      harnessResult,
    });

    expect(snapshot.appendCount).toBe(harnessResult.appendResults.length);
  });

  it("snapshot supersession source OTUnit matches source snapshot id", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-044",
      harnessResult,
    });

    expect(snapshot.supersessionSnapshot.sourceOTUnitId).toBe(
      harnessResult.sourceSnapshotAfterDogfood.id,
    );
  });

  it("snapshot supersession revised OTUnit matches proposed boundary proposed id", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-045",
      harnessResult,
    });

    expect(snapshot.supersessionSnapshot.revisedOTUnitId).toBe(
      harnessResult.proposedBoundary.proposed.id,
    );
  });
});

// =============================================================================
// Safety Flags
// =============================================================================

describe("snapshot safety flags", () => {
  it("sourceSnapshotPreserved is true", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-050",
      harnessResult,
    });

    expect(snapshot.sourceSnapshotPreserved).toBe(true);
  });

  it("all mutation flags are false", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-051",
      harnessResult,
    });

    expect(snapshot.runtimeMutationAllowed).toBe(false);
    expect(snapshot.repositoryPersistenceAllowed).toBe(false);
    expect(snapshot.filesystemPersistenceAllowed).toBe(false);
    expect(snapshot.databasePersistenceAllowed).toBe(false);
    expect(snapshot.sourceOTUnitMutationAllowed).toBe(false);
    expect(snapshot.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(snapshot.sourceOTUnitReplacementAllowed).toBe(false);
    expect(snapshot.autoReplaceSourceOTUnit).toBe(false);
  });
});

// =============================================================================
// Validation Errors
// =============================================================================

describe("snapshot validation errors", () => {
  it("throws when no chain exists", async () => {
    const harnessResult = await runDefaultHarness();
    const badResult: OTUnitRevisionRepositoryDogfoodHarnessResult = {
      ...harnessResult,
      readProjection: {
        ...harnessResult.readProjection,
        chains: [],
        chainCount: 0,
      },
    };

    expect(() =>
      projectOTUnitRevisionRepositoryDogfoodSnapshot({
        id: "snapshot-test-060",
        harnessResult: badResult,
      }),
    ).toThrow("Dogfood snapshot requires one revision read projection chain.");
  });

  it("throws when chainCount is not 1", async () => {
    const harnessResult = await runDefaultHarness();
    const badResult: OTUnitRevisionRepositoryDogfoodHarnessResult = {
      ...harnessResult,
      readProjection: {
        ...harnessResult.readProjection,
        chainCount: 0,
      },
    };

    expect(() =>
      projectOTUnitRevisionRepositoryDogfoodSnapshot({
        id: "snapshot-test-061",
        harnessResult: badResult,
      }),
    ).toThrow("Dogfood snapshot requires exactly one revision chain.");
  });
});

// =============================================================================
// Snapshot Future Compatibility
// =============================================================================

describe("snapshot future compatibility", () => {
  it("snapshot type has all required fields for terminal CLI consumption", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-070",
      harnessResult,
    });

    // Terminal show / CLI command requires: id, kind, sourceOTUnitId,
    // revisionIntentRecordId, currentStage, decisionStatus,
    // supersessionDeclared, appendCount, recordCount
    const requiredForCli = [
      "id",
      "kind",
      "harnessId",
      "repositoryKind",
      "sourceOTUnitId",
      "revisionIntentRecordId",
      "currentStage",
      "decisionStatus",
      "supersessionDeclared",
      "appendCount",
      "recordCount",
      "recordKinds",
      "appendResults",
      "readSnapshot",
      "supersessionSnapshot",
    ] as const;

    for (const field of requiredForCli) {
      expect(snapshot).toHaveProperty(field);
    }
  });

  it("snapshot is serializable as plain JSON", async () => {
    const harnessResult = await runDefaultHarness();
    const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
      id: "snapshot-test-071",
      harnessResult,
    });

    const serialized = JSON.stringify(snapshot);
    const deserialized = JSON.parse(serialized) as OTUnitRevisionRepositoryDogfoodSnapshot;

    expect(deserialized.id).toBe("snapshot-test-071");
    expect(deserialized.kind).toBe(OTUNIT_REVISION_REPOSITORY_DOGFOOD_SNAPSHOT_KIND);
    expect(deserialized.sourceOTUnitId).toBe("otunit-test-001");
    expect(deserialized.readSnapshot.chainCount).toBe(1);
    expect(deserialized.supersessionSnapshot.relation).toBe("supersedes");
    expect(deserialized.runtimeMutationAllowed).toBe(false);
  });
});

// =============================================================================
// Forbidden Source Text Check
// =============================================================================

describe("snapshot source does not contain forbidden strings", () => {
  it("snapshot source does not contain forbidden persistence / CLI / provider text", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-repository-dogfood-snapshot.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/from\s+"fs"/);
    expect(source).not.toMatch(/from\s+'fs'/);
    expect(source).not.toMatch(/node:fs/);
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("appendFile");
    expect(source).not.toContain("readFile");

    expect(source).not.toContain("sqlite");
    expect(source).not.toContain("postgres");
    expect(source).not.toContain("prisma");

    expect(source).not.toContain("commander");
    expect(source).not.toContain("inquirer");

    expect(source).not.toContain("openai");
    expect(source).not.toContain("deepseek");

    expect(source).not.toContain("*** End of File");
  });
});
