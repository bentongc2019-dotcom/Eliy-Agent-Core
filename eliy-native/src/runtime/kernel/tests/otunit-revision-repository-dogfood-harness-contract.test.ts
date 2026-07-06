/**
 * OTUnit Revision Repository Dogfood Harness — Contract Test
 *
 * Verifies that the process-local dogfood harness correctly wires:
 *   revision intent -> preview -> proposed revised OTUnit -> decision
 *   -> supersession -> lifecycle projection -> repository read projection
 *
 * No CLI integration, no filesystem persistence, no database persistence,
 * no provider / real LLM integration, no runtime behavior change, and no
 * source OTUnit mutation or replacement.
 *
 * PR #60 -- Contract test only. No CLI, no filesystem, no DB, no LLM.
 * PR #50-#59 boundary / contract / adapter / projection surfaces remain untouched.
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND,
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

// =============================================================================
// Harness Source File Existence
// =============================================================================

describe("otunit-revision-repository-dogfood-harness.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-repository-dogfood-harness.ts",
    );
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  it("exports OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND", () => {
    expect(OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND).toBe(
      "otunit_revision_repository_dogfood_harness",
    );
  });

  it("exports runOTUnitRevisionRepositoryDogfoodHarness as a function", () => {
    expect(typeof runOTUnitRevisionRepositoryDogfoodHarness).toBe("function");
  });
});

// =============================================================================
// Default Harness Run
// =============================================================================

describe("runOTUnitRevisionRepositoryDogfoodHarness", () => {
  it("completes the full revision chain", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    expect(result.id).toBe("dogfood-run-001");
    expect(result.kind).toBe(OTUNIT_REVISION_REPOSITORY_DOGFOOD_HARNESS_KIND);
    expect(result.repositoryKind).toBe(
      IN_MEMORY_OTUNIT_REVISION_REPOSITORY_KIND,
    );

    expect(result.preview.id).toBe("dogfood-run-001-revision-preview");
    expect(result.preview.status).toBe("requires_confirmation");
    expect(result.preview.requiresConfirmation).toBe(true);
    expect(result.preview.source.otunitId).toBe("otunit-test-001");
    expect(result.preview.source.revisionIntentRecordId).toBe(
      "rev-intent-dogfood-001",
    );

    expect(result.proposedBoundary.id).toBe(
      "dogfood-run-001-proposed-boundary",
    );
    expect(result.proposedBoundary.status).toBe("proposed");
    expect(result.proposedBoundary.proposed.sourceOTUnitId).toBe(
      "otunit-test-001",
    );
    expect(
      result.proposedBoundary.proposed.revisionIntentRecordId,
    ).toBe("rev-intent-dogfood-001");
    expect(result.proposedBoundary.proposed.status).toBe("proposed");
    expect(result.proposedBoundary.proposed.requiresConfirmation).toBe(true);
    expect(result.proposedBoundary.proposed.sourceOTUnitMutationAllowed).toBe(
      false,
    );
    expect(
      result.proposedBoundary.proposed.sourceOTUnitStatusChangeAllowed,
    ).toBe(false);
    expect(result.proposedBoundary.proposed.autoReplaceSourceOTUnit).toBe(
      false,
    );

    expect(result.decisionBoundary.id).toBe(
      "dogfood-run-001-decision-boundary",
    );
    expect(result.decisionBoundary.status).toBe("accepted");
    expect(result.decisionBoundary.decision.status).toBe("accepted");
    expect(result.decisionBoundary.decision.proposedOTUnitId).toBe(
      result.proposedBoundary.proposed.id,
    );
    expect(result.decisionBoundary.decision.decidedBy).toBe("user");
    expect(result.decisionBoundary.runtimeMutationAllowed).toBe(false);
    expect(result.decisionBoundary.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.decisionBoundary.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.decisionBoundary.autoReplaceSourceOTUnit).toBe(false);

    expect(result.supersessionBoundary.id).toBe(
      "dogfood-run-001-supersession-boundary",
    );
    expect(result.supersessionBoundary.status).toBe("declared");
    expect(
      result.supersessionBoundary.relationRecord.sourceOTUnitId,
    ).toBe("otunit-test-001");
    expect(
      result.supersessionBoundary.relationRecord.revisedOTUnitId,
    ).toBe("otunit-test-001-revision-dogfood");
    expect(
      result.supersessionBoundary.relationRecord.relation,
    ).toBe("supersedes");
    expect(result.supersessionBoundary.relationRecord.versionLinkRequired).toBe(
      true,
    );
    expect(
      result.supersessionBoundary.relationRecord.sourceHistoryPreserved,
    ).toBe(true);
    expect(result.supersessionBoundary.runtimeMutationAllowed).toBe(false);
    expect(result.supersessionBoundary.repositoryPersistenceAllowed).toBe(false);
    expect(result.supersessionBoundary.sourceOTUnitMutationAllowed).toBe(false);
    expect(
      result.supersessionBoundary.sourceOTUnitStatusChangeAllowed,
    ).toBe(false);
    expect(result.supersessionBoundary.autoReplaceSourceOTUnit).toBe(false);

    expect(result.lifecycleProjection.id).toBe(
      "dogfood-run-001-lifecycle-projection",
    );
    expect(result.lifecycleProjection.sourceOTUnitId).toBe("otunit-test-001");
    expect(result.lifecycleProjection.revisionIntentRecordId).toBe(
      "rev-intent-dogfood-001",
    );
    expect(result.lifecycleProjection.currentStage).toBe(
      "supersession_declared",
    );
    expect(result.lifecycleProjection.decisionStatus).toBe("accepted");
    expect(result.lifecycleProjection.supersessionDeclared).toBe(true);
    expect(result.lifecycleProjection.runtimeMutationAllowed).toBe(false);
    expect(result.lifecycleProjection.repositoryPersistenceAllowed).toBe(false);
    expect(result.lifecycleProjection.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.lifecycleProjection.sourceOTUnitStatusChangeAllowed).toBe(
      false,
    );
    expect(result.lifecycleProjection.autoReplaceSourceOTUnit).toBe(false);
  });

  it("creates all 6 repository records in order", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    expect(result.records.revisionIntentRecord.kind).toBe(
      "revision_intent_snapshot",
    );
    expect(result.records.revisionPreviewRecord.kind).toBe("revision_preview");
    expect(result.records.proposedBoundaryRecord.kind).toBe(
      "proposed_revised_otunit_boundary",
    );
    expect(result.records.decisionBoundaryRecord.kind).toBe(
      "proposed_revised_otunit_decision_boundary",
    );
    expect(result.records.supersessionBoundaryRecord.kind).toBe(
      "supersession_boundary",
    );
    expect(result.records.lifecycleProjectionRecord.kind).toBe(
      "lifecycle_projection",
    );
  });

  it("each record has append-only invariants set", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    const allRecords = [
      result.records.revisionIntentRecord,
      result.records.revisionPreviewRecord,
      result.records.proposedBoundaryRecord,
      result.records.decisionBoundaryRecord,
      result.records.supersessionBoundaryRecord,
      result.records.lifecycleProjectionRecord,
    ];

    for (const record of allRecords) {
      expect(record.appendOnly).toBe(true);
      expect(record.sourceOTUnitMutationAllowed).toBe(false);
      expect(record.sourceOTUnitStatusChangeAllowed).toBe(false);
      expect(record.sourceOTUnitReplacementAllowed).toBe(false);
      expect(record.autoReplaceSourceOTUnit).toBe(false);
    }
  });

  it("returns 6 append results, one per record", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    expect(result.appendResults).toHaveLength(6);

    for (const appendResult of result.appendResults) {
      expect(appendResult.appended).toBe(true);
      expect(appendResult.appendOnly).toBe(true);
      expect(appendResult.sourceOTUnitMutationAllowed).toBe(false);
      expect(appendResult.sourceOTUnitStatusChangeAllowed).toBe(false);
      expect(appendResult.sourceOTUnitReplacementAllowed).toBe(false);
      expect(appendResult.autoReplaceSourceOTUnit).toBe(false);
    }
  });

  it("append results are ordered: intent preview proposed decision supersession lifecycle", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    const expectedKinds = [
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ] as const;

    for (let i = 0; i < expectedKinds.length; i++) {
      expect(result.appendResults[i].kind).toBe(expectedKinds[i]);
    }
  });

  it("read projection shows 1 chain with 6 records", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    expect(result.readProjection.id).toBe(
      "dogfood-run-001-repository-read-projection",
    );
    expect(result.readProjection.kind).toBe(
      "otunit_revision_repository_read_projection",
    );
    expect(result.readProjection.sourceOTUnitId).toBe("otunit-test-001");
    expect(result.readProjection.chainCount).toBe(1);
    expect(result.readProjection.recordCount).toBe(6);
    expect(result.readProjection.chains).toHaveLength(1);

    const chain = result.readProjection.chains[0];
    expect(chain.sourceOTUnitId).toBe("otunit-test-001");
    expect(chain.recordCount).toBe(6);
    expect(chain.recordKinds).toEqual([
      "revision_intent_snapshot",
      "revision_preview",
      "proposed_revised_otunit_boundary",
      "proposed_revised_otunit_decision_boundary",
      "supersession_boundary",
      "lifecycle_projection",
    ]);
  });

  it("read projection reports supersession_declared stage", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    const chain = result.readProjection.chains[0];
    expect(chain.currentStage).toBe("supersession_declared");
    expect(chain.decisionStatus).toBe("accepted");
    expect(chain.supersessionDeclared).toBe(true);
  });

  it("read projection has read-only invariants", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    expect(result.readProjection.appendOnly).toBe(true);
    expect(result.readProjection.repositoryReadOnly).toBe(true);
    expect(result.readProjection.runtimeMutationAllowed).toBe(false);
    expect(result.readProjection.repositoryPersistenceAllowed).toBe(false);
    expect(result.readProjection.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.readProjection.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.readProjection.sourceOTUnitReplacementAllowed).toBe(false);
    expect(result.readProjection.autoReplaceSourceOTUnit).toBe(false);
  });

  it("source OTUnit is unchanged after harness run", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

    expect(result.sourceSnapshotAfterDogfood.id).toBe("otunit-test-001");
    expect(result.sourceSnapshotAfterDogfood.title).toBe("Test OTUnit");
    expect(result.sourceSnapshotAfterDogfood.status).toBe("active");
    expect(result.sourceSnapshotAfterDogfood.owner).toBe("test-user");
  });

  it("all safety flags are false", async () => {
    const result = await runOTUnitRevisionRepositoryDogfoodHarness(
      makeDefaultInput(),
    );

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
// Input Record Immutability
// =============================================================================

describe("input immutability", () => {
  it("source snapshot is not mutated by harness run", async () => {
    const input = makeDefaultInput();
    const originalId = input.sourceSnapshot.id;
    const originalTitle = input.sourceSnapshot.title;
    const originalStatus = input.sourceSnapshot.status;

    await runOTUnitRevisionRepositoryDogfoodHarness(input);

    expect(input.sourceSnapshot.id).toBe(originalId);
    expect(input.sourceSnapshot.title).toBe(originalTitle);
    expect(input.sourceSnapshot.status).toBe(originalStatus);
  });

  it("revision intent is not mutated by harness run", async () => {
    const input = makeDefaultInput();
    const originalId = input.revisionIntent.id;
    const originalReason = input.revisionIntent.reasonText;

    await runOTUnitRevisionRepositoryDogfoodHarness(input);

    expect(input.revisionIntent.id).toBe(originalId);
    expect(input.revisionIntent.reasonText).toBe(originalReason);
  });
});

// =============================================================================
// Forbidden Source Text Check
// =============================================================================

describe("harness source does not contain forbidden strings", () => {
  it("harness source does not contain forbidden persistence / CLI / provider text", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-repository-dogfood-harness.ts",
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
