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
  OTUnitRevisionDecisionRuntimeCommandDecisionInput,
} from "../otunit-revision-decision-runtime-command-boundary";

import type {
  OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
} from "../otunit-revision-decision-runtime-command-boundary";

import type {
  OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
} from "../otunit-supersession-projection-runtime-command-boundary";

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

  return previewModule.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
    id: "preview_command_boundary_001",
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

async function buildProposedProjectionResult(): Promise<OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult> {
  const projectionModule = await import(
    "../otunit-proposed-revised-otunit-runtime-projection-command-boundary"
  );
  const previewCommandResult = await buildPreviewCommandResult();

  return projectionModule.projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary(
    {
      id: "projection_command_boundary_001",
      sourceSnapshot: buildSourceSnapshot(),
      previewCommandResult,
      decision: buildConfirmedPreviewDecision(previewCommandResult.preview.id),
      proposedOTUnitId: "proposed_revised_otunit_001",
      createdAt: "2026-07-07T00:02:00.000Z",
    },
  );
}

function buildRevisionDecision(
  proposedOTUnitId: string,
  status: "accepted" | "rejected",
): OTUnitRevisionDecisionRuntimeCommandDecisionInput {
  return {
    id: "revision_decision_001",
    proposedOTUnitId,
    status,
    decidedBy: "user",
    reason: "User decided on the proposed revised OTUnit.",
    createdAt: "2026-07-07T00:03:00.000Z",
  };
}

async function buildAcceptedDecisionRuntimeCommandResult(): Promise<OTUnitRevisionDecisionRuntimeCommandBoundaryResult> {
  const decisionModule = await import(
    "../otunit-revision-decision-runtime-command-boundary"
  );
  const proposedProjectionResult = await buildProposedProjectionResult();

  return decisionModule.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
    id: "revision_decision_runtime_command_boundary_001",
    proposedProjectionResult,
    decision: buildRevisionDecision(proposedProjectionResult.proposedOTUnitId, "accepted"),
    createdAt: "2026-07-07T00:04:00.000Z",
  });
}

async function buildRejectedDecisionRuntimeCommandResult(): Promise<OTUnitRevisionDecisionRuntimeCommandBoundaryResult> {
  const decisionModule = await import(
    "../otunit-revision-decision-runtime-command-boundary"
  );
  const proposedProjectionResult = await buildProposedProjectionResult();

  return decisionModule.projectOTUnitRevisionDecisionRuntimeCommandBoundary({
    id: "revision_decision_runtime_command_boundary_002",
    proposedProjectionResult,
    decision: buildRevisionDecision(proposedProjectionResult.proposedOTUnitId, "rejected"),
    createdAt: "2026-07-07T00:05:00.000Z",
  });
}

async function buildSupersessionProjectionResult(): Promise<OTUnitSupersessionProjectionRuntimeCommandBoundaryResult> {
  const supersessionModule = await import(
    "../otunit-supersession-projection-runtime-command-boundary"
  );
  const decisionRuntimeCommandResult =
    await buildAcceptedDecisionRuntimeCommandResult();

  return supersessionModule.projectOTUnitSupersessionProjectionRuntimeCommandBoundary(
    {
      id: "supersession_projection_runtime_command_boundary_001",
      decisionRuntimeCommandResult,
      createdAt: "2026-07-07T00:06:00.000Z",
    },
  );
}

function readSourceText(relativePath: string): string {
  return execSync(`cat '${relativePath}'`, { encoding: "utf8" });
}

describe("otunit-revision-lifecycle-runtime-projection-command-boundary", () => {
  it("exists as a file on disk", () => {
    const sourcePath =
      "src/runtime/kernel/otunit-revision-lifecycle-runtime-projection-command-boundary.ts";
    const source = readSourceText(sourcePath);

    expect(source.length).toBeGreaterThan(0);
  });

  it("exports the runtime lifecycle projection command boundary surface", async () => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );

    expect(
      mod.OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND,
    ).toBe("otunit_revision_lifecycle_runtime_projection_command_boundary");
    expect(
      mod.OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_NAME,
    ).toBe("otunit:revision:lifecycle:project");
    expect(
      typeof mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary,
    ).toBe("function");
  });

  it("projects the accepted revision runtime command path into a lifecycle projection runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );

    const sourceSnapshot = buildSourceSnapshot();
    const revisionIntent = buildRevisionIntent();
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    const sourceSnapshotBefore = structuredClone(sourceSnapshot);
    const revisionIntentBefore = structuredClone(revisionIntent);
    const previewCommandResultBefore = structuredClone(previewCommandResult);
    const proposedProjectionResultBefore = structuredClone(
      proposedProjectionResult,
    );
    const decisionRuntimeCommandResultBefore = structuredClone(
      decisionRuntimeCommandResult,
    );
    const supersessionProjectionResultBefore = structuredClone(
      supersessionProjectionResult,
    );

    const result =
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_001",
        sourceSnapshot,
        revisionIntent,
        previewCommandResult,
        proposedProjectionResult,
        decisionRuntimeCommandResult,
        supersessionProjectionResult,
        createdAt: "2026-07-07T00:07:00.000Z",
      });

    expect(result).toEqual({
      id: "lifecycle_projection_runtime_command_boundary_001",
      kind:
        "otunit_revision_lifecycle_runtime_projection_command_boundary",
      commandName: "otunit:revision:lifecycle:project",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      previewId: "preview_command_boundary_001-revision-preview",
      proposedOTUnitId: "proposed_revised_otunit_001",
      outputKind: "revision_lifecycle_projection",
      status: "projected",
      currentStage: "supersession_declared",
      decisionStatus: "accepted",
      supersessionDeclared: true,
      lifecycleProjection: {
        id: "lifecycle_projection_runtime_command_boundary_001-lifecycle-projection",
        sourceOTUnitId: "otunit_001",
        revisionIntentRecordId: "revision_intent_001",
        currentStage: "supersession_declared",
        revisionIntent,
        preview: previewCommandResult.preview,
        proposedBoundary: proposedProjectionResult.proposedBoundary,
        decisionBoundary: decisionRuntimeCommandResult.decisionBoundary,
        supersessionBoundary: supersessionProjectionResult.supersessionBoundary,
        decisionStatus: "accepted",
        supersessionDeclared: true,
        runtimeMutationAllowed: false,
        repositoryPersistenceAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
        createdAt: "2026-07-07T00:07:00.000Z",
      },
      runtimeCommandBoundaryOnly: true,
      cliCommandRegistered: false,
      terminalAdapterIntegrated: false,
      repositoryAppendAllowed: false,
      repositoryPersistenceAllowed: false,
      lifecycleProjectionCreated: true,
      lifecycleProjectionPersisted: false,
      supersessionProjectionConsumed: true,
      sourceOTUnitSuperseded: false,
      proposedRevisedOTUnitPersisted: false,
      proposedRevisedOTUnitActivated: false,
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
      createdAt: "2026-07-07T00:07:00.000Z",
    });

    expect(result.lifecycleProjection.sourceOTUnitId).toBe(
      sourceSnapshot.id,
    );
    expect(result.lifecycleProjection.revisionIntentRecordId).toBe(
      revisionIntent.id,
    );
    expect(result.lifecycleProjection.currentStage).toBe(
      "supersession_declared",
    );
    expect(result.lifecycleProjection.decisionStatus).toBe("accepted");
    expect(result.lifecycleProjection.supersessionDeclared).toBe(true);
    expect(result.lifecycleProjection.preview).toBe(
      previewCommandResult.preview,
    );
    expect(result.lifecycleProjection.proposedBoundary).toBe(
      proposedProjectionResult.proposedBoundary,
    );
    expect(result.lifecycleProjection.decisionBoundary).toBe(
      decisionRuntimeCommandResult.decisionBoundary,
    );
    expect(result.lifecycleProjection.supersessionBoundary).toBe(
      supersessionProjectionResult.supersessionBoundary,
    );
    expect(result.runtimeCommandBoundaryOnly).toBe(true);
    expect(result.cliCommandRegistered).toBe(false);
    expect(result.terminalAdapterIntegrated).toBe(false);
    expect(result.repositoryAppendAllowed).toBe(false);
    expect(result.repositoryPersistenceAllowed).toBe(false);
    expect(result.lifecycleProjectionCreated).toBe(true);
    expect(result.lifecycleProjectionPersisted).toBe(false);
    expect(result.supersessionProjectionConsumed).toBe(true);
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

    expect(sourceSnapshot).toEqual(sourceSnapshotBefore);
    expect(revisionIntent).toEqual(revisionIntentBefore);
    expect(previewCommandResult).toEqual(previewCommandResultBefore);
    expect(proposedProjectionResult).toEqual(proposedProjectionResultBefore);
    expect(decisionRuntimeCommandResult).toEqual(
      decisionRuntimeCommandResultBefore,
    );
    expect(supersessionProjectionResult).toEqual(
      supersessionProjectionResultBefore,
    );
  });

  it.each([
    [
      "missing input id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        revisionIntent: OTUnitRevisionIntentSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({ ...input, id: " " }),
      "Revision lifecycle runtime projection command boundary requires id.",
    ],
    [
      "missing source OTUnit id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        revisionIntent: OTUnitRevisionIntentSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        sourceSnapshot: buildSourceSnapshot({ id: " " }),
      }),
      "Revision lifecycle runtime projection command boundary requires source OTUnit id.",
    ],
    [
      "missing revision intent record id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        revisionIntent: OTUnitRevisionIntentSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        revisionIntent: buildRevisionIntent({ id: "" }),
      }),
      "Revision lifecycle runtime projection command boundary requires revision intent record id.",
    ],
    [
      "missing preview id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        revisionIntent: OTUnitRevisionIntentSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        previewCommandResult: {
          ...input.previewCommandResult,
          preview: {
            ...input.previewCommandResult.preview,
            id: " ",
          },
        },
      }),
      "Revision lifecycle runtime projection command boundary requires preview id.",
    ],
    [
      "missing proposed OTUnit id",
      (input: {
        id: string;
        sourceSnapshot: SourceOTUnitSnapshot;
        revisionIntent: OTUnitRevisionIntentSnapshot;
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult;
        createdAt?: string;
      }) => ({
        ...input,
        proposedProjectionResult: {
          ...input.proposedProjectionResult,
          proposedOTUnitId: " ",
        },
      }),
      "Revision lifecycle runtime projection command boundary requires proposed OTUnit id.",
    ],
  ])("%s", async (_label, mutateInput, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    const baseInput = {
      id: "lifecycle_projection_runtime_command_boundary_002",
      sourceSnapshot: buildSourceSnapshot(),
      revisionIntent: buildRevisionIntent(),
      previewCommandResult,
      proposedProjectionResult,
      decisionRuntimeCommandResult,
      supersessionProjectionResult,
      createdAt: "2026-07-07T00:08:00.000Z",
    };
    const input = mutateInput(baseInput);

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary(
        input as never,
      ),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "preview outputKind not revision_preview",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        outputKind: "not_revision_preview" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires revision preview output.",
    ],
    [
      "preview status not requires_confirmation",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        status: "confirmed" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires preview status requires_confirmation.",
    ],
    [
      "previewCreated=false",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        previewCreated: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires previewCreated=true.",
    ],
    [
      "preview requiresConfirmation=false",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        requiresConfirmation: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires preview requiresConfirmation=true.",
    ],
    [
      "preview runtimeMutationAllowed=true",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        runtimeMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires preview runtimeMutationAllowed=false.",
    ],
    [
      "preview sourceOTUnitMutationAllowed=true",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires preview sourceOTUnitMutationAllowed=false.",
    ],
    [
      "preview newOTUnitCreated=true",
      (
        previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
      ) => ({
        ...previewCommandResult,
        newOTUnitCreated: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires preview newOTUnitCreated=false.",
    ],
  ])("%s", async (_label, mutatePreviewCommandResult, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_003",
        sourceSnapshot: buildSourceSnapshot(),
        revisionIntent: buildRevisionIntent(),
        previewCommandResult: mutatePreviewCommandResult(previewCommandResult),
        proposedProjectionResult,
        decisionRuntimeCommandResult,
        supersessionProjectionResult,
      }),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "proposed outputKind not proposed_revised_otunit_projection",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        outputKind: "not_proposed_revised_otunit_projection" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed revised OTUnit projection output.",
    ],
    [
      "proposed status not requires_confirmation",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        status: "confirmed" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection status requires_confirmation.",
    ],
    [
      "proposed decisionStatus not confirmed",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        decisionStatus: "accepted" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires confirmed preview decision status.",
    ],
    [
      "projectionCreated=false",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        projectionCreated: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires projectionCreated=true.",
    ],
    [
      "proposedRevisedOTUnitProjected=false",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        proposedRevisedOTUnitProjected: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitProjected=true.",
    ],
    [
      "proposedRevisedOTUnitPersisted=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        proposedRevisedOTUnitPersisted: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitPersisted=false.",
    ],
    [
      "proposed runtimeMutationAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        runtimeMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection runtimeMutationAllowed=false.",
    ],
    [
      "proposed sourceOTUnitMutationAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection sourceOTUnitMutationAllowed=false.",
    ],
    [
      "proposed sourceOTUnitStatusChangeAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        sourceOTUnitStatusChangeAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection sourceOTUnitStatusChangeAllowed=false.",
    ],
    [
      "proposed sourceOTUnitReplacementAllowed=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        sourceOTUnitReplacementAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection sourceOTUnitReplacementAllowed=false.",
    ],
    [
      "proposed newOTUnitCreated=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        newOTUnitCreated: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection newOTUnitCreated=false.",
    ],
    [
      "proposed autoReplaceSourceOTUnit=true",
      (
        proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
      ) => ({
        ...proposedProjectionResult,
        autoReplaceSourceOTUnit: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposed projection autoReplaceSourceOTUnit=false.",
    ],
  ])("%s", async (_label, mutateProposedProjectionResult, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_004",
        sourceSnapshot: buildSourceSnapshot(),
        revisionIntent: buildRevisionIntent(),
        previewCommandResult,
        proposedProjectionResult: mutateProposedProjectionResult(
          proposedProjectionResult,
        ),
        decisionRuntimeCommandResult,
        supersessionProjectionResult,
      }),
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
      "Revision lifecycle runtime projection command boundary requires proposed revised OTUnit decision output.",
    ],
    [
      "decision status not decided",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        status: "confirmed" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decided status.",
    ],
    [
      "decision decisionStatus not accepted",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        decisionStatus: "rejected" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires accepted decision.",
    ],
    [
      "decisionRecorded=false",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        decisionRecorded: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decisionRecorded=true.",
    ],
    [
      "proposedRevisedOTUnitAccepted=false",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        proposedRevisedOTUnitAccepted: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitAccepted=true.",
    ],
    [
      "proposedRevisedOTUnitRejected=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        proposedRevisedOTUnitRejected: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitRejected=false.",
    ],
    [
      "decision supersessionDeclared=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        supersessionDeclared: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision supersessionDeclared=false.",
    ],
    [
      "decision proposedRevisedOTUnitPersisted=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        proposedRevisedOTUnitPersisted: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision proposedRevisedOTUnitPersisted=false.",
    ],
    [
      "decision runtimeMutationAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        runtimeMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision runtimeMutationAllowed=false.",
    ],
    [
      "decision sourceOTUnitMutationAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision sourceOTUnitMutationAllowed=false.",
    ],
    [
      "decision sourceOTUnitStatusChangeAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        sourceOTUnitStatusChangeAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision sourceOTUnitStatusChangeAllowed=false.",
    ],
    [
      "decision sourceOTUnitReplacementAllowed=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        sourceOTUnitReplacementAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision sourceOTUnitReplacementAllowed=false.",
    ],
    [
      "decision newOTUnitCreated=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        newOTUnitCreated: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision newOTUnitCreated=false.",
    ],
    [
      "decision autoReplaceSourceOTUnit=true",
      (
        decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
      ) => ({
        ...decisionRuntimeCommandResult,
        autoReplaceSourceOTUnit: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires decision autoReplaceSourceOTUnit=false.",
    ],
  ])("%s", async (_label, mutateDecisionRuntimeCommandResult, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_005",
        sourceSnapshot: buildSourceSnapshot(),
        revisionIntent: buildRevisionIntent(),
        previewCommandResult,
        proposedProjectionResult,
        decisionRuntimeCommandResult: mutateDecisionRuntimeCommandResult(
          decisionRuntimeCommandResult,
        ),
        supersessionProjectionResult,
      }),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      "supersession outputKind not supersession_projection",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        outputKind: "not_supersession_projection" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession projection output.",
    ],
    [
      "supersession status not projected",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        status: "requires_confirmation" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession projected status.",
    ],
    [
      "supersession decisionStatus not accepted",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        decisionStatus: "rejected" as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession accepted decision status.",
    ],
    [
      "supersessionProjectionCreated=false",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        supersessionProjectionCreated: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersessionProjectionCreated=true.",
    ],
    [
      "supersessionBoundaryProjected=false",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        supersessionBoundaryProjected: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersessionBoundaryProjected=true.",
    ],
    [
      "supersessionDeclared=false",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        supersessionDeclared: false as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersessionDeclared=true.",
    ],
    [
      "supersessionPersisted=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        supersessionPersisted: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersessionPersisted=false.",
    ],
    [
      "sourceOTUnitSuperseded=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        sourceOTUnitSuperseded: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires sourceOTUnitSuperseded=false.",
    ],
    [
      "proposedRevisedOTUnitPersisted=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        proposedRevisedOTUnitPersisted: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitPersisted=false.",
    ],
    [
      "proposedRevisedOTUnitActivated=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        proposedRevisedOTUnitActivated: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitActivated=false.",
    ],
    [
      "supersession runtimeMutationAllowed=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        runtimeMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession runtimeMutationAllowed=false.",
    ],
    [
      "supersession sourceOTUnitMutationAllowed=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        sourceOTUnitMutationAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession sourceOTUnitMutationAllowed=false.",
    ],
    [
      "supersession sourceOTUnitStatusChangeAllowed=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        sourceOTUnitStatusChangeAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession sourceOTUnitStatusChangeAllowed=false.",
    ],
    [
      "supersession sourceOTUnitReplacementAllowed=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        sourceOTUnitReplacementAllowed: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires supersession sourceOTUnitReplacementAllowed=false.",
    ],
    [
      "supersession newOTUnitCreated=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        newOTUnitCreated: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires newOTUnitCreated=false.",
    ],
    [
      "supersession autoReplaceSourceOTUnit=true",
      (
        supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
      ) => ({
        ...supersessionProjectionResult,
        autoReplaceSourceOTUnit: true as never,
      }),
      "Revision lifecycle runtime projection command boundary requires autoReplaceSourceOTUnit=false.",
    ],
  ])("%s", async (_label, mutateSupersessionProjectionResult, expectedMessage) => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_006",
        sourceSnapshot: buildSourceSnapshot(),
        revisionIntent: buildRevisionIntent(),
        previewCommandResult,
        proposedProjectionResult,
        decisionRuntimeCommandResult,
        supersessionProjectionResult: mutateSupersessionProjectionResult(
          supersessionProjectionResult,
        ),
      }),
    ).toThrow(expectedMessage);
  });

  it("rejects a rejected decision runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildRejectedDecisionRuntimeCommandResult();
    const supersessionProjectionResult =
      await buildSupersessionProjectionResult();

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_007",
        sourceSnapshot: buildSourceSnapshot(),
        revisionIntent: buildRevisionIntent(),
        previewCommandResult,
        proposedProjectionResult,
        decisionRuntimeCommandResult,
        supersessionProjectionResult,
      }),
    ).toThrow("Revision lifecycle runtime projection command boundary requires accepted decision.");
  });

  it("rejects a supersession projection runtime command boundary result that is not projected", async () => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const previewCommandResult = await buildPreviewCommandResult();
    const proposedProjectionResult = await buildProposedProjectionResult();
    const decisionRuntimeCommandResult =
      await buildAcceptedDecisionRuntimeCommandResult();
    const supersessionProjectionResult = await buildSupersessionProjectionResult();

    expect(() =>
      mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary({
        id: "lifecycle_projection_runtime_command_boundary_008",
        sourceSnapshot: buildSourceSnapshot(),
        revisionIntent: buildRevisionIntent(),
        previewCommandResult,
        proposedProjectionResult,
        decisionRuntimeCommandResult,
        supersessionProjectionResult: {
          ...supersessionProjectionResult,
          status: "requires_confirmation" as never,
        },
      }),
    ).toThrow(
      "Revision lifecycle runtime projection command boundary requires supersession projected status.",
    );
  });

  it("keeps runtime behavior and persistence boundaries unchanged", async () => {
    const mod = await import(
      "../otunit-revision-lifecycle-runtime-projection-command-boundary"
    );
    const source = mod.projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary.toString();
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

  it("keeps the module and test source free of forbidden runtime integrations", () => {
    const moduleSource = readSourceText(
      "src/runtime/kernel/otunit-revision-lifecycle-runtime-projection-command-boundary.ts",
    );
    const testSource = readSourceText(
      "src/runtime/kernel/tests/otunit-revision-lifecycle-runtime-projection-command-boundary-contract.test.ts",
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
});
