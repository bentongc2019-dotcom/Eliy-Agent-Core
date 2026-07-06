/**
 * OTUnit Revision Dogfood Snapshot Read Model — Contract Test
 *
 * Verifies that the read model projection correctly turns a dogfood snapshot
 * into a terminal-show-ready read model with structured sections, record steps,
 * and safety invariants.
 *
 * No CLI integration, no filesystem persistence, no database persistence,
 * no provider / real LLM integration, no runtime behavior change, and no
 * source OTUnit mutation or replacement.
 *
 * Pure static contract test. No side effects. No file I/O.
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
  OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND,
  projectOTUnitRevisionDogfoodSnapshotReadModel,
} from "../otunit-revision-dogfood-snapshot-read-model";

import type {
  OTUnitRevisionDogfoodSnapshotReadModel,
} from "../otunit-revision-dogfood-snapshot-read-model";

import {
  runOTUnitRevisionRepositoryDogfoodHarness,
} from "../otunit-revision-repository-dogfood-harness";

import type {
  RunOTUnitRevisionRepositoryDogfoodHarnessInput,
  OTUnitRevisionRepositoryDogfoodHarnessResult,
} from "../otunit-revision-repository-dogfood-harness";

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
    objective: "Test the OTUnit revision chain dogfood snapshot read model.",
    owner: "test-user",
    dueDate: "2026-07-30",
    judgmentCriteria: "Read model should produce terminal-show-ready output.",
    planOrActionItems: ["Step 1: Create snapshot", "Step 2: Project read model"],
    evidenceRefs: ["ev-read-model-001"],
    status: "active",
    ...overrides,
  };
}

function makeRevisionIntent(
  overrides?: Partial<OTUnitRevisionIntentSnapshot>,
): OTUnitRevisionIntentSnapshot {
  return {
    id: "rev-intent-rm-001",
    sourceOTUnitId: "otunit-test-001",
    reasonText: "Need to verify read model projection.",
    directionText: "Project snapshot into terminal-show-ready read model.",
    evidenceRefs: ["ev-rm-001", "ev-rm-002"],
    ...overrides,
  };
}

function makeRevisionPatch(
  overrides?: Partial<OTUnitRevisionPreviewPatch>,
): OTUnitRevisionPreviewPatch {
  return {
    title: "Test OTUnit (Revised — Read Model)",
    objective: "Verify read model projection from dogfood snapshot.",
    owner: "test-user",
    dueDate: "2026-08-15",
    judgmentCriteria: "Read model must produce correct terminal-show-ready output.",
    planOrActionItems: [
      "Create dogfood snapshot.",
      "Project through read model.",
    ],
    evidenceRefs: ["ev-rm-001", "ev-rm-002"],
    ...overrides,
  };
}

function makeDefaultInput(): RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  return {
    id: "dogfood-rm-001",
    sourceSnapshot: makeSourceOTUnitSnapshot(),
    revisionIntent: makeRevisionIntent(),
    proposedPatch: makeRevisionPatch(),
  };
}

async function runDefaultHarnessWithSnapshot(): Promise<{
  harnessResult: OTUnitRevisionRepositoryDogfoodHarnessResult;
  snapshot: OTUnitRevisionRepositoryDogfoodSnapshot;
}> {
  const harnessResult = await runOTUnitRevisionRepositoryDogfoodHarness(
    makeDefaultInput(),
  );
  const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
    id: "snapshot-rm-001",
    harnessResult,
  });
  return { harnessResult, snapshot };
}

// =============================================================================
// Read Model: Source File Existence
// =============================================================================

describe("otunit-revision-dogfood-snapshot-read-model.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-dogfood-snapshot-read-model.ts",
    );
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  it("exports OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND", () => {
    expect(OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND).toBe(
      "otunit_revision_dogfood_snapshot_read_model",
    );
  });

  it("exports projectOTUnitRevisionDogfoodSnapshotReadModel as a function", () => {
    expect(typeof projectOTUnitRevisionDogfoodSnapshotReadModel).toBe("function");
  });
});

// =============================================================================
// Read Model Kind
// =============================================================================

describe("read model kind", () => {
  it("equals otunit_revision_dogfood_snapshot_read_model", () => {
    expect(OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND).toBe(
      "otunit_revision_dogfood_snapshot_read_model",
    );
  });
});

// =============================================================================
// Default Read Model Projection
// =============================================================================

describe("projectOTUnitRevisionDogfoodSnapshotReadModel", () => {
  it("projects a complete read model from a valid snapshot", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-001",
      snapshot,
    });

    expect(readModel.id).toBe("read-model-001");
    expect(readModel.kind).toBe(OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND);
    expect(readModel.snapshotId).toBe(snapshot.id);
  });

  it("read model title is OTUnit Revision Dogfood Snapshot", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-002",
      snapshot,
    });

    expect(readModel.title).toBe("OTUnit Revision Dogfood Snapshot");
  });

  it("read model includes summary", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-003",
      snapshot,
    });

    expect(readModel.summary).toBeTruthy();
    expect(typeof readModel.summary).toBe("string");
  });

  it("read model includes sourceOTUnitId", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-004",
      snapshot,
    });

    expect(readModel.sourceOTUnitId).toBe("otunit-test-001");
  });

  it("read model includes revisionIntentRecordId", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-005",
      snapshot,
    });

    expect(readModel.revisionIntentRecordId).toBe("rev-intent-rm-001");
  });

  it("read model currentStage equals supersession_declared", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-006",
      snapshot,
    });

    expect(readModel.currentStage).toBe("supersession_declared");
  });

  it("read model decisionStatus equals accepted", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-007",
      snapshot,
    });

    expect(readModel.decisionStatus).toBe("accepted");
  });

  it("read model supersessionDeclared is true", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-008",
      snapshot,
    });

    expect(readModel.supersessionDeclared).toBe(true);
  });

  it("read model appendCount equals 6", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-009",
      snapshot,
    });

    expect(readModel.appendCount).toBe(6);
  });

  it("read model recordCount equals 6", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-010",
      snapshot,
    });

    expect(readModel.recordCount).toBe(6);
  });
});

// =============================================================================
// Record Steps
// =============================================================================

describe("read model record steps", () => {
  it("has 6 record steps", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-020",
      snapshot,
    });

    expect(readModel.recordSteps).toHaveLength(6);
  });

  it("indexes are 1..6", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-021",
      snapshot,
    });

    for (let i = 0; i < readModel.recordSteps.length; i++) {
      expect(readModel.recordSteps[i].index).toBe(i + 1);
    }
  });

  it("preserves all six record kinds in append order", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-022",
      snapshot,
    });

    const expectedKinds = [
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ] as const;

    const actualKinds = readModel.recordSteps.map((step) => step.kind);
    expect(actualKinds).toEqual(expectedKinds);
  });

  it("record step labels are plain text", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-023",
      snapshot,
    });

    for (const step of readModel.recordSteps) {
      expect(typeof step.label).toBe("string");
      expect(step.label).not.toContain("\u001b");
    }
  });
});

// =============================================================================
// Sections
// =============================================================================

describe("read model sections", () => {
  it("has all four expected sections", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-030",
      snapshot,
    });

    const sectionTitles = readModel.sections.map((s) => s.title);
    expect(sectionTitles).toContain("Revision Chain");
    expect(sectionTitles).toContain("Repository Records");
    expect(sectionTitles).toContain("Supersession");
    expect(sectionTitles).toContain("Safety Invariants");
  });

  // ── Revision Chain Section ───────────────────────────────────────────────

  describe("Revision Chain section", () => {
    it("includes Source OTUnit", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-031",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Revision Chain",
      )!;
      const line = section.lines.find((l) => l.label === "Source OTUnit")!;
      expect(line.value).toBe("otunit-test-001");
    });

    it("includes Revision Intent", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-032",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Revision Chain",
      )!;
      const line = section.lines.find((l) => l.label === "Revision Intent")!;
      expect(line.value).toBe("rev-intent-rm-001");
    });

    it("includes Current Stage", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-033",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Revision Chain",
      )!;
      const line = section.lines.find((l) => l.label === "Current Stage")!;
      expect(line.value).toBe("supersession_declared");
    });

    it("includes Decision Status", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-034",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Revision Chain",
      )!;
      const line = section.lines.find((l) => l.label === "Decision Status")!;
      expect(line.value).toBe("accepted");
    });

    it("includes Supersession Declared", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-035",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Revision Chain",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Supersession Declared",
      )!;
      expect(line.value).toBe("true");
    });
  });

  // ── Repository Records Section ───────────────────────────────────────────

  describe("Repository Records section", () => {
    it("includes Append Count", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-040",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Repository Records",
      )!;
      const line = section.lines.find((l) => l.label === "Append Count")!;
      expect(line.value).toBe("6");
    });

    it("includes Record Count", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-041",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Repository Records",
      )!;
      const line = section.lines.find((l) => l.label === "Record Count")!;
      expect(line.value).toBe("6");
    });

    it("includes Record Kinds", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-042",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Repository Records",
      )!;
      const line = section.lines.find((l) => l.label === "Record Kinds")!;
      expect(line.value).toContain("revision_intent_snapshot");
      expect(line.value).toContain("lifecycle_projection");
    });
  });

  // ── Supersession Section ─────────────────────────────────────────────────

  describe("Supersession section", () => {
    it("includes Relation=supersedes", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-050",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Supersession",
      )!;
      const line = section.lines.find((l) => l.label === "Relation")!;
      expect(line.value).toBe("supersedes");
    });

    it("includes Source OTUnit", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-051",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Supersession",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Source OTUnit",
      )!;
      expect(line.value).toBe("otunit-test-001");
    });

    it("includes Revised OTUnit", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-052",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Supersession",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Revised OTUnit",
      )!;
      expect(line.value).toMatch(/^otunit-test-001-revision-dogfood/);
    });

    it("includes Version Link Required=true", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-053",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Supersession",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Version Link Required",
      )!;
      expect(line.value).toBe("true");
    });

    it("includes Source History Preserved=true", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-054",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Supersession",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Source History Preserved",
      )!;
      expect(line.value).toBe("true");
    });
  });

  // ── Safety Invariants Section ────────────────────────────────────────────

  describe("Safety Invariants section", () => {
    it("includes Runtime Mutation Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-060",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Runtime Mutation Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Repository Persistence Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-061",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Repository Persistence Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Filesystem Persistence Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-062",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Filesystem Persistence Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Database Persistence Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-063",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Database Persistence Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Source OTUnit Mutation Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-064",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Source OTUnit Mutation Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Source OTUnit Status Change Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-065",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Source OTUnit Status Change Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Source OTUnit Replacement Allowed=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-066",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Source OTUnit Replacement Allowed",
      )!;
      expect(line.value).toBe("false");
    });

    it("includes Auto Replace Source OTUnit=false", async () => {
      const { snapshot } = await runDefaultHarnessWithSnapshot();
      const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-067",
        snapshot,
      });

      const section = readModel.sections.find(
        (s) => s.title === "Safety Invariants",
      )!;
      const line = section.lines.find(
        (l) => l.label === "Auto Replace Source OTUnit",
      )!;
      expect(line.value).toBe("false");
    });
  });
});

// =============================================================================
// Terminal-Show-Ready Flags
// =============================================================================

describe("read model terminal-show-ready flags", () => {
  it("has terminalShowReady=true", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-070",
      snapshot,
    });

    expect(readModel.terminalShowReady).toBe(true);
  });

  it("has plainTextOnly=true", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-071",
      snapshot,
    });

    expect(readModel.plainTextOnly).toBe(true);
  });

  it("has ansiColorAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-072",
      snapshot,
    });

    expect(readModel.ansiColorAllowed).toBe(false);
  });

  it("has runtimeMutationAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-073",
      snapshot,
    });

    expect(readModel.runtimeMutationAllowed).toBe(false);
  });

  it("has repositoryPersistenceAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-074",
      snapshot,
    });

    expect(readModel.repositoryPersistenceAllowed).toBe(false);
  });

  it("has filesystemPersistenceAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-075",
      snapshot,
    });

    expect(readModel.filesystemPersistenceAllowed).toBe(false);
  });

  it("has databasePersistenceAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-076",
      snapshot,
    });

    expect(readModel.databasePersistenceAllowed).toBe(false);
  });

  it("has sourceOTUnitMutationAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-077",
      snapshot,
    });

    expect(readModel.sourceOTUnitMutationAllowed).toBe(false);
  });

  it("has sourceOTUnitStatusChangeAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-078",
      snapshot,
    });

    expect(readModel.sourceOTUnitStatusChangeAllowed).toBe(false);
  });

  it("has sourceOTUnitReplacementAllowed=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-079",
      snapshot,
    });

    expect(readModel.sourceOTUnitReplacementAllowed).toBe(false);
  });

  it("has autoReplaceSourceOTUnit=false", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-080",
      snapshot,
    });

    expect(readModel.autoReplaceSourceOTUnit).toBe(false);
  });
});

// =============================================================================
// Projection Rejections
// =============================================================================

describe("projection rejects", () => {
  it("appendCount / recordCount mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      appendCount: 5,
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-090",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires appendCount to equal recordCount.");
  });

  it("recordKinds length / recordCount mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      recordKinds: ["revision_intent_snapshot", "revision_preview"],
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-091",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires recordKinds length to equal recordCount.");
  });

  it("readSnapshot recordCount mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      readSnapshot: {
        ...snapshot.readSnapshot,
        recordCount: 3,
      },
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-092",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires readSnapshot recordCount to match snapshot recordCount.");
  });

  it("readSnapshot chainCount not equal to 1", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      readSnapshot: {
        ...snapshot.readSnapshot,
        chainCount: 0,
      },
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-093",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires exactly one readSnapshot chain.");
  });

  it("readSnapshot currentStage mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      readSnapshot: {
        ...snapshot.readSnapshot,
        currentStage: "revision_intent_recorded",
      },
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-094",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires readSnapshot currentStage to match snapshot currentStage.");
  });

  it("readSnapshot decisionStatus mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      readSnapshot: {
        ...snapshot.readSnapshot,
        decisionStatus: "rejected",
      },
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-095",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires readSnapshot decisionStatus to match snapshot decisionStatus.");
  });

  it("readSnapshot supersessionDeclared mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      readSnapshot: {
        ...snapshot.readSnapshot,
        supersessionDeclared: false,
      },
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-096",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires readSnapshot supersessionDeclared to match snapshot supersessionDeclared.");
  });

  it("supersession relation not supersedes", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot = {
      ...snapshot,
      supersessionSnapshot: {
        ...snapshot.supersessionSnapshot,
        relation: "not_supersedes",
      },
    } as unknown as OTUnitRevisionRepositoryDogfoodSnapshot;

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-096a",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires supersession relation to be supersedes.");
  });


  it("supersession source OTUnit mismatch", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const badSnapshot: OTUnitRevisionRepositoryDogfoodSnapshot = {
      ...snapshot,
      supersessionSnapshot: {
        ...snapshot.supersessionSnapshot,
        sourceOTUnitId: "otunit-wrong-001",
      },
    };

    expect(() =>
      projectOTUnitRevisionDogfoodSnapshotReadModel({
        id: "read-model-097",
        snapshot: badSnapshot,
      }),
    ).toThrow("Dogfood snapshot read model requires supersession source OTUnit to match snapshot source OTUnit.");
  });
});

// =============================================================================
// Input Snapshot Immutability
// =============================================================================

describe("input snapshot immutability", () => {
  it("input snapshot remains unchanged after read model projection", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const original = JSON.stringify(snapshot);

    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-100",
      snapshot,
    });

    const afterProjection = JSON.stringify(snapshot);
    expect(afterProjection).toBe(original);
  });
});

// =============================================================================
// Forbidden Source Text Check
// =============================================================================

describe("read model source does not contain forbidden strings", () => {
  it("no forbidden persistence / CLI / provider text in read model source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const readModelPath = path.resolve(
      currentDir,
      "../otunit-revision-dogfood-snapshot-read-model.ts",
    );
    const source = fs.readFileSync(readModelPath, "utf8");

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

// =============================================================================
// Reader Model Future Compatibility
// =============================================================================

describe("read model future compatibility", () => {
  it("read model is serializable as plain JSON", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-110",
      snapshot,
    });

    const serialized = JSON.stringify(readModel);
    const deserialized = JSON.parse(serialized) as OTUnitRevisionDogfoodSnapshotReadModel;

    expect(deserialized.id).toBe("read-model-110");
    expect(deserialized.kind).toBe(OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND);
    expect(deserialized.snapshotId).toBe(snapshot.id);
    expect(deserialized.title).toBe("OTUnit Revision Dogfood Snapshot");
    expect(deserialized.terminalShowReady).toBe(true);
    expect(deserialized.recordSteps).toHaveLength(6);
    expect(deserialized.sections).toHaveLength(4);
  });

  it("read model type has all required fields for terminal CLI consumption", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-111",
      snapshot,
    });

    const requiredFields = [
      "id",
      "kind",
      "snapshotId",
      "title",
      "summary",
      "sourceOTUnitId",
      "revisionIntentRecordId",
      "currentStage",
      "decisionStatus",
      "supersessionDeclared",
      "appendCount",
      "recordCount",
      "recordSteps",
      "sections",
      "terminalShowReady",
      "plainTextOnly",
      "ansiColorAllowed",
    ] as const;

    for (const field of requiredFields) {
      expect(readModel).toHaveProperty(field);
    }
  });
});

// =============================================================================
// Forbidden Operations
// =============================================================================

describe("forbidden operations", () => {
  it("Runtime behavior remains unchanged", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-120",
      snapshot,
    });

    expect(readModel.runtimeMutationAllowed).toBe(false);
  });

  it("Repository persistence remains unchanged", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-121",
      snapshot,
    });

    expect(readModel.repositoryPersistenceAllowed).toBe(false);
  });

  it("Filesystem persistence remains unchanged", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-122",
      snapshot,
    });

    expect(readModel.filesystemPersistenceAllowed).toBe(false);
  });

  it("Database persistence remains unchanged", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-123",
      snapshot,
    });

    expect(readModel.databasePersistenceAllowed).toBe(false);
  });

  it("CLI remains unchanged", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const readModelPath = path.resolve(
      currentDir,
      "../otunit-revision-dogfood-snapshot-read-model.ts",
    );
    const source = fs.readFileSync(readModelPath, "utf8");

    expect(source).not.toContain("commander");
    expect(source).not.toContain("Command");
    expect(source).not.toContain("cli");
  });

  it("Provider / real LLM integration remains unchanged", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const readModelPath = path.resolve(
      currentDir,
      "../otunit-revision-dogfood-snapshot-read-model.ts",
    );
    const source = fs.readFileSync(readModelPath, "utf8");

    expect(source).not.toContain("openai");
    expect(source).not.toContain("deepseek");
  });

  it("Source OTUnit mutation remains unchanged", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-124",
      snapshot,
    });

    expect(readModel.sourceOTUnitMutationAllowed).toBe(false);
  });

  it("Source OTUnit replacement remains unchanged", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-125",
      snapshot,
    });

    expect(readModel.sourceOTUnitReplacementAllowed).toBe(false);
  });
});

// =============================================================================
// No ANSI Escape Sequences
// =============================================================================

describe("no ANSI escape sequences in read model output", () => {
  it("summary does not contain ANSI escape sequences", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-130",
      snapshot,
    });

    expect(readModel.summary).not.toMatch(/\x1b\[/);
  });

  it("record step labels do not contain ANSI escape sequences", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-131",
      snapshot,
    });

    for (const step of readModel.recordSteps) {
      expect(step.label).not.toMatch(/\x1b\[/);
    }
  });

  it("section line values do not contain ANSI escape sequences", async () => {
    const { snapshot } = await runDefaultHarnessWithSnapshot();
    const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
      id: "read-model-132",
      snapshot,
    });

    for (const section of readModel.sections) {
      for (const line of section.lines) {
        expect(line.value).not.toMatch(/\x1b\[/);
      }
    }
  });
});
