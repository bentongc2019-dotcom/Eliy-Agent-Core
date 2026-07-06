/**
 * OTUnit Revision Lifecycle Show Command Adapter — Contract Test
 *
 * Verifies that the terminal adapter contract correctly turns a
 * revision lifecycle show command boundary result into deterministic
 * plain-text terminal adapter output.
 *
 * No CLI registration, no CLI file changes, no filesystem persistence,
 * no database persistence, no provider / real LLM integration,
 * no runtime behavior change, and no source OTUnit mutation or replacement.
 *
 * Pure static contract test. No side effects. No file I/O in production code.
 *
 * PR #64 — Terminal adapter contract only.
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
} from "../otunit-revision-lifecycle-show-command-boundary";

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND,
  OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME,
  projectOTUnitRevisionLifecycleShowCommandAdapter,
} from "../otunit-revision-lifecycle-show-command-adapter";

import type {
  OTUnitRevisionLifecycleShowCommandAdapterResult,
  ProjectOTUnitRevisionLifecycleShowCommandAdapterInput,
} from "../otunit-revision-lifecycle-show-command-adapter";

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
    objective: "Test the OTUnit revision lifecycle show command adapter.",
    owner: "test-user",
    dueDate: "2026-07-30",
    judgmentCriteria: "Adapter should produce deterministic plain-text terminal output.",
    planOrActionItems: ["Step 1: Create read model", "Step 2: Project adapter output"],
    evidenceRefs: ["ev-adapter-001"],
    status: "active",
    ...overrides,
  };
}

function makeRevisionIntent(
  overrides?: Partial<OTUnitRevisionIntentSnapshot>,
): OTUnitRevisionIntentSnapshot {
  return {
    id: "rev-intent-adapter-001",
    sourceOTUnitId: "otunit-test-001",
    reasonText: "Need to verify adapter projection.",
    directionText: "Project command boundary result into adapter result.",
    evidenceRefs: ["ev-adapter-001", "ev-adapter-002"],
    ...overrides,
  };
}

function makeRevisionPatch(
  overrides?: Partial<OTUnitRevisionPreviewPatch>,
): OTUnitRevisionPreviewPatch {
  return {
    title: "Test OTUnit (Revised — Adapter)",
    objective: "Verify adapter projection from command boundary result.",
    owner: "test-user",
    dueDate: "2026-08-15",
    judgmentCriteria: "Adapter must produce deterministic plain-text terminal output.",
    planOrActionItems: [
      "Create read model.",
      "Project through show command boundary.",
      "Project through terminal adapter.",
    ],
    evidenceRefs: ["ev-adapter-001", "ev-adapter-002"],
    ...overrides,
  };
}

function makeDefaultHarnessInput(): RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  return {
    id: "dogfood-adapter-001",
    sourceSnapshot: makeSourceOTUnitSnapshot(),
    revisionIntent: makeRevisionIntent(),
    proposedPatch: makeRevisionPatch(),
  };
}

async function runDefaultBoundaryResult(): Promise<{
  harnessResult: OTUnitRevisionRepositoryDogfoodHarnessResult;
  snapshot: OTUnitRevisionRepositoryDogfoodSnapshot;
  readModel: OTUnitRevisionDogfoodSnapshotReadModel;
  boundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult;
}> {
  const harnessResult = await runOTUnitRevisionRepositoryDogfoodHarness(
    makeDefaultHarnessInput(),
  );
  const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
    id: "snapshot-adapter-001",
    harnessResult,
  });
  const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
    id: "read-model-adapter-001",
    snapshot,
  });
  const boundaryResult = projectOTUnitRevisionLifecycleShowCommandBoundary({
    id: "boundary-adapter-001",
    readModel,
  });

  return { harnessResult, snapshot, readModel, boundaryResult };
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

// =============================================================================
// Source File Existence
// =============================================================================

describe("otunit-revision-lifecycle-show-command-adapter.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-adapter.ts",
    );
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  it("exports OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND).toBe(
      "otunit_revision_lifecycle_show_command_adapter",
    );
  });

  it("exports OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME).toBe(
      "terminal:otunit:revision:lifecycle:show",
    );
  });

  it("exports projectOTUnitRevisionLifecycleShowCommandAdapter as a function", () => {
    expect(typeof projectOTUnitRevisionLifecycleShowCommandAdapter).toBe("function");
  });
});

// =============================================================================
// Adapter Kind & Name
// =============================================================================

describe("adapter kind and name", () => {
  it("has kind otunit_revision_lifecycle_show_command_adapter", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND).toBe(
      "otunit_revision_lifecycle_show_command_adapter",
    );
  });

  it("has terminal adapter name terminal:otunit:revision:lifecycle:show", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME).toBe(
      "terminal:otunit:revision:lifecycle:show",
    );
  });
});

// =============================================================================
// Default Adapter Projection
// =============================================================================

describe("projectOTUnitRevisionLifecycleShowCommandAdapter", () => {
  it("projects a complete adapter result from a valid command boundary result", async () => {
    const { readModel, boundaryResult } = await runDefaultBoundaryResult();
    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-001",
      boundaryResult,
    });

    expect(result.id).toBe("adapter-001");
    expect(result.kind).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND);
    expect(result.adapterName).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME);
    expect(result.commandName).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME);
    expect(result.boundaryResultId).toBe(boundaryResult.id);
    expect(result.readModelId).toBe(readModel.id);
    expect(result.snapshotId).toBe(readModel.snapshotId);
    expect(result.stdout).toBe(boundaryResult.plainText);
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(result.outputKind).toBe("plain_text");
    expect(result.lineCount).toBe(boundaryResult.lineCount);
    expect(result.byteLength).toBe(utf8ByteLength(boundaryResult.plainText));
  });

  it("sets terminal adapter contract flags to the expected read-only values", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-002",
      boundaryResult,
    });

    expect(result.terminalAdapterContractOnly).toBe(true);
    expect(result.terminalAdapterIntegrated).toBe(false);
    expect(result.cliCommandRegistered).toBe(false);
    expect(result.terminalShowReady).toBe(true);
    expect(result.plainTextOnly).toBe(true);
    expect(result.ansiColorAllowed).toBe(false);
    expect(result.runtimeMutationAllowed).toBe(false);
    expect(result.repositoryPersistenceAllowed).toBe(false);
    expect(result.filesystemPersistenceAllowed).toBe(false);
    expect(result.databasePersistenceAllowed).toBe(false);
    expect(result.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.sourceOTUnitReplacementAllowed).toBe(false);
    expect(result.autoReplaceSourceOTUnit).toBe(false);
  });
});

// =============================================================================
// Projection Rejections
// =============================================================================

describe("projection rejects invalid boundary result", () => {
  it("missing boundary result id", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      id: "",
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-010",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires boundary result id.");
  });

  it("missing read model id", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      readModelId: "",
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-011",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires read model id.");
  });

  it("missing snapshot id", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      snapshotId: "",
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-012",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires snapshot id.");
  });

  it("wrong command name", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      commandName: "otunit:revision:lifecycle:preview" as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-013",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow(
      "Revision lifecycle show command adapter requires revision lifecycle show command name.",
    );
  });

  it("wrong output kind", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      outputKind: "json" as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-014",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires plain_text output.");
  });

  it("terminalShowReady is not true", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      terminalShowReady: false as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-015",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires terminalShowReady=true.");
  });

  it("plainTextOnly is not true", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      plainTextOnly: false as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-016",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires plainTextOnly=true.");
  });

  it("ansiColorAllowed is not false", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      ansiColorAllowed: true as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-017",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires ansiColorAllowed=false.");
  });

  it("runtimeCommandBoundaryOnly is not true", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      runtimeCommandBoundaryOnly: false as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-018",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow(
      "Revision lifecycle show command adapter requires runtimeCommandBoundaryOnly=true.",
    );
  });

  it("terminalAdapterIntegrated is not false", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      terminalAdapterIntegrated: true as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-019",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow(
      "Revision lifecycle show command adapter requires terminalAdapterIntegrated=false.",
    );
  });

  it("empty plainText", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      plainText: "",
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-020",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires non-empty plainText.");
  });

  it("lineCount mismatch", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      lineCount: boundaryResult.lineCount + 1,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-021",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires lines length to equal lineCount.");
  });

  it("plainText does not equal joined lines", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      plainText: `${boundaryResult.plainText}\nextra`,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-022",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires plainText to equal joined lines.");
  });
});

// =============================================================================
// Plain Text Constraints
// =============================================================================

describe("plain text constraints", () => {
  it("rejects ANSI escape sequences in title", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      title: "OTUnit Revision Lifecycle\u001b[31m" as never,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-030",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires plain text: title.");
  });

  it("rejects ANSI escape sequences in summary", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      summary: `${boundaryResult.summary}\u001b[31m`,
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-031",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires plain text: summary.");
  });

  it("rejects ANSI escape sequences in plainText", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const escape = "\u001b[31m";
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      lines: boundaryResult.lines.map((line, index) =>
        index === 0 ? `${line}${escape}` : line,
      ),
      plainText: boundaryResult.lines
        .map((line, index) => (index === 0 ? `${line}${escape}` : line))
        .join("\n"),
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-032",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow("Revision lifecycle show command adapter requires plain text: plainText.");
  });

  it("rejects ANSI escape sequences in a section title", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const escape = "\u001b[31m";
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      sections: boundaryResult.sections.map((section, index) =>
        index === 0
          ? { ...section, title: `${section.title}\u001b[31m` }
          : section,
      ),
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-033",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow(
      `Revision lifecycle show command adapter requires plain text: section title Record Steps${escape}.`,
    );
  });

  it("rejects ANSI escape sequences in a section line", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const badBoundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult = {
      ...boundaryResult,
      sections: boundaryResult.sections.map((section, index) =>
        index === 0
          ? {
              ...section,
              lines: section.lines.map((line, lineIndex) =>
                lineIndex === 0 ? `${line}\u001b[31m` : line,
              ),
            }
          : section,
      ),
    };

    expect(() =>
      projectOTUnitRevisionLifecycleShowCommandAdapter({
        id: "adapter-034",
        boundaryResult: badBoundaryResult,
      }),
    ).toThrow(
      "Revision lifecycle show command adapter requires plain text: section line Record Steps.",
    );
  });
});

// =============================================================================
// Input Immutability
// =============================================================================

describe("input boundary result immutability", () => {
  it("input boundary result remains unchanged after projection", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const original = JSON.stringify(boundaryResult);

    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-040",
      boundaryResult,
    });

    expect(JSON.stringify(boundaryResult)).toBe(original);
    expect(result.boundaryResultId).toBe(boundaryResult.id);
  });
});

// =============================================================================
// Created At
// =============================================================================

describe("createdAt", () => {
  it("is absent when not provided", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-050",
      boundaryResult,
    });

    expect(result.createdAt).toBeUndefined();
  });

  it("is set when provided", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const createdAt = "2026-07-06T10:00:00.000Z";
    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-051",
      boundaryResult,
      createdAt,
    });

    expect(result.createdAt).toBe(createdAt);
  });
});

// =============================================================================
// Future Compatibility
// =============================================================================

describe("terminal adapter result future compatibility", () => {
  it("is serializable as plain JSON", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-060",
      boundaryResult,
    });

    const serialized = JSON.stringify(result);
    const deserialized = JSON.parse(serialized) as OTUnitRevisionLifecycleShowCommandAdapterResult;

    expect(deserialized.id).toBe("adapter-060");
    expect(deserialized.kind).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND);
    expect(deserialized.adapterName).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME);
    expect(deserialized.commandName).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME);
    expect(deserialized.outputKind).toBe("plain_text");
    expect(deserialized.stderr).toBe("");
    expect(deserialized.exitCode).toBe(0);
    expect(deserialized.lineCount).toBeGreaterThan(0);
    expect(deserialized.stdout.length).toBeGreaterThan(0);
  });

  it("has all required fields for terminal consumption", async () => {
    const { boundaryResult } = await runDefaultBoundaryResult();
    const result = projectOTUnitRevisionLifecycleShowCommandAdapter({
      id: "adapter-061",
      boundaryResult,
    });

    const requiredFields = [
      "id",
      "kind",
      "adapterName",
      "commandName",
      "boundaryResultId",
      "readModelId",
      "snapshotId",
      "stdout",
      "stderr",
      "exitCode",
      "outputKind",
      "lineCount",
      "byteLength",
      "terminalAdapterContractOnly",
      "terminalAdapterIntegrated",
      "cliCommandRegistered",
      "terminalShowReady",
      "plainTextOnly",
      "ansiColorAllowed",
      "runtimeMutationAllowed",
      "repositoryPersistenceAllowed",
      "filesystemPersistenceAllowed",
      "databasePersistenceAllowed",
      "sourceOTUnitMutationAllowed",
      "sourceOTUnitStatusChangeAllowed",
      "sourceOTUnitReplacementAllowed",
      "autoReplaceSourceOTUnit",
    ] as const;

    for (const field of requiredFields) {
      expect(result).toHaveProperty(field);
    }
  });
});

// =============================================================================
// Forbidden Source Text Check
// =============================================================================

describe("adapter source does not contain forbidden strings", () => {
  it("no filesystem read/write in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-adapter.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/from\s+"fs"/);
    expect(source).not.toMatch(/from\s+'fs'/);
    expect(source).not.toContain("node:fs");
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("appendFile");
    expect(source).not.toContain("readFile");
  });

  it("no database strings in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-adapter.ts",
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
      "../otunit-revision-lifecycle-show-command-adapter.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("commander");
    expect(source).not.toContain("inquirer");
  });

  it("no provider / LLM strings in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-adapter.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("openai");
    expect(source).not.toContain("deepseek");
  });

  it("no process.env or .env references in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-command-adapter.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("process.env");
    expect(source).not.toContain(".env");
  });
});
