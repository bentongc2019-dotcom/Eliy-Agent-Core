import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "../otunit-revision-chain-boundary";

import type { OTUnitRevisionPreviewRuntimeCommandBoundaryResult } from "../otunit-revision-preview-runtime-command-boundary";

function buildSourceSnapshot(
  overrides: Partial<SourceOTUnitSnapshot> = {},
): SourceOTUnitSnapshot {
  return {
    id: "otunit_001",
    title: "Complete first customer interview batch",
    objective: "Validate the core value proposition with 5 target customers.",
    owner: "rich",
    dueDate: "2026-07-31",
    judgmentCriteria:
      "The owner can judge completion using one observable customer interview outcome.",
    planOrActionItems: [
      "Draft interview checklist.",
      "Recruit 5 target customers.",
      "Conduct and record interviews.",
    ],
    evidenceRefs: ["evidence_001"],
    status: "active",
    ...overrides,
  };
}

function buildRevisionIntent(
  overrides: Partial<OTUnitRevisionIntentSnapshot> = {},
): OTUnitRevisionIntentSnapshot {
  return {
    id: "revision_intent_001",
    sourceOTUnitId: "otunit_001",
    reasonText:
      "Current OTUnit needs a runtime command preview before confirmation.",
    directionText:
      "Project the source OTUnit and revision intent into a preview-only boundary.",
    evidenceRefs: ["evidence_001", "evidence_002"],
    ...overrides,
  };
}

function buildProposedPatch(
  overrides: Partial<OTUnitRevisionPreviewPatch> = {},
): OTUnitRevisionPreviewPatch {
  return {
    title: "Complete first customer interview batch (Preview)",
    objective:
      "Validate the core value proposition with a preview-only revision boundary.",
    owner: "rich",
    dueDate: "2026-08-15",
    judgmentCriteria:
      "The owner can judge completion after confirming the preview.",
    planOrActionItems: [
      "Draft the preview-only boundary.",
      "Keep the source OTUnit unchanged.",
    ],
    evidenceRefs: ["evidence_001", "evidence_002"],
    ...overrides,
  };
}

async function buildPreviewCommandResult(): Promise<OTUnitRevisionPreviewRuntimeCommandBoundaryResult> {
  const previewModule = await import(
    "../otunit-revision-preview-runtime-command-boundary"
  );

  const sourceSnapshot = buildSourceSnapshot();
  const revisionIntent = buildRevisionIntent();
  const proposedPatch = buildProposedPatch();

  return previewModule.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
    id: "preview_command_boundary_001",
    sourceSnapshot,
    revisionIntent,
    proposedPatch,
    previewSummary: "Runtime command preview boundary.",
    createdAt: "2026-07-07T00:00:00.000Z",
  });
}

function buildConfirmedDecision(previewId: string) {
  return {
    previewId,
    status: "confirmed" as const,
    decidedBy: "user" as const,
    reason: "User confirmed the revision preview.",
    createdAt: "2026-07-07T00:01:00.000Z",
  };
}

function readSourceText(relativePath: string): string {
  return execSync(`cat '${relativePath}'`, { encoding: "utf8" });
}

describe("otunit-proposed-revised-otunit-runtime-projection-command-boundary", () => {
  it("exists and exports the runtime projection boundary surface", async () => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );

    expect(
      mod.OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND,
    ).toBe("otunit_proposed_revised_otunit_runtime_projection_command_boundary");
    expect(
      mod.OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_NAME,
    ).toBe("otunit:revision:proposed-revised-otunit:project");
    expect(
      typeof mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary,
    ).toBe("function");
  });

  it("projects a confirmed preview into a proposed revised OTUnit runtime projection boundary result", async () => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );

    const sourceSnapshot = buildSourceSnapshot();
    const previewCommandResult = await buildPreviewCommandResult();
    const decision = buildConfirmedDecision(previewCommandResult.preview.id);
    const sourceSnapshotBefore = structuredClone(sourceSnapshot);
    const previewCommandResultBefore = structuredClone(previewCommandResult);
    const decisionBefore = structuredClone(decision);

    const result =
      mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary({
        id: "projection_command_boundary_001",
        sourceSnapshot,
        previewCommandResult,
        decision,
        proposedOTUnitId: "proposed_revised_otunit_001",
        createdAt: "2026-07-07T00:02:00.000Z",
      });

    expect(result).toEqual({
      id: "projection_command_boundary_001",
      kind:
        "otunit_proposed_revised_otunit_runtime_projection_command_boundary",
      commandName: "otunit:revision:proposed-revised-otunit:project",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      previewId: "preview_command_boundary_001-revision-preview",
      proposedOTUnitId: "proposed_revised_otunit_001",
      outputKind: "proposed_revised_otunit_projection",
      status: "requires_confirmation",
      decisionStatus: "confirmed",
      proposedBoundary: {
        id: "projection_command_boundary_001-proposed-revised-otunit-boundary",
        sourceSnapshot: sourceSnapshotBefore,
        proposed: {
          id: "proposed_revised_otunit_001",
          sourceOTUnitId: "otunit_001",
          revisionPreviewId: "preview_command_boundary_001-revision-preview",
          revisionIntentRecordId: "revision_intent_001",
          status: "proposed",
          title: "Complete first customer interview batch (Preview)",
          objective:
            "Validate the core value proposition with a preview-only revision boundary.",
          owner: "rich",
          dueDate: "2026-08-15",
          judgmentCriteria:
            "The owner can judge completion after confirming the preview.",
          planOrActionItems: [
            "Draft the preview-only boundary.",
            "Keep the source OTUnit unchanged.",
          ],
          evidenceRefs: ["evidence_001", "evidence_002"],
          requiresConfirmation: true,
          sourceOTUnitMutationAllowed: false,
          sourceOTUnitStatusChangeAllowed: false,
          sourceOTUnitReplacementAllowed: false,
          autoReplaceSourceOTUnit: false,
          createdAt: "2026-07-07T00:02:00.000Z",
        },
        status: "proposed",
      },
      runtimeCommandBoundaryOnly: true,
      cliCommandRegistered: false,
      terminalAdapterIntegrated: false,
      repositoryAppendAllowed: false,
      repositoryPersistenceAllowed: false,
      projectionCreated: true,
      proposedRevisedOTUnitProjected: true,
      proposedRevisedOTUnitPersisted: false,
      requiresConfirmation: true,
      runtimeMutationAllowed: false,
      filesystemPersistenceAllowed: false,
      databasePersistenceAllowed: false,
      providerIntegrationAllowed: false,
      realLLMAllowed: false,
      environmentReadAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      sourceOTUnitReplacementAllowed: false,
      newOTUnitCreated: false,
      autoReplaceSourceOTUnit: false,
      createdAt: "2026-07-07T00:02:00.000Z",
    });

    expect(decision).toEqual(decisionBefore);
    expect(previewCommandResult).toEqual(previewCommandResultBefore);
    expect(sourceSnapshot).toEqual(sourceSnapshotBefore);
    expect(decision.previewId).toBe(previewCommandResult.preview.id);
    expect(result.proposedBoundary.proposed.id).toBe(
      result.proposedOTUnitId,
    );
    expect(result.proposedBoundary.proposed.sourceOTUnitId).toBe(
      result.sourceOTUnitId,
    );
    expect(result.proposedBoundary.proposed.revisionPreviewId).toBe(
      result.previewId,
    );
    expect(result.proposedBoundary.proposed.requiresConfirmation).toBe(true);
    expect(result.proposedBoundary.proposed.sourceOTUnitMutationAllowed).toBe(
      false,
    );
    expect(
      result.proposedBoundary.proposed.sourceOTUnitStatusChangeAllowed,
    ).toBe(false);
    expect(
      (
        result.proposedBoundary.proposed as {
          sourceOTUnitReplacementAllowed?: boolean;
        }
      ).sourceOTUnitReplacementAllowed,
    ).toBe(false);
    expect(result.proposedBoundary.proposed.autoReplaceSourceOTUnit).toBe(
      false,
    );
  });

  it.each([
    [
      "missing input id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        id: " ",
      }),
      "Proposed revised OTUnit runtime projection command boundary requires id.",
    ],
    [
      "missing source OTUnit id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        sourceSnapshot: buildSourceSnapshot({ id: "   " }),
      }),
      "Proposed revised OTUnit runtime projection command boundary requires source OTUnit id.",
    ],
    [
      "missing preview command source OTUnit id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        previewCommandResult: {
          ...input.previewCommandResult,
          sourceOTUnitId: " ",
        },
      }),
      "Proposed revised OTUnit runtime projection command boundary requires preview command source OTUnit id.",
    ],
    [
      "missing revision intent record id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        previewCommandResult: {
          ...input.previewCommandResult,
          revisionIntentRecordId: " ",
        },
      }),
      "Proposed revised OTUnit runtime projection command boundary requires revision intent record id.",
    ],
    [
      "missing proposed OTUnit id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        proposedOTUnitId: " ",
      }),
      "Proposed revised OTUnit runtime projection command boundary requires proposed OTUnit id.",
    ],
  ])("%s", async (_label, mutateInput, expectedMessage) => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const decision = buildConfirmedDecision(previewCommandResult.preview.id);
    const baseInput = {
      id: "projection_command_boundary_002",
      sourceSnapshot: buildSourceSnapshot(),
      previewCommandResult,
      decision,
      proposedOTUnitId: "proposed_revised_otunit_002",
    };
    const input = mutateInput(baseInput);

    expect(() =>
      mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary(
        input as never,
      ),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "preview command outputKind not revision_preview",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        outputKind: "not_revision_preview" as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires revision preview output.",
    ],
    [
      "preview command status not requires_confirmation",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        status: "confirmed" as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires preview status requires_confirmation.",
    ],
    [
      "previewCreated=false",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        previewCreated: false as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires previewCreated=true.",
    ],
    [
      "preview requiresConfirmation=false",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        requiresConfirmation: false as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires preview requiresConfirmation=true.",
    ],
    [
      "preview command runtimeMutationAllowed=true",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        runtimeMutationAllowed: true as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires runtimeMutationAllowed=false.",
    ],
    [
      "preview command sourceOTUnitMutationAllowed=true",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires sourceOTUnitMutationAllowed=false.",
    ],
    [
      "preview command newOTUnitCreated=true",
      (previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult) => ({
        ...previewCommandResult,
        newOTUnitCreated: true as never,
      }),
      "Proposed revised OTUnit runtime projection command boundary requires newOTUnitCreated=false.",
    ],
  ])("%s", async (_label, mutatePreviewCommandResult, expectedMessage) => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const decision = buildConfirmedDecision(previewCommandResult.preview.id);
    const sourceSnapshot = buildSourceSnapshot();

    expect(() =>
      mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary({
        id: "projection_command_boundary_003",
        sourceSnapshot,
        previewCommandResult: mutatePreviewCommandResult(previewCommandResult),
        decision,
        proposedOTUnitId: "proposed_revised_otunit_003",
      }),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "source snapshot / preview command source OTUnit mismatch",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        sourceSnapshot: buildSourceSnapshot({ id: "otunit_999" }),
      }),
      "Proposed revised OTUnit runtime projection command boundary requires source snapshot to match preview command source OTUnit.",
    ],
    [
      "preview source OTUnit / source snapshot mismatch",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        previewCommandResult: {
          ...input.previewCommandResult,
          preview: {
            ...input.previewCommandResult.preview,
            source: {
              ...input.previewCommandResult.preview.source,
              otunitId: "otunit_999",
            },
          },
        },
      }),
      "Proposed revised OTUnit runtime projection command boundary requires preview source OTUnit to match source snapshot.",
    ],
    [
      "preview revision intent / command result mismatch",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        previewCommandResult: {
          ...input.previewCommandResult,
          preview: {
            ...input.previewCommandResult.preview,
            source: {
              ...input.previewCommandResult.preview.source,
              revisionIntentRecordId: "revision_intent_999",
            },
          },
        },
      }),
      "Proposed revised OTUnit runtime projection command boundary requires preview revision intent to match command result.",
    ],
    [
      "decision previewId / preview id mismatch",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        decision: {
          ...input.decision,
          previewId: "preview_command_boundary_999",
        },
      }),
      "Proposed revised OTUnit runtime projection command boundary requires decision previewId to match preview id.",
    ],
    [
      "decision status not confirmed",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        decision: ReturnType<typeof buildConfirmedDecision>;
        proposedOTUnitId: string;
      }) => ({
        ...input,
        decision: {
          ...input.decision,
          status: "rejected" as const,
        },
      }),
      "Proposed revised OTUnit runtime projection command boundary requires confirmed preview decision.",
    ],
  ])("%s", async (_label, mutateInput, expectedMessage) => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );
    const sourceSnapshot = buildSourceSnapshot();
    const previewCommandResult = await buildPreviewCommandResult();
    const decision = buildConfirmedDecision(previewCommandResult.preview.id);
    const baseInput = {
      id: "projection_command_boundary_004",
      sourceSnapshot,
      previewCommandResult,
      decision,
      proposedOTUnitId: "proposed_revised_otunit_004",
    };
    const input = mutateInput(baseInput);

    expect(() =>
      mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary(
        input as never,
      ),
    ).toThrow(expectedMessage);
  });

  it("does not mutate the input snapshots or confirmed decision", async () => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );

    const sourceSnapshot = buildSourceSnapshot();
    const previewCommandResult = await buildPreviewCommandResult();
    const decision = buildConfirmedDecision(previewCommandResult.preview.id);

    const sourceSnapshotBefore = structuredClone(sourceSnapshot);
    const previewCommandResultBefore = structuredClone(previewCommandResult);
    const decisionBefore = structuredClone(decision);

    mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary({
      id: "projection_command_boundary_005",
      sourceSnapshot,
      previewCommandResult,
      decision,
      proposedOTUnitId: "proposed_revised_otunit_005",
      createdAt: "2026-07-07T00:03:00.000Z",
    });

    expect(sourceSnapshot).toEqual(sourceSnapshotBefore);
    expect(previewCommandResult).toEqual(previewCommandResultBefore);
    expect(decision).toEqual(decisionBefore);
  });

  it("keeps the runtime projection boundary implementation purely projected", async () => {
    const mod = await import(
      "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
    );
    const source = mod.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary.toString();
    const escapeCharacter = String.fromCharCode(27);

    const forbiddenTerms = [
      ["process", ".", "env"].join(""),
      [".", "env"].join(""),
      ["from", " ", '"', "fs", '"'].join(""),
      ["from", " ", "'", "fs", "'"].join(""),
      ["node", ":", "fs"].join(""),
      ["write", "File"].join(""),
      ["append", "File"].join(""),
      ["read", "File"].join(""),
      ["s", "qlite"].join(""),
      ["pos", "tgres"].join(""),
      ["pri", "sma"].join(""),
      ["o", "pen", "ai"].join(""),
      ["dee", "pseek"].join(""),
      ["comm", "ander"].join(""),
      ["in", "quirer"].join(""),
      ["ch", "alk"].join(""),
      ["kl", "eur"].join(""),
      ["pic", "ocolors"].join(""),
      escapeCharacter,
      ["***", " End of File"].join(""),
    ];

    for (const term of forbiddenTerms) {
      expect(source).not.toContain(term);
    }
  });

  it("keeps the runtime projection boundary source free of forbidden runtime integrations", () => {
    const moduleSource = readSourceText(
      "src/runtime/kernel/otunit-proposed-revised-otunit-runtime-projection-command-boundary.ts",
    );
    const testSource = readSourceText(
      "src/runtime/kernel/tests/otunit-proposed-revised-otunit-runtime-projection-command-boundary-contract.test.ts",
    );

    const forbiddenTerms = [
      ["process", ".", "env"].join(""),
      [".", "env"].join(""),
      ["from", " ", '"', "fs", '"'].join(""),
      ["from", " ", "'", "fs", "'"].join(""),
      ["node", ":", "fs"].join(""),
      ["write", "File"].join(""),
      ["append", "File"].join(""),
      ["read", "File"].join(""),
      ["s", "qlite"].join(""),
      ["pos", "tgres"].join(""),
      ["pri", "sma"].join(""),
      ["o", "pen", "ai"].join(""),
      ["dee", "pseek"].join(""),
      ["comm", "ander"].join(""),
      ["in", "quirer"].join(""),
      ["ch", "alk"].join(""),
      ["kl", "eur"].join(""),
      ["pic", "ocolors"].join(""),
      String.fromCharCode(27),
      String.fromCharCode(27).replace(String.fromCharCode(27), String.fromCharCode(27)),
      ["***", " End of File"].join(""),
    ];

    for (const term of forbiddenTerms) {
      expect(moduleSource).not.toContain(term);
      expect(testSource).not.toContain(term);
    }
  });

  it("keeps CLI files unchanged", () => {
    const status = execSync("git status --short --untracked-files=all", {
      encoding: "utf8",
    });

    expect(status).not.toContain("eliy-native/src/cli/");
  });
});
