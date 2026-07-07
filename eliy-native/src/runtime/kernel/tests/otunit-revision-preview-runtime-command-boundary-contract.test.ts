import { describe, it, expect } from "vitest";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "../otunit-revision-chain-boundary";

function makeSourceSnapshot(
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

function makeRevisionIntent(
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

function makeProposedPatch(
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

describe("otunit-revision-preview-runtime-command-boundary", () => {
  it("exists and exports the runtime command boundary surface", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    expect(
      mod.OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_BOUNDARY_KIND,
    ).toBe("otunit_revision_preview_runtime_command_boundary");
    expect(
      mod.OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_NAME,
    ).toBe("otunit:revision:preview");
    expect(typeof mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary).toBe(
      "function",
    );
  });

  it("projects a preview-only runtime command boundary result", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    const sourceSnapshot = makeSourceSnapshot();
    const revisionIntent = makeRevisionIntent();
    const proposedPatch = makeProposedPatch();

    const result = mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
      id: "runtime-command-boundary_001",
      sourceSnapshot,
      revisionIntent,
      proposedPatch,
      previewSummary: "Runtime command preview boundary.",
      createdAt: "2026-07-07T00:00:00.000Z",
    });

    expect(result).toEqual({
      id: "runtime-command-boundary_001",
      kind: "otunit_revision_preview_runtime_command_boundary",
      commandName: "otunit:revision:preview",
      sourceOTUnitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      outputKind: "revision_preview",
      status: "requires_confirmation",
      preview: {
        id: "runtime-command-boundary_001-revision-preview",
        source: {
          otunitId: "otunit_001",
          revisionIntentRecordId: "revision_intent_001",
          reasonText:
            "Current OTUnit needs a runtime command preview before confirmation.",
          directionText:
            "Project the source OTUnit and revision intent into a preview-only boundary.",
          evidenceRefs: ["evidence_001", "evidence_002"],
        },
        proposedPatch,
        previewSummary: "Runtime command preview boundary.",
        status: "requires_confirmation",
        requiresConfirmation: true,
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        newOTUnitCreated: false,
        createdAt: "2026-07-07T00:00:00.000Z",
      },
      runtimeCommandBoundaryOnly: true,
      cliCommandRegistered: false,
      terminalAdapterIntegrated: false,
      repositoryAppendAllowed: false,
      repositoryPersistenceAllowed: false,
      previewCreated: true,
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
      createdAt: "2026-07-07T00:00:00.000Z",
    });
  });

  it("rejects missing input id", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    expect(() =>
      mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
        id: " ",
        sourceSnapshot: makeSourceSnapshot(),
        revisionIntent: makeRevisionIntent(),
        proposedPatch: makeProposedPatch(),
      }),
    ).toThrow(
      "Revision preview runtime command boundary requires id.",
    );
  });

  it("rejects missing source OTUnit id", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    expect(() =>
      mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
        id: "runtime-command-boundary_002",
        sourceSnapshot: makeSourceSnapshot({ id: "   " }),
        revisionIntent: makeRevisionIntent(),
        proposedPatch: makeProposedPatch(),
      }),
    ).toThrow(
      "Revision preview runtime command boundary requires source OTUnit id.",
    );
  });

  it("rejects missing revision intent record id", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    expect(() =>
      mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
        id: "runtime-command-boundary_003",
        sourceSnapshot: makeSourceSnapshot(),
        revisionIntent: makeRevisionIntent({ id: "" }),
        proposedPatch: makeProposedPatch(),
      }),
    ).toThrow(
      "Revision preview runtime command boundary requires revision intent record id.",
    );
  });

  it("does not mutate the input snapshots or proposed patch", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    const sourceSnapshot = makeSourceSnapshot();
    const revisionIntent = makeRevisionIntent();
    const proposedPatch = makeProposedPatch();

    const sourceSnapshotBefore = structuredClone(sourceSnapshot);
    const revisionIntentBefore = structuredClone(revisionIntent);
    const proposedPatchBefore = structuredClone(proposedPatch);

    mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
      id: "runtime-command-boundary_004",
      sourceSnapshot,
      revisionIntent,
      proposedPatch,
    });

    expect(sourceSnapshot).toEqual(sourceSnapshotBefore);
    expect(revisionIntent).toEqual(revisionIntentBefore);
    expect(proposedPatch).toEqual(proposedPatchBefore);
  });

  it("keeps runtime command boundary behavior preview-only", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    const sourceSnapshot = makeSourceSnapshot();
    const revisionIntent = makeRevisionIntent();
    const proposedPatch = makeProposedPatch();
    const result = mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
      id: "runtime-command-boundary_005",
      sourceSnapshot,
      revisionIntent,
      proposedPatch,
    });

    expect(result.runtimeCommandBoundaryOnly).toBe(true);
    expect(result.cliCommandRegistered).toBe(false);
    expect(result.terminalAdapterIntegrated).toBe(false);
    expect(result.repositoryAppendAllowed).toBe(false);
    expect(result.repositoryPersistenceAllowed).toBe(false);
    expect(result.previewCreated).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
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
  });

  it("keeps source preview data intact in the projected preview", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );

    const sourceSnapshot = makeSourceSnapshot();
    const revisionIntent = makeRevisionIntent();
    const proposedPatch = makeProposedPatch();
    const result = mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary({
      id: "runtime-command-boundary_006",
      sourceSnapshot,
      revisionIntent,
      proposedPatch,
      previewSummary: "Runtime command preview boundary.",
    });

    expect(result.preview.source.otunitId).toBe(sourceSnapshot.id);
    expect(result.preview.source.revisionIntentRecordId).toBe(
      revisionIntent.id,
    );
    expect(result.preview.source.reasonText).toBe(revisionIntent.reasonText);
    expect(result.preview.source.directionText).toBe(
      revisionIntent.directionText,
    );
    expect(result.preview.source.evidenceRefs).toEqual(
      revisionIntent.evidenceRefs,
    );
    expect(result.preview.proposedPatch).toBe(proposedPatch);
    expect(result.preview.previewSummary).toBe(
      "Runtime command preview boundary.",
    );
    expect(result.preview.status).toBe("requires_confirmation");
    expect(result.preview.requiresConfirmation).toBe(true);
    expect(result.preview.runtimeMutationAllowed).toBe(false);
    expect(result.preview.sourceOTUnitMutationAllowed).toBe(false);
    expect(result.preview.newOTUnitCreated).toBe(false);
  });

  it("does not mention forbidden runtime integrations in the command function", async () => {
    const mod = await import(
      "../otunit-revision-preview-runtime-command-boundary"
    );
    const source = mod.projectOTUnitRevisionPreviewRuntimeCommandBoundary.toString();
    const escapeCharacter = String.fromCharCode(27);

    const forbiddenTerms = [
      ["process", ".", "env"].join(""),
      [".", "env"].join(""),
      ["read", "File"].join(""),
      ["write", "File"].join(""),
      ["append", "File"].join(""),
      ["node", ":", "fs"].join(""),
      ["s", "qlite"].join(""),
      ["pos", "tgres"].join(""),
      ["pri", "sma"].join(""),
      ["o", "penai"].join(""),
      ["dee", "pseek"].join(""),
      ["comm", "ander"].join(""),
      ["in", "quirer"].join(""),
      ["ch", "alk"].join(""),
      ["kl", "eur"].join(""),
      ["pic", "ocolors"].join(""),
      escapeCharacter,
      escapeCharacter,
    ];

    for (const term of forbiddenTerms) {
      expect(source).not.toContain(term);
    }
  });
});
