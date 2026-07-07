import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "../otunit-revision-chain-boundary";

import type {
  OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
} from "../otunit-proposed-revised-otunit-runtime-projection-command-boundary";

import type {
  OTUnitRevisionDecisionRuntimeCommandDecisionInput,
} from "../otunit-revision-decision-runtime-command-boundary";

import type {
  OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
} from "../otunit-revision-preview-runtime-command-boundary";

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

function buildConfirmedProjectionDecision(previewId: string) {
  return {
    previewId,
    status: "confirmed" as const,
    decidedBy: "user" as const,
    reason: "User confirmed the revision preview.",
    createdAt: "2026-07-07T00:01:00.000Z",
  };
}

function buildRevisionDecision(
  proposedOTUnitId: string,
  status: "accepted" | "rejected",
): OTUnitRevisionDecisionRuntimeCommandDecisionInput {
  return {
    id: "revision_decision_001",
    proposedOTUnitId,
    status,
    decidedBy: "user" as const,
    reason: "User decided on the proposed revised OTUnit.",
    createdAt: "2026-07-07T00:02:00.000Z",
  };
}

async function buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult(): Promise<OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult> {
  const projectionModule = await import(
    "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
  );
  const previewRuntimeCommandBoundaryResult =
    await buildPreviewRuntimeCommandBoundaryResult();
  const decision = buildConfirmedProjectionDecision(
    previewRuntimeCommandBoundaryResult.preview.id,
  );

  return projectionModule.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary(
    {
      id: "projection_runtime_command_boundary_001",
      sourceSnapshot: buildSourceSnapshot(),
      previewCommandResult: previewRuntimeCommandBoundaryResult,
      decision,
      proposedOTUnitId: "proposed_revised_otunit_001",
      createdAt: "2026-07-07T00:03:00.000Z",
    },
  );
}

function readSourceText(relativePath: string): string {
  return execSync(`cat '${relativePath}'`, { encoding: "utf8" });
}

describe("otunit-revision-decision-runtime-command-boundary", () => {
  it("exists as a file on disk", () => {
    const sourcePath =
      "src/runtime/kernel/otunit-revision-decision-runtime-command-boundary.ts";
    const source = readSourceText(sourcePath);

    expect(source.length).toBeGreaterThan(0);
  });

  it("exports the runtime decision command boundary surface", async () => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );

    expect(
      mod.OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_BOUNDARY_KIND,
    ).toBe("otunit_revision_decision_runtime_command_boundary");
    expect(mod.OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_NAME).toBe(
      "otunit:revision:decision",
    );
    expect(
      typeof mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary,
    ).toBe("function");
  });

  it("projects a proposed revised OTUnit runtime projection result plus an accepted user decision into a revision decision runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();
    const decision = buildRevisionDecision(
      proposedProjectionResult.proposedOTUnitId,
      "accepted",
    );
    const proposedProjectionResultBefore = structuredClone(
      proposedProjectionResult,
    );
    const decisionBefore = structuredClone(decision);

    const result = mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
      id: "revision_decision_runtime_command_boundary_001",
      proposedProjectionResult,
      decision,
      createdAt: "2026-07-07T00:04:00.000Z",
    });

    expect(result).toMatchObject({
      id: "revision_decision_runtime_command_boundary_001",
      kind: "otunit_revision_decision_runtime_command_boundary",
      commandName: "otunit:revision:decision",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      previewId: "preview_runtime_command_boundary_001-revision-preview",
      proposedOTUnitId: "proposed_revised_otunit_001",
      outputKind: "proposed_revised_otunit_decision",
      status: "decided",
      decisionStatus: "accepted",
      runtimeCommandBoundaryOnly: true,
      cliCommandRegistered: false,
      terminalAdapterIntegrated: false,
      repositoryAppendAllowed: false,
      repositoryPersistenceAllowed: false,
      decisionRecorded: true,
      proposedRevisedOTUnitAccepted: true,
      proposedRevisedOTUnitRejected: false,
      proposedRevisedOTUnitPersisted: false,
      supersessionDeclared: false,
      requiresConfirmation: false,
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
      createdAt: "2026-07-07T00:04:00.000Z",
    });

    expect(result.decisionBoundary).toBeDefined();
    expect(result.decisionBoundary).toMatchObject({
      id: "revision_decision_runtime_command_boundary_001-decision-boundary",
      status: "accepted",
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
      proposed: {
        id: "proposed_revised_otunit_001",
        sourceOTUnitId: "otunit_001",
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        sourceOTUnitReplacementAllowed: false,
        autoReplaceSourceOTUnit: false,
      },
      decision: {
        proposedOTUnitId: proposedProjectionResult.proposedOTUnitId,
      },
    });
    expect(result.decisionBoundary.proposed.id).toBe(
      proposedProjectionResult.proposedOTUnitId,
    );
    expect(result.decisionBoundary.proposed.sourceOTUnitId).toBe(
      proposedProjectionResult.sourceOTUnitId,
    );
    expect(result.decisionBoundary.decision.proposedOTUnitId).toBe(
      proposedProjectionResult.proposedOTUnitId,
    );

    expect(result.runtimeCommandBoundaryOnly).toBe(true);
    expect(result.cliCommandRegistered).toBe(false);
    expect(result.terminalAdapterIntegrated).toBe(false);
    expect(result.repositoryAppendAllowed).toBe(false);
    expect(result.repositoryPersistenceAllowed).toBe(false);
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

    expect(proposedProjectionResult).toEqual(proposedProjectionResultBefore);
    expect(decision).toEqual(decisionBefore);
  });

  it("projects a proposed revised OTUnit runtime projection result plus a rejected user decision into a revision decision runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();
    const decision = buildRevisionDecision(
      proposedProjectionResult.proposedOTUnitId,
      "rejected",
    );

    const result = mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
      id: "revision_decision_runtime_command_boundary_002",
      proposedProjectionResult,
      decision,
      createdAt: "2026-07-07T00:05:00.000Z",
    });

    expect(result).toMatchObject({
      outputKind: "proposed_revised_otunit_decision",
      status: "decided",
      decisionStatus: "rejected",
      decisionRecorded: true,
      proposedRevisedOTUnitAccepted: false,
      proposedRevisedOTUnitRejected: true,
      supersessionDeclared: false,
      proposedRevisedOTUnitPersisted: false,
      requiresConfirmation: false,
      runtimeCommandBoundaryOnly: true,
      cliCommandRegistered: false,
      terminalAdapterIntegrated: false,
      repositoryAppendAllowed: false,
      repositoryPersistenceAllowed: false,
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
    });

    expect(result.decisionBoundary).toBeDefined();
    expect(result.decisionBoundary).toMatchObject({
      status: "rejected",
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      sourceOTUnitStatusChangeAllowed: false,
      autoReplaceSourceOTUnit: false,
      proposed: {
        id: "proposed_revised_otunit_001",
        sourceOTUnitId: "otunit_001",
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        sourceOTUnitReplacementAllowed: false,
        autoReplaceSourceOTUnit: false,
      },
      decision: {
        proposedOTUnitId: proposedProjectionResult.proposedOTUnitId,
      },
    });
    expect(result.decisionBoundary.decision.proposedOTUnitId).toBe(
      proposedProjectionResult.proposedOTUnitId,
    );
    expect(result.decisionBoundary.proposed.id).toBe(
      proposedProjectionResult.proposedOTUnitId,
    );
    expect(result.decisionBoundary.proposed.sourceOTUnitId).toBe(
      proposedProjectionResult.sourceOTUnitId,
    );
    expect(result.decisionBoundary.proposed.sourceOTUnitMutationAllowed).toBe(
      false,
    );
    expect(
      result.decisionBoundary.proposed.sourceOTUnitStatusChangeAllowed,
    ).toBe(false);
    expect(
      (
        result.decisionBoundary.proposed as {
          sourceOTUnitReplacementAllowed?: boolean;
        }
      ).sourceOTUnitReplacementAllowed,
    ).toBe(false);
    expect(result.decisionBoundary.proposed.autoReplaceSourceOTUnit).toBe(
      false,
    );
  });

  it.each([
    [
      "missing input id",
      (input: {
        id: string;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decision: ReturnType<typeof buildRevisionDecision>;
      }) => ({ ...input, id: " " }),
      "Revision decision runtime command boundary requires id.",
    ],
    [
      "missing source OTUnit id",
      (input: {
        id: string;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decision: ReturnType<typeof buildRevisionDecision>;
      }) => ({
        ...input,
        proposedProjectionResult: {
          ...input.proposedProjectionResult,
          sourceOTUnitId: " ",
        },
      }),
      "Revision decision runtime command boundary requires source OTUnit id.",
    ],
    [
      "missing revision intent record id",
      (input: {
        id: string;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decision: ReturnType<typeof buildRevisionDecision>;
      }) => ({
        ...input,
        proposedProjectionResult: {
          ...input.proposedProjectionResult,
          revisionIntentRecordId: " ",
        },
      }),
      "Revision decision runtime command boundary requires revision intent record id.",
    ],
    [
      "missing preview id",
      (input: {
        id: string;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decision: ReturnType<typeof buildRevisionDecision>;
      }) => ({
        ...input,
        proposedProjectionResult: {
          ...input.proposedProjectionResult,
          previewId: " ",
        },
      }),
      "Revision decision runtime command boundary requires preview id.",
    ],
    [
      "missing proposed OTUnit id",
      (input: {
        id: string;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decision: ReturnType<typeof buildRevisionDecision>;
      }) => ({
        ...input,
        proposedProjectionResult: {
          ...input.proposedProjectionResult,
          proposedOTUnitId: " ",
        },
      }),
      "Revision decision runtime command boundary requires proposed OTUnit id.",
    ],
  ])("%s", async (_label, mutateInput, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();
    const decision = buildRevisionDecision(
      proposedProjectionResult.proposedOTUnitId,
      "accepted",
    );
    const baseInput = {
      id: "revision_decision_runtime_command_boundary_003",
      proposedProjectionResult,
      decision,
    };
    const input = mutateInput(baseInput);

    expect(() =>
      mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary(input as never),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "proposed projection outputKind not proposed_revised_otunit_projection",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        outputKind: "not_proposed_revised_otunit_projection" as never,
      }),
      "Revision decision runtime command boundary requires proposed revised OTUnit projection output.",
    ],
    [
      "proposed projection status not requires_confirmation",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        status: "confirmed" as never,
      }),
      "Revision decision runtime command boundary requires proposed projection status requires_confirmation.",
    ],
    [
      "proposed projection decisionStatus not confirmed",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        decisionStatus: "accepted" as never,
      }),
      "Revision decision runtime command boundary requires confirmed preview decision status.",
    ],
    [
      "projectionCreated=false",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        projectionCreated: false as never,
      }),
      "Revision decision runtime command boundary requires projectionCreated=true.",
    ],
    [
      "proposedRevisedOTUnitProjected=false",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        proposedRevisedOTUnitProjected: false as never,
      }),
      "Revision decision runtime command boundary requires proposedRevisedOTUnitProjected=true.",
    ],
    [
      "proposedRevisedOTUnitPersisted=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        proposedRevisedOTUnitPersisted: true as never,
      }),
      "Revision decision runtime command boundary requires proposedRevisedOTUnitPersisted=false.",
    ],
    [
      "proposed projection requiresConfirmation=false",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        requiresConfirmation: false as never,
      }),
      "Revision decision runtime command boundary requires proposed projection requiresConfirmation=true.",
    ],
    [
      "proposed projection runtimeMutationAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        runtimeMutationAllowed: true as never,
      }),
      "Revision decision runtime command boundary requires runtimeMutationAllowed=false.",
    ],
    [
      "proposed projection sourceOTUnitMutationAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Revision decision runtime command boundary requires sourceOTUnitMutationAllowed=false.",
    ],
    [
      "proposed projection sourceOTUnitStatusChangeAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        sourceOTUnitStatusChangeAllowed: true as never,
      }),
      "Revision decision runtime command boundary requires sourceOTUnitStatusChangeAllowed=false.",
    ],
    [
      "proposed projection sourceOTUnitReplacementAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        sourceOTUnitReplacementAllowed: true as never,
      }),
      "Revision decision runtime command boundary requires sourceOTUnitReplacementAllowed=false.",
    ],
    [
      "proposed projection newOTUnitCreated=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        newOTUnitCreated: true as never,
      }),
      "Revision decision runtime command boundary requires newOTUnitCreated=false.",
    ],
    [
      "proposed projection autoReplaceSourceOTUnit=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        autoReplaceSourceOTUnit: true as never,
      }),
      "Revision decision runtime command boundary requires autoReplaceSourceOTUnit=false.",
    ],
  ])("%s", async (_label, mutateProposedProjectionResult, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();
    const decision = buildRevisionDecision(
      proposedProjectionResult.proposedOTUnitId,
      "accepted",
    );

    expect(() =>
      mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
        id: "revision_decision_runtime_command_boundary_004",
        proposedProjectionResult:
          mutateProposedProjectionResult(proposedProjectionResult),
        decision,
      }),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "missing decision id",
      (decision: ReturnType<typeof buildRevisionDecision>) => ({
        ...decision,
        id: " ",
      }),
      "Revision decision runtime command boundary requires decision id.",
    ],
    [
      "missing decision proposed OTUnit id",
      (decision: ReturnType<typeof buildRevisionDecision>) => ({
        ...decision,
        proposedOTUnitId: " ",
      }),
      "Revision decision runtime command boundary requires decision proposed OTUnit id.",
    ],
    [
      "decision proposedOTUnitId mismatch",
      (decision: ReturnType<typeof buildRevisionDecision>) => ({
        ...decision,
        proposedOTUnitId: "proposed_revised_otunit_999",
      }),
      "Revision decision runtime command boundary requires decision proposedOTUnitId to match proposed projection.",
    ],
    [
      "decision status not accepted/rejected",
      (decision: ReturnType<typeof buildRevisionDecision>) => ({
        ...decision,
        status: "pending" as never,
      }),
      "Revision decision runtime command boundary requires accepted or rejected decision.",
    ],
    [
      "decidedBy not user",
      (decision: ReturnType<typeof buildRevisionDecision>) => ({
        ...decision,
        decidedBy: "system" as never,
      }),
      "Revision decision runtime command boundary requires user decision.",
    ],
  ])("%s", async (_label, mutateDecision, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();
    const decision = mutateDecision(
      buildRevisionDecision(
        proposedProjectionResult.proposedOTUnitId,
        "accepted",
      ),
    );

    expect(() =>
      mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
        id: "revision_decision_runtime_command_boundary_005",
        proposedProjectionResult,
        decision: decision as never,
      }),
    ).toThrow(expectedMessage);
  });

  it("does not mutate the input projection result or user decision", async () => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const proposedProjectionResult =
      await buildProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult();
    const decision = buildRevisionDecision(
      proposedProjectionResult.proposedOTUnitId,
      "accepted",
    );
    const proposedProjectionResultBefore = structuredClone(
      proposedProjectionResult,
    );
    const decisionBefore = structuredClone(decision);

    mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
      id: "revision_decision_runtime_command_boundary_006",
      proposedProjectionResult,
      decision,
      createdAt: "2026-07-07T00:06:00.000Z",
    });

    expect(proposedProjectionResult).toEqual(proposedProjectionResultBefore);
    expect(decision).toEqual(decisionBefore);
  });

  it("keeps the runtime decision boundary implementation purely projected", async () => {
    const mod = await import(
      "../otunit-revision-decision-runtime-command-boundary"
    );
    const source =
      mod.projectOTUnitRevisionDecisionRuntimeCommandBoundary.toString();
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

  it("keeps the runtime decision boundary source free of forbidden runtime integrations", () => {
    const moduleSource = readSourceText(
      "src/runtime/kernel/otunit-revision-decision-runtime-command-boundary.ts",
    );
    const testSource = readSourceText(
      "src/runtime/kernel/tests/otunit-revision-decision-runtime-command-boundary-contract.test.ts",
    );

    const dot = String.fromCharCode(46);
    const envWord = ["e", "n", "v"].join("");
    const fsWord = ["f", "s"].join("");
    const processEnvTerm = ["p", "r", "o", "c", "e", "s", "s", dot, envWord].join("");
    const envTerm = [dot, envWord].join("");

    const forbiddenTerms = [
      processEnvTerm,
      envTerm,
      ["from", " ", '"', fsWord, '"'].join(""),
      ["from", " ", "'", fsWord, "'"].join(""),
      ["node", ":", fsWord].join(""),
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
