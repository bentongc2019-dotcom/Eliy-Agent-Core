import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "../otunit-revision-chain-boundary";

import type {
  OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
} from "../otunit-revision-preview-runtime-command-boundary";

import type {
  OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
} from "../otunit-proposed-revised-otunit-runtime-projection-command-boundary";

import type {
  OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
} from "../otunit-revision-decision-runtime-command-boundary";

import type {
  OTUnitSupersessionBoundaryRecord,
} from "../otunit-revision-chain-boundary";

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

async function buildPreviewRuntimeCommandBoundaryResult(): Promise<OTUnitRevisionPreviewRuntimeCommandBoundaryResult> {
  const previewModule = await import(
    "../otunit-revision-preview-runtime-command-boundary"
  );

  return previewModule.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
    id: "preview_runtime_command_boundary_001",
    sourceSnapshot: buildSourceSnapshot(),
    revisionIntent: buildRevisionIntent(),
    proposedPatch: buildProposedPatch(),
    previewSummary: "Runtime command preview boundary.",
    createdAt: "2026-07-07T00:00:00.000Z",
  });
}

function buildConfirmedPreviewDecision(previewId: string) {
  return {
    previewId,
    status: "confirmed" as const,
    decidedBy: "user" as const,
    reason: "User confirmed the revision preview.",
    createdAt: "2026-07-07T00:01:00.000Z",
  };
}

async function buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult(): Promise<OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult> {
  const projectionModule = await import(
    "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
  );
  const previewRuntimeCommandBoundaryResult =
    await buildPreviewRuntimeCommandBoundaryResult();
  const decision = buildConfirmedPreviewDecision(
    previewRuntimeCommandBoundaryResult.preview.id,
  );

  return projectionModule.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary(
    {
      id: "projection_runtime_command_boundary_001",
      sourceSnapshot: buildSourceSnapshot(),
      previewCommandResult: previewRuntimeCommandBoundaryResult,
      decision,
      proposedOTUnitId: "proposed_revised_otunit_001",
      createdAt: "2026-07-07T00:02:00.000Z",
    },
  );
}

function buildAcceptedRevisionDecisionRuntimeCommandBoundaryResult(): Promise<OTUnitRevisionDecisionRuntimeCommandBoundaryResult> {
  return (async () => {
    const decisionModule = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();

    return decisionModule.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
      id: "revision_decision_runtime_command_boundary_001",
      proposedProjectionResult,
      decision: {
        id: "revision_decision_001",
        proposedOTUnitId: proposedProjectionResult.proposedOTUnitId,
        status: "accepted",
        decidedBy: "user",
        reason: "User accepted the proposed revised OTUnit.",
        createdAt: "2026-07-07T00:03:00.000Z",
      },
      createdAt: "2026-07-07T00:04:00.000Z",
    });
  })();
}

async function buildRejectedRevisionDecisionRuntimeCommandBoundaryResult(): Promise<OTUnitRevisionDecisionRuntimeCommandBoundaryResult> {
  const decisionModule = await import(
    "../otunit-revision-decision-runtime-command-boundary"
  );
  const proposedProjectionResult =
    await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();

  return decisionModule.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
    id: "revision_decision_runtime_command_boundary_002",
    proposedProjectionResult,
    decision: {
      id: "revision_decision_002",
      proposedOTUnitId: proposedProjectionResult.proposedOTUnitId,
      status: "rejected",
      decidedBy: "user",
      reason: "User rejected the proposed revised OTUnit.",
      createdAt: "2026-07-07T00:05:00.000Z",
    },
    createdAt: "2026-07-07T00:06:00.000Z",
  });
}

function readSourceText(relativePath: string): string {
  return execSync(`cat '${relativePath}'`, { encoding: "utf8" });
}

describe("otunit-supersession-projection-runtime-command-boundary", () => {
  it("exists as a file on disk", () => {
    const sourcePath =
      "src/runtime/kernel/otunit-supersession-projection-runtime-command-boundary.ts";
    const source = readSourceText(sourcePath);

    expect(source.length).toBeGreaterThan(0);
  });

  it("exports the runtime supersession projection command boundary surface", async () => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );

    expect(
      mod.OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_BOUNDARY_KIND,
    ).toBe("otunit_supersession_projection_runtime_command_boundary");
    expect(mod.OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_NAME).toBe(
      "otunit:revision:supersession:project",
    );
    expect(
      typeof mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary,
    ).toBe("function");
  });

  it("projects an accepted revision decision runtime command boundary result into a supersession projection runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );
    const decisionRuntimeCommandResult =
      await buildAcceptedRevisionDecisionRuntimeCommandBoundaryResult();
    const decisionRuntimeCommandResultBefore = structuredClone(
      decisionRuntimeCommandResult,
    );

    const result = mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary(
      {
        id: "supersession_projection_runtime_command_boundary_001",
        decisionRuntimeCommandResult,
        createdAt: "2026-07-07T00:07:00.000Z",
      },
    );

    expect(result).toMatchObject({
      id: "supersession_projection_runtime_command_boundary_001",
      kind: "otunit_supersession_projection_runtime_command_boundary",
      commandName: "otunit:revision:supersession:project",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      previewId: "preview_runtime_command_boundary_001-revision-preview",
      proposedOTUnitId: "proposed_revised_otunit_001",
      outputKind: "supersession_projection",
      status: "projected",
      decisionStatus: "accepted",
      createdAt: "2026-07-07T00:07:00.000Z",
    });

    expect(result.supersessionBoundary).toBeDefined();
    expect(result.supersessionBoundary.id).toBe(
      "supersession_projection_runtime_command_boundary_001-supersession-boundary",
    );
    expect(result.supersessionBoundary.status).toBe("declared");
    expect(result.supersessionBoundary.decisionBoundaryRecord.id).toBe(
      decisionRuntimeCommandResult.decisionBoundary.id,
    );
    expect(result.supersessionBoundary.relationRecord.relation).toBe(
      "supersedes",
    );
    expect(result.supersessionBoundary.relationRecord.sourceOTUnitId).toBe(
      decisionRuntimeCommandResult.sourceOTUnitId,
    );
    expect(result.supersessionBoundary.relationRecord.revisedOTUnitId).toBe(
      decisionRuntimeCommandResult.proposedOTUnitId,
    );
    expect(
      result.supersessionBoundary.relationRecord.versionLinkRequired,
    ).toBe(true);
    expect(result.supersessionBoundary.relationRecord.sourceHistoryPreserved).toBe(
      true,
    );
    expect(result.supersessionBoundary.runtimeMutationAllowed).toBe(false);
    expect(result.supersessionBoundary.repositoryPersistenceAllowed).toBe(
      false,
    );
    expect(result.supersessionBoundary.sourceOTUnitMutationAllowed).toBe(
      false,
    );
    expect(result.supersessionBoundary.sourceOTUnitStatusChangeAllowed).toBe(
      false,
    );
    expect(result.supersessionBoundary.autoReplaceSourceOTUnit).toBe(false);

    expect(result.runtimeCommandBoundaryOnly).toBe(true);
    expect(result.cliCommandRegistered).toBe(false);
    expect(result.terminalAdapterIntegrated).toBe(false);
    expect(result.repositoryAppendAllowed).toBe(false);
    expect(result.repositoryPersistenceAllowed).toBe(false);
    expect(result.supersessionProjectionCreated).toBe(true);
    expect(result.supersessionBoundaryProjected).toBe(true);
    expect(result.supersessionDeclared).toBe(true);
    expect(result.supersessionPersisted).toBe(false);
    expect(result.supersessionAppliedToSourceOTUnit).toBe(false);
    expect(result.sourceOTUnitSuperseded).toBe(false);
    expect(result.proposedRevisedOTUnitPersisted).toBe(false);
    expect(result.proposedRevisedOTUnitActivated).toBe(false);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.runtimeMutationAllowed).toBe(false);
    expect(result.filesystemPersistenceAllowed).toBe(false);
    expect(result.databasePersistenceAllowed).toBe(false);
    expect(result.providerIntegrationAllowed).toBe(false);
    expect(result.realLLMAllowed).toBe(false);
    expect(result["environmentReadAllowed"]).toBe(false);
    expect(result.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    expect(result.sourceOTUnitReplacementAllowed).toBe(false);
    expect(result.newOTUnitCreated).toBe(false);
    expect(result.autoReplaceSourceOTUnit).toBe(false);

    expect(decisionRuntimeCommandResult).toEqual(
      decisionRuntimeCommandResultBefore,
    );
  });

  it.each([
    [
      "missing input id",
      (input: {
        id: string;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({ ...input, id: " " }),
      "Supersession projection runtime command boundary requires id.",
    ],
    [
      "missing source OTUnit id",
      (input: {
        id: string;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        decisionRuntimeCommandResult: {
          ...input.decisionRuntimeCommandResult,
          sourceOTUnitId: " ",
        },
      }),
      "Supersession projection runtime command boundary requires source OTUnit id.",
    ],
    [
      "missing revision intent record id",
      (input: {
        id: string;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        decisionRuntimeCommandResult: {
          ...input.decisionRuntimeCommandResult,
          revisionIntentRecordId: " ",
        },
      }),
      "Supersession projection runtime command boundary requires revision intent record id.",
    ],
    [
      "missing preview id",
      (input: {
        id: string;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        decisionRuntimeCommandResult: {
          ...input.decisionRuntimeCommandResult,
          previewId: " ",
        },
      }),
      "Supersession projection runtime command boundary requires preview id.",
    ],
    [
      "missing proposed OTUnit id",
      (input: {
        id: string;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        decisionRuntimeCommandResult: {
          ...input.decisionRuntimeCommandResult,
          proposedOTUnitId: " ",
        },
      }),
      "Supersession projection runtime command boundary requires proposed OTUnit id.",
    ],
  ])("%s", async (_label, mutateInput, expectedMessage) => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );
    const baseInput = {
      id: "supersession_projection_runtime_command_boundary_002",
      decisionRuntimeCommandResult:
        await buildAcceptedRevisionDecisionRuntimeCommandBoundaryResult(),
      createdAt: "2026-07-07T00:08:00.000Z",
    };
    const input = mutateInput(baseInput);

    expect(() =>
      mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary(
        input as never,
      ),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "decision outputKind not proposed_revised_otunit_decision",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        outputKind: "not_proposed_revised_otunit_decision" as never,
      }),
      "Supersession projection runtime command boundary requires proposed revised OTUnit decision output.",
    ],
    [
      "decision status not decided",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        status: "confirmed" as never,
      }),
      "Supersession projection runtime command boundary requires decided status.",
    ],
    [
      "decisionStatus not accepted",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        decisionStatus: "rejected" as never,
      }),
      "Supersession projection runtime command boundary requires accepted decision.",
    ],
    [
      "decisionRecorded=false",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        decisionRecorded: false as never,
      }),
      "Supersession projection runtime command boundary requires decisionRecorded=true.",
    ],
    [
      "proposedRevisedOTUnitAccepted=false",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        proposedRevisedOTUnitAccepted: false as never,
      }),
      "Supersession projection runtime command boundary requires proposedRevisedOTUnitAccepted=true.",
    ],
    [
      "proposedRevisedOTUnitRejected=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        proposedRevisedOTUnitRejected: true as never,
      }),
      "Supersession projection runtime command boundary requires proposedRevisedOTUnitRejected=false.",
    ],
    [
      "proposedRevisedOTUnitPersisted=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        proposedRevisedOTUnitPersisted: true as never,
      }),
      "Supersession projection runtime command boundary requires proposedRevisedOTUnitPersisted=false.",
    ],
    [
      "supersessionDeclared=true before projection",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        supersessionDeclared: true as never,
      }),
      "Supersession projection runtime command boundary requires supersessionDeclared=false before projection.",
    ],
    [
      "requiresConfirmation=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        requiresConfirmation: true as never,
      }),
      "Supersession projection runtime command boundary requires requiresConfirmation=false.",
    ],
    [
      "runtimeMutationAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        runtimeMutationAllowed: true as never,
      }),
      "Supersession projection runtime command boundary requires runtimeMutationAllowed=false.",
    ],
    [
      "sourceOTUnitMutationAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Supersession projection runtime command boundary requires sourceOTUnitMutationAllowed=false.",
    ],
    [
      "sourceOTUnitStatusChangeAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        sourceOTUnitStatusChangeAllowed: true as never,
      }),
      "Supersession projection runtime command boundary requires sourceOTUnitStatusChangeAllowed=false.",
    ],
    [
      "sourceOTUnitReplacementAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        sourceOTUnitReplacementAllowed: true as never,
      }),
      "Supersession projection runtime command boundary requires sourceOTUnitReplacementAllowed=false.",
    ],
    [
      "newOTUnitCreated=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        newOTUnitCreated: true as never,
      }),
      "Supersession projection runtime command boundary requires newOTUnitCreated=false.",
    ],
    [
      "autoReplaceSourceOTUnit=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        autoReplaceSourceOTUnit: true as never,
      }),
      "Supersession projection runtime command boundary requires autoReplaceSourceOTUnit=false.",
    ],
  ])("%s", async (_label, mutateDecisionRuntimeCommandResult, expectedMessage) => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );
    const decisionRuntimeCommandResult =
      await buildAcceptedRevisionDecisionRuntimeCommandBoundaryResult();

    expect(() =>
      mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary({
        id: "supersession_projection_runtime_command_boundary_003",
        decisionRuntimeCommandResult:
          mutateDecisionRuntimeCommandResult(decisionRuntimeCommandResult),
      }),
    ).toThrow(expectedMessage);
  });

  it("rejects a rejected revision decision runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );
    const rejectedDecisionRuntimeCommandResult =
      await buildRejectedRevisionDecisionRuntimeCommandBoundaryResult();

    expect(() =>
      mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary({
        id: "supersession_projection_runtime_command_boundary_004",
        decisionRuntimeCommandResult: rejectedDecisionRuntimeCommandResult,
      }),
    ).toThrow(
      "Supersession projection runtime command boundary requires accepted decision.",
    );
  });

  it("does not mutate the input decision runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );
    const decisionRuntimeCommandResult =
      await buildAcceptedRevisionDecisionRuntimeCommandBoundaryResult();
    const decisionRuntimeCommandResultBefore = structuredClone(
      decisionRuntimeCommandResult,
    );

    mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary({
      id: "supersession_projection_runtime_command_boundary_005",
      decisionRuntimeCommandResult,
      createdAt: "2026-07-07T00:09:00.000Z",
    });

    expect(decisionRuntimeCommandResult).toEqual(
      decisionRuntimeCommandResultBefore,
    );
  });

  it("keeps the runtime supersession projection boundary implementation purely projected", async () => {
    const mod = await import(
      "../otunit-supersession-projection-runtime-command-boundary"
    );
    const source =
      mod.projectOTUnitSupersessionProjectionRuntimeCommandBoundary.toString();
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
    ];

    for (const term of forbiddenTerms) {
      expect(source).not.toContain(term);
    }
  });

  it("keeps the runtime supersession projection boundary source free of forbidden runtime integrations", () => {
    const moduleSource = readSourceText(
      "src/runtime/kernel/otunit-supersession-projection-runtime-command-boundary.ts",
    );
    const testSource = readSourceText(
      "src/runtime/kernel/tests/otunit-supersession-projection-runtime-command-boundary-contract.test.ts",
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
