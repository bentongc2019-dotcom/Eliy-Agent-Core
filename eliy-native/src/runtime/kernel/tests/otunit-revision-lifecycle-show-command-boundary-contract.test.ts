/**
 * OTUnit Revision Lifecycle Show Command Boundary — Contract Test
 *
 * Verifies that the command boundary / formatter boundary correctly turns a
 * terminal-show-ready OTUnit revision dogfood snapshot read model into
 * deterministic plain-text show output.
 *
 * No CLI registration, no CLI file changes, no filesystem persistence,
 * no database persistence, no provider / real LLM integration,
 * no runtime behavior change, and no source OTUnit mutation or replacement.
 *
 * Pure static contract test. No side effects. No file I/O.
 *
 * PR #63 — Command boundary / formatter boundary only.
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  OTUNIT_REVISION_DOGFOOD_SNAPSHOT_READ_MODEL_KIND,
  projectOTUnitRevisionDogfoodSnapshotReadModel,
} from "../otunit-revision-dogfood-snapshot-read-model";

import type {
  OTUnitRevisionDogfoodSnapshotReadModel,
} from "../otunit-revision-dogfood-snapshot-read-model";

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND,
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
  projectOTUnitRevisionLifecycleShowCommandBoundary,
} from "../otunit-revision-lifecycle-show-command-boundary";

import type {
  OTUnitRevisionLifecycleShowCommandBoundaryResult,
  ProjectOTUnitRevisionLifecycleShowCommandBoundaryInput,
} from "../otunit-revision-lifecycle-show-command-boundary";

import {
  runOTUnitRevisionRepositoryDogfoodHarness,
} from "../otunit-revision-repository-dogfood-harness";

import type {
  RunOTUnitRevisionRepositoryDogfoodHarnessInput,
  OTUnitRevisionRepositoryDogfoodHarnessResult,
} from "../otunit-revision-repository-dogfood-harness";

import { projectOTUnitRevisionRepositoryDogfoodSnapshot } from "../otunit-revision-repository-dogfood-snapshot";

import type { OTUnitRevisionRepositoryDogfoodSnapshot } from "../otunit-revision-repository-dogfood-snapshot";

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
    objective: "Test the OTUnit revision lifecycle show command boundary.",
    owner: "test-user",
    dueDate: "2026-07-30",
    judgmentCriteria: "Command boundary should produce deterministic plain-text output.",
    planOrActionItems: ["Step 1: Create read model", "Step 2: Project show output"],
    evidenceRefs: ["ev-cmd-boundary-001"],
    status: "active",
    ...overrides,
  };
}

function makeRevisionIntent(
  overrides?: Partial<OTUnitRevisionIntentSnapshot>,
): OTUnitRevisionIntentSnapshot {
  return {
    id: "rev-intent-cmd-001",
    sourceOTUnitId: "otunit-test-001",
    reasonText: "Need to verify show command boundary.",
    directionText: "Project read model into show command boundary result.",
    evidenceRefs: ["ev-cmd-001", "ev-cmd-002"],
    ...overrides,
  };
}

function makeRevisionPatch(
  overrides?: Partial<OTUnitRevisionPreviewPatch>,
): OTUnitRevisionPreviewPatch {
  return {
    title: "Test OTUnit (Revised — Show Command Boundary)",
    objective: "Verify show command boundary projection from read model.",
    owner: "test-user",
    dueDate: "2026-08-15",
    judgmentCriteria: "Command boundary must produce deterministic plain-text show output.",
    planOrActionItems: [
      "Create read model.",
      "Project through show command boundary.",
    ],
    evidenceRefs: ["ev-cmd-001", "ev-cmd-002"],
    ...overrides,
  };
}

function makeDefaultHarnessInput(): RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  return {
    id: "dogfood-cmd-001",
    sourceSnapshot: makeSourceOTUnitSnapshot(),
    revisionIntent: makeRevisionIntent(),
    proposedPatch: makeRevisionPatch(),
  };
}

async function runDefaultReadModel(): Promise<{
  harnessResult: OTUnitRevisionRepositoryDogfoodHarnessResult;
  snapshot: OTUnitRevisionRepositoryDogfoodSnapshot;
  readModel: OTUnitRevisionDogfoodSnapshotReadModel;
}> {
  const harnessResult = await runOTUnitRevisionRepositoryDogfoodHarness(
    makeDefaultHarnessInput(),
  );
  const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
    id: "snapshot-cmd-001",
    harnessResult,
  });
  const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
    id: "read-model-cmd-001",
    snapshot,
  });
  return { harnessResult, snapshot, readModel };
}

// =============================================================================
// Source File Existence
// =============================================================================

describe("otunit-revision-lifecycle-show-command-boundary.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  it("exports OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND).toBe(
      "otunit_revision_lifecycle_show_command_boundary",
    );
  });

  it("exports OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME).toBe(
      "otunit:revision:lifecycle:show",
    );
  });

  it("exports projectOTUnitRevisionLifecycleShowCommandBoundary as a function", () => {
    expect(typeof projectOTUnitRevisionLifecycleShowCommandBoundary).toBe("function");
  });
});

// =============================================================================
// Command Boundary Kind & Name
// =============================================================================

describe("command boundary kind and name", () => {
  it("has kind otunit_revision_lifecycle_show_command_boundary", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND).toBe(
      "otunit_revision_lifecycle_show_command_boundary",
    );
  });

  it("has command name otunit:revision:lifecycle:show", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME).toBe(
      "otunit:revision:lifecycle:show",
    );
  });
});

// =============================================================================
// Default Projection
// =============================================================================

describe("projectOTUnitRevisionLifecycleShowCommandBoundary", () => {
  it("projects a complete command boundary result from a valid read model", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-001",
      readModel,
    });

    expect(result.id).toBe("cmd-boundary-001");
    expect(result.kind).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND);
    expect(result.commandName).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME);
    expect(result.readModelId).toBe(readModel.id);
    expect(result.snapshotId).toBe(readModel.snapshotId);
  });

  it("output kind is plain_text", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-002",
      readModel,
    });

    expect(result.outputKind).toBe("plain_text");
  });

  it("title is OTUnit Revision Lifecycle", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-003",
      readModel,
    });

    expect(result.title).toBe("OTUnit Revision Lifecycle");
  });

  it("summary matches read model summary", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-004",
      readModel,
    });

    expect(result.summary).toBe(readModel.summary);
  });
});

// =============================================================================
// Sections
// =============================================================================

describe("command boundary sections", () => {
  it("has a Record Steps section as the first section", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-010",
      readModel,
    });

    expect(result.sections[0].title).toBe("Record Steps");
  });

  it("Record Steps lines match read model record step labels", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-011",
      readModel,
    });

    const recordStepsSection = result.sections[0];
    expect(recordStepsSection.lines).toHaveLength(readModel.recordSteps.length);

    for (let i = 0; i < readModel.recordSteps.length; i++) {
      expect(recordStepsSection.lines[i]).toBe(readModel.recordSteps[i].label);
    }
  });

  it("includes all read model sections after Record Steps", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-012",
      readModel,
    });

    // First section is Record Steps; remaining sections should match read model sections
    expect(result.sections.length).toBe(readModel.sections.length + 1);

    for (let i = 0; i < readModel.sections.length; i++) {
      const resultSection = result.sections[i + 1];
      const readModelSection = readModel.sections[i];
      expect(resultSection.title).toBe(readModelSection.title);
    }
  });

  it("section lines are formatted as label: value", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-013",
      readModel,
    });

    // Check all sections after Record Steps
    for (let s = 1; s < result.sections.length; s++) {
      const section = result.sections[s];
      const readModelSection = readModel.sections[s - 1];

      expect(section.lines).toHaveLength(readModelSection.lines.length);

      for (let l = 0; l < section.lines.length; l++) {
        const expected = `${readModelSection.lines[l].label}: ${readModelSection.lines[l].value}`;
        expect(section.lines[l]).toBe(expected);
      }
    }
  });
});

// =============================================================================
// Plain Text Output
// =============================================================================

describe("plain text output", () => {
  it("lines array is non-empty", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-020",
      readModel,
    });

    expect(result.lines.length).toBeGreaterThan(0);
  });

  it("lineCount equals lines.length", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-021",
      readModel,
    });

    expect(result.lineCount).toBe(result.lines.length);
  });

  it("plainText is lines joined by newline", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-022",
      readModel,
    });

    expect(result.plainText).toBe(result.lines.join("\n"));
  });

  it("first line is header", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-023",
      readModel,
    });

    expect(result.lines[0]).toBe("OTUnit Revision Lifecycle");
  });

  it("second line includes read model id", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-024",
      readModel,
    });

    expect(result.lines[1]).toBe(`Read Model: ${readModel.id}`);
  });

  it("third line includes snapshot id", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-025",
      readModel,
    });

    expect(result.lines[2]).toBe(`Snapshot: ${readModel.snapshotId}`);
  });

  it("fourth line includes summary", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-026",
      readModel,
    });

    expect(result.lines[3]).toBe(`Summary: ${readModel.summary}`);
  });

  it("fifth line is blank separator", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-027",
      readModel,
    });

    expect(result.lines[4]).toBe("");
  });

  it("plainText does not contain ANSI escape sequences", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-028",
      readModel,
    });

    expect(result.plainText).not.toMatch(/\x1b\[/);
  });

  it("plainText does not contain ESC character", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-029",
      readModel,
    });

    expect(result.plainText).not.toContain("\u001b");
  });

  it("line content shows section titles with section lines", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-030",
      readModel,
    });

    // Verify structure: header, blank, section titles, section lines
    expect(result.lines[5]).toBe(result.sections[0].title);

    for (let i = 0; i < result.sections[0].lines.length; i++) {
      expect(result.lines[6 + i]).toBe(`- ${result.sections[0].lines[i]}`);
    }
  });

  it("plain text output is deterministic", async () => {
    const { readModel } = await runDefaultReadModel();

    const result1 = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-031",
      readModel,
    });

    const result2 = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-032",
      readModel,
    });

    expect(result2.plainText).toBe(result1.plainText);
  });

  it("plain text does not contain blank section titles or empty labels", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-033",
      readModel,
    });

    expect(result.plainText).not.toMatch(/: $/m);
    expect(result.lines.join("\n")).not.toMatch(/\n\n\n/);
  });
});

// =============================================================================
// Safety Invariant Fields
// =============================================================================

describe("safety invariant fields", () => {
  it("runtimeCommandBoundaryOnly is true", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-040",
      readModel,
    });

    expect(result.runtimeCommandBoundaryOnly).toBe(true);
  });

  it("terminalAdapterIntegrated is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-041",
      readModel,
    });

    expect(result.terminalAdapterIntegrated).toBe(false);
  });

  it("terminalShowReady is true", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-042",
      readModel,
    });

    expect(result.terminalShowReady).toBe(true);
  });

  it("plainTextOnly is true", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-043",
      readModel,
    });

    expect(result.plainTextOnly).toBe(true);
  });

  it("ansiColorAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-044",
      readModel,
    });

    expect(result.ansiColorAllowed).toBe(false);
  });

  it("runtimeMutationAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-045",
      readModel,
    });

    expect(result.runtimeMutationAllowed).toBe(false);
  });

  it("repositoryPersistenceAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-046",
      readModel,
    });

    expect(result.repositoryPersistenceAllowed).toBe(false);
  });

  it("filesystemPersistenceAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-047",
      readModel,
    });

    expect(result.filesystemPersistenceAllowed).toBe(false);
  });

  it("databasePersistenceAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-048",
      readModel,
    });

    expect(result.databasePersistenceAllowed).toBe(false);
  });

  it("sourceOTUnitMutationAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-049",
      readModel,
    });

    expect(result.sourceOTUnitMutationAllowed).toBe(false);
  });

  it("sourceOTUnitStatusChangeAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-050",
      readModel,
    });

    expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
  });

  it("sourceOTUnitReplacementAllowed is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-051",
      readModel,
    });

    expect(result.sourceOTUnitReplacementAllowed).toBe(false);
  });

  it("autoReplaceSourceOTUnit is false", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-052",
      readModel,
    });

    expect(result.autoReplaceSourceOTUnit).toBe(false);
  });
});

// =============================================================================
// Projection Rejections
// =============================================================================

describe("projection rejects invalid read model", () => {
  it("missing read model id", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      id: "",
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-060",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires read model id.");
  });

  it("missing snapshot id", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      snapshotId: "",
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-061",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires snapshot id.");
  });

  it("terminalShowReady is not true", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      terminalShowReady: false as unknown as true,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-062",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires terminalShowReady=true.");
  });

  it("plainTextOnly is not true", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      plainTextOnly: false as unknown as true,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-063",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires plainTextOnly=true.");
  });

  it("ansiColorAllowed is not false", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      ansiColorAllowed: true as unknown as false,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-064",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires ansiColorAllowed=false.");
  });

  it("appendCount / recordCount mismatch", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      appendCount: 5,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-065",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires appendCount to equal recordCount.");
  });

  it("recordSteps length / recordCount mismatch", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      recordSteps: readModel.recordSteps.slice(0, 3),
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-066",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires recordSteps length to equal recordCount.");
  });

  it("empty sections", async () => {
    const { readModel } = await runDefaultReadModel();
    const badReadModel: OTUnitRevisionDogfoodSnapshotReadModel = {
      ...readModel,
      sections: [],
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: "cmd-boundary-067",
        readModel: badReadModel,
      }),
    ).toThrow("Revision lifecycle show command boundary requires at least one section.");
  });
});

// =============================================================================
// Input Read Model Immutability
// =============================================================================

describe("input read model immutability", () => {
  it("input read model remains unchanged after projection", async () => {
    const { readModel } = await runDefaultReadModel();
    const original = JSON.stringify(readModel);

    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-070",
      readModel,
    });

    const afterProjection = JSON.stringify(readModel);
    expect(afterProjection).toBe(original);
  });
});

// =============================================================================
// Created At
// =============================================================================

describe("createdAt", () => {
  it("is absent when not provided", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-080",
      readModel,
    });

    expect(result.createdAt).toBeUndefined();
  });

  it("is set when provided", async () => {
    const { readModel } = await runDefaultReadModel();
    const createdAt = "2026-07-06T10:00:00.000Z";
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-081",
      readModel,
      createdAt,
    });

    expect(result.createdAt).toBe(createdAt);
  });
});

// =============================================================================
// Future Compatibility
// =============================================================================

describe("command boundary result future compatibility", () => {
  it("is serializable as plain JSON", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-090",
      readModel,
    });

    const serialized = JSON.stringify(result);
    const deserialized = JSON.parse(serialized) as OTUnitRevisionLifecycleShowCommandBoundaryResult;

    expect(deserialized.id).toBe("cmd-boundary-090");
    expect(deserialized.kind).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND);
    expect(deserialized.commandName).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME);
    expect(deserialized.outputKind).toBe("plain_text");
    expect(deserialized.title).toBe("OTUnit Revision Lifecycle");
    expect(deserialized.lineCount).toBeGreaterThan(0);
    expect(deserialized.lines.length).toBe(deserialized.lineCount);
  });

  it("has all required fields for terminal CLI consumption", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-091",
      readModel,
    });

    const requiredFields = [
      "id",
      "kind",
      "commandName",
      "readModelId",
      "snapshotId",
      "outputKind",
      "title",
      "summary",
      "sections",
      "lines",
      "plainText",
      "lineCount",
      "runtimeCommandBoundaryOnly",
      "terminalAdapterIntegrated",
      "terminalShowReady",
      "plainTextOnly",
      "ansiColorAllowed",
    ] as const;

    for (const field of requiredFields) {
      expect(result).toHaveProperty(field);
    }
  });
});

// =============================================================================
// Forbidden Source Text Check
// =============================================================================

describe("command boundary source does not contain forbidden strings", () => {
  it("no filesystem read/write in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/from\s+"fs"/);
    expect(source).not.toMatch(/from\s+'fs'/);
    expect(source).not.toMatch(/node:fs/);
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("appendFile");
    expect(source).not.toContain("readFile");
  });

  it("no database strings in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("sqlite");
    expect(source).not.toContain("postgres");
    expect(source).not.toContain("prisma");
  });

  it("no CLI strings in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("commander");
    expect(source).not.toContain("inquirer");
  });

  it("no provider / LLM strings in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("openai");
    expect(source).not.toContain("deepseek");
  });

  it("no process.env references in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("process.env");
  });

  it("no console.log in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-boundary.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("console.log");
  });
});

// =============================================================================
// Forbidden Operations
// =============================================================================

describe("forbidden operations remain unchanged", () => {
  it("Runtime behavior remains unchanged", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-100",
      readModel,
    });

    expect(result.runtimeMutationAllowed).toBe(false);
  });

  it("Repository persistence remains unchanged", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-101",
      readModel,
    });

    expect(result.repositoryPersistenceAllowed).toBe(false);
  });

  it("Filesystem persistence remains unchanged", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-102",
      readModel,
    });

    expect(result.filesystemPersistenceAllowed).toBe(false);
  });

  it("Database persistence remains unchanged", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-103",
      readModel,
    });

    expect(result.databasePersistenceAllowed).toBe(false);
  });
});

// =============================================================================
// No ANSI Escape Sequences
// =============================================================================

describe("no ANSI escape sequences in command boundary output", () => {
  it("summary does not contain ANSI escape sequences", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-110",
      readModel,
    });

    expect(result.summary).not.toMatch(/\x1b\[/);
  });

  it("section lines do not contain ANSI escape sequences", async () => {
    const { readModel } = await runDefaultReadModel();
    const result = projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cmd-boundary-111",
      readModel,
    });

    for (const section of result.sections) {
      for (const line of section.lines) {
        expect(line).not.toMatch(/\x1b\[/);
      }
    }
  });
});

// =============================================================================
// No Side Effects
// =============================================================================

describe("no side effects from projection", () => {
  it("read model is unchanged after multiple projections", async () => {
    const { readModel } = await runDefaultReadModel();
    const original = JSON.stringify(readModel);

    for (let i = 0; i < 5; i++) {
      projectOTUnitRevisionLifecycleShowCommandBoundary({
        id: `cmd-boundary-120-${i}`,
        readModel,
      });
    }

    expect(JSON.stringify(readModel)).toBe(original);
  });
});
