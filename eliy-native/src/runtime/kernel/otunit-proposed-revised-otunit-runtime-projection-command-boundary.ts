import {
  createProposedRevisedOTUnitFromConfirmedPreview,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionPreviewDecision,
  ProposedRevisedOTUnitBoundaryRecord,
  SourceOTUnitSnapshot,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
} from "./otunit-revision-preview-runtime-command-boundary";

export const OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND =
  "otunit_proposed_revised_otunit_runtime_projection_command_boundary" as const;

export const OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_NAME =
  "otunit:revision:proposed-revised-otunit:project" as const;

export interface ProjectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryInput {
  id: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
  decision: OTUnitRevisionPreviewDecision;
  proposedOTUnitId: string;
  createdAt?: string;
}

export interface OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult {
  id: string;
  kind: typeof OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND;
  commandName: typeof OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_NAME;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  previewId: string;
  proposedOTUnitId: string;
  outputKind: "proposed_revised_otunit_projection";
  status: "requires_confirmation";
  decisionStatus: "confirmed";
  proposedBoundary: ProposedRevisedOTUnitBoundaryRecord;
  runtimeCommandBoundaryOnly: true;
  cliCommandRegistered: false;
  terminalAdapterIntegrated: false;
  repositoryAppendAllowed: false;
  repositoryPersistenceAllowed: false;
  projectionCreated: true;
  proposedRevisedOTUnitProjected: true;
  proposedRevisedOTUnitPersisted: false;
  requiresConfirmation: true;
  runtimeMutationAllowed: false;
  filesystemPersistenceAllowed: false;
  databasePersistenceAllowed: false;
  providerIntegrationAllowed: false;
  realLLMAllowed: false;
  environmentReadAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  newOTUnitCreated: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

function assertNonEmptyString(label: string, value: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Proposed revised OTUnit runtime projection command boundary requires ${label}.`);
  }
}

function assertPreviewCommandResultReady(
  previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
): void {
  if (previewCommandResult.outputKind !== "revision_preview") {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires revision preview output.");
  }

  if (previewCommandResult.status !== "requires_confirmation") {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires preview status requires_confirmation.");
  }

  if (previewCommandResult.previewCreated !== true) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires previewCreated=true.");
  }

  if (previewCommandResult.requiresConfirmation !== true) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires preview requiresConfirmation=true.");
  }

  if (previewCommandResult.runtimeMutationAllowed !== false) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires runtimeMutationAllowed=false.");
  }

  if (previewCommandResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires sourceOTUnitMutationAllowed=false.");
  }

  if (previewCommandResult.newOTUnitCreated !== false) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires newOTUnitCreated=false.");
  }
}

export function projectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundary(
  input: ProjectOTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryInput,
): OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult {
  assertNonEmptyString("id", input.id);
  assertNonEmptyString("source OTUnit id", input.sourceSnapshot.id);
  assertNonEmptyString("preview command source OTUnit id", input.previewCommandResult.sourceOTUnitId);
  assertNonEmptyString("revision intent record id", input.previewCommandResult.revisionIntentRecordId);
  assertNonEmptyString("proposed OTUnit id", input.proposedOTUnitId);

  assertPreviewCommandResultReady(input.previewCommandResult);

  if (input.sourceSnapshot.id !== input.previewCommandResult.sourceOTUnitId) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires source snapshot to match preview command source OTUnit.");
  }

  if (input.previewCommandResult.preview.source.otunitId !== input.sourceSnapshot.id) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires preview source OTUnit to match source snapshot.");
  }

  if (
    input.previewCommandResult.preview.source.revisionIntentRecordId !==
    input.previewCommandResult.revisionIntentRecordId
  ) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires preview revision intent to match command result.");
  }

  if (input.decision.previewId !== input.previewCommandResult.preview.id) {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires decision previewId to match preview id.");
  }

  if (input.decision.status !== "confirmed") {
    throw new Error("Proposed revised OTUnit runtime projection command boundary requires confirmed preview decision.");
  }

  const proposedBoundary = createProposedRevisedOTUnitFromConfirmedPreview({
    id: `${input.id}-proposed-revised-otunit-boundary`,
    proposedOTUnitId: input.proposedOTUnitId,
    sourceSnapshot: input.sourceSnapshot,
    preview: input.previewCommandResult.preview,
    decision: input.decision,
    createdAt: input.createdAt,
  });

  return {
    id: input.id,
    kind: OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND,
    commandName: OTUNIT_PROPOSED_REVISED_OTUNIT_RUNTIME_PROJECTION_COMMAND_NAME,
    sourceOTUnitId: input.sourceSnapshot.id,
    revisionIntentRecordId: input.previewCommandResult.revisionIntentRecordId,
    previewId: input.previewCommandResult.preview.id,
    proposedOTUnitId: input.proposedOTUnitId,
    outputKind: "proposed_revised_otunit_projection",
    status: "requires_confirmation",
    decisionStatus: "confirmed",
    proposedBoundary: {
      ...proposedBoundary,
      proposed: {
        ...proposedBoundary.proposed,
        sourceOTUnitReplacementAllowed: false as const,
      },
    } as ProposedRevisedOTUnitBoundaryRecord & {
      proposed: ProposedRevisedOTUnitBoundaryRecord["proposed"] & {
        sourceOTUnitReplacementAllowed: false;
      };
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
    createdAt: input.createdAt,
  };
}
