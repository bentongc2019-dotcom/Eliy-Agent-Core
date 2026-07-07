import {
  projectOTUnitRevisionLifecycle,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionLifecycleProjection,
  SourceOTUnitSnapshot,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
} from "./otunit-revision-preview-runtime-command-boundary";

import type {
  OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
} from "./otunit-proposed-revised-otunit-runtime-projection-command-boundary";

import type {
  OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
} from "./otunit-revision-decision-runtime-command-boundary";

import type {
  OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
} from "./otunit-supersession-projection-runtime-command-boundary";

export const OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND =
  "otunit_revision_lifecycle_runtime_projection_command_boundary" as const;

export const OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_NAME =
  "otunit:revision:lifecycle:project" as const;

export interface ProjectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundaryInput {
  id: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  revisionIntent: OTUnitRevisionIntentSnapshot;
  previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult;
  proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
  decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
  supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult;
  createdAt?: string;
}

export interface OTUnitRevisionLifecycleRuntimeProjectionCommandBoundaryResult {
  id: string;
  kind: typeof OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND;
  commandName: typeof OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_NAME;

  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  previewId: string;
  proposedOTUnitId: string;

  outputKind: "revision_lifecycle_projection";
  status: "projected";
  currentStage: OTUnitRevisionLifecycleProjection["currentStage"];
  decisionStatus: "accepted";
  supersessionDeclared: true;

  lifecycleProjection: OTUnitRevisionLifecycleProjection;

  runtimeCommandBoundaryOnly: true;
  cliCommandRegistered: false;
  terminalAdapterIntegrated: false;
  repositoryAppendAllowed: false;
  repositoryPersistenceAllowed: false;

  lifecycleProjectionCreated: true;
  lifecycleProjectionPersisted: false;
  supersessionProjectionConsumed: true;
  sourceOTUnitSuperseded: false;
  proposedRevisedOTUnitPersisted: false;
  proposedRevisedOTUnitActivated: false;
  requiresConfirmation: false;

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
    throw new Error(
      `Revision lifecycle runtime projection command boundary requires ${label}.`,
    );
  }
}

function assertSameValue(label: string, left: string, right: string): void {
  if (left !== right) {
    throw new Error(
      `Revision lifecycle runtime projection command boundary requires matching ${label}.`,
    );
  }
}

function assertPreviewCommandResultReady(
  previewCommandResult: OTUnitRevisionPreviewRuntimeCommandBoundaryResult,
): void {
  if (previewCommandResult.outputKind !== "revision_preview") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires revision preview output.",
    );
  }

  if (previewCommandResult.status !== "requires_confirmation") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires preview status requires_confirmation.",
    );
  }

  if (previewCommandResult.previewCreated !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires previewCreated=true.",
    );
  }

  if (previewCommandResult.requiresConfirmation !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires preview requiresConfirmation=true.",
    );
  }

  if (previewCommandResult.runtimeMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires preview runtimeMutationAllowed=false.",
    );
  }

  if (previewCommandResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires preview sourceOTUnitMutationAllowed=false.",
    );
  }

  if (previewCommandResult.newOTUnitCreated !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires preview newOTUnitCreated=false.",
    );
  }
}

function assertProposedProjectionResultReady(
  proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
): void {
  if (proposedProjectionResult.outputKind !== "proposed_revised_otunit_projection") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed revised OTUnit projection output.",
    );
  }

  if (proposedProjectionResult.status !== "requires_confirmation") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection status requires_confirmation.",
    );
  }

  if (proposedProjectionResult.decisionStatus !== "confirmed") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires confirmed preview decision status.",
    );
  }

  if (proposedProjectionResult.projectionCreated !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires projectionCreated=true.",
    );
  }

  if (proposedProjectionResult.proposedRevisedOTUnitProjected !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitProjected=true.",
    );
  }

  if (proposedProjectionResult.proposedRevisedOTUnitPersisted !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitPersisted=false.",
    );
  }

  if (proposedProjectionResult.runtimeMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection runtimeMutationAllowed=false.",
    );
  }

  if (proposedProjectionResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection sourceOTUnitMutationAllowed=false.",
    );
  }

  if (proposedProjectionResult.sourceOTUnitStatusChangeAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection sourceOTUnitStatusChangeAllowed=false.",
    );
  }

  if (proposedProjectionResult.sourceOTUnitReplacementAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection sourceOTUnitReplacementAllowed=false.",
    );
  }

  if (proposedProjectionResult.newOTUnitCreated !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection newOTUnitCreated=false.",
    );
  }

  if (proposedProjectionResult.autoReplaceSourceOTUnit !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed projection autoReplaceSourceOTUnit=false.",
    );
  }
}

function assertDecisionRuntimeCommandResultReady(
  decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
): void {
  if (decisionRuntimeCommandResult.outputKind !== "proposed_revised_otunit_decision") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposed revised OTUnit decision output.",
    );
  }

  if (decisionRuntimeCommandResult.status !== "decided") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decided status.",
    );
  }

  if (decisionRuntimeCommandResult.decisionStatus !== "accepted") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires accepted decision.",
    );
  }

  if (decisionRuntimeCommandResult.decisionRecorded !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decisionRecorded=true.",
    );
  }

  if (decisionRuntimeCommandResult.proposedRevisedOTUnitAccepted !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitAccepted=true.",
    );
  }

  if (decisionRuntimeCommandResult.proposedRevisedOTUnitRejected !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitRejected=false.",
    );
  }

  if (decisionRuntimeCommandResult.supersessionDeclared !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision supersessionDeclared=false.",
    );
  }

  if (decisionRuntimeCommandResult.proposedRevisedOTUnitPersisted !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision proposedRevisedOTUnitPersisted=false.",
    );
  }

  if (decisionRuntimeCommandResult.runtimeMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision runtimeMutationAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision sourceOTUnitMutationAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.sourceOTUnitStatusChangeAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision sourceOTUnitStatusChangeAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.sourceOTUnitReplacementAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision sourceOTUnitReplacementAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.newOTUnitCreated !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision newOTUnitCreated=false.",
    );
  }

  if (decisionRuntimeCommandResult.autoReplaceSourceOTUnit !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires decision autoReplaceSourceOTUnit=false.",
    );
  }
}

function assertSupersessionProjectionResultReady(
  supersessionProjectionResult: OTUnitSupersessionProjectionRuntimeCommandBoundaryResult,
): void {
  if (supersessionProjectionResult.outputKind !== "supersession_projection") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession projection output.",
    );
  }

  if (supersessionProjectionResult.status !== "projected") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession projected status.",
    );
  }

  if (supersessionProjectionResult.decisionStatus !== "accepted") {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession accepted decision status.",
    );
  }

  if (supersessionProjectionResult.supersessionProjectionCreated !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersessionProjectionCreated=true.",
    );
  }

  if (supersessionProjectionResult.supersessionBoundaryProjected !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersessionBoundaryProjected=true.",
    );
  }

  if (supersessionProjectionResult.supersessionDeclared !== true) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersessionDeclared=true.",
    );
  }

  if (supersessionProjectionResult.supersessionPersisted !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersessionPersisted=false.",
    );
  }

  if (supersessionProjectionResult.sourceOTUnitSuperseded !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires sourceOTUnitSuperseded=false.",
    );
  }

  if (supersessionProjectionResult.proposedRevisedOTUnitPersisted !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitPersisted=false.",
    );
  }

  if (supersessionProjectionResult.proposedRevisedOTUnitActivated !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires proposedRevisedOTUnitActivated=false.",
    );
  }

  if (supersessionProjectionResult.runtimeMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession runtimeMutationAllowed=false.",
    );
  }

  if (supersessionProjectionResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession sourceOTUnitMutationAllowed=false.",
    );
  }

  if (supersessionProjectionResult.sourceOTUnitStatusChangeAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession sourceOTUnitStatusChangeAllowed=false.",
    );
  }

  if (supersessionProjectionResult.sourceOTUnitReplacementAllowed !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires supersession sourceOTUnitReplacementAllowed=false.",
    );
  }

  if (supersessionProjectionResult.newOTUnitCreated !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires newOTUnitCreated=false.",
    );
  }

  if (supersessionProjectionResult.autoReplaceSourceOTUnit !== false) {
    throw new Error(
      "Revision lifecycle runtime projection command boundary requires autoReplaceSourceOTUnit=false.",
    );
  }
}

export function projectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundary(
  input: ProjectOTUnitRevisionLifecycleRuntimeProjectionCommandBoundaryInput,
): OTUnitRevisionLifecycleRuntimeProjectionCommandBoundaryResult {
  assertNonEmptyString("id", input.id);
  assertNonEmptyString("source OTUnit id", input.sourceSnapshot.id);
  assertNonEmptyString("revision intent record id", input.revisionIntent.id);
  assertNonEmptyString(
    "preview id",
    input.previewCommandResult.preview.id,
  );
  assertNonEmptyString(
    "proposed OTUnit id",
    input.proposedProjectionResult.proposedOTUnitId,
  );

  assertPreviewCommandResultReady(input.previewCommandResult);
  assertProposedProjectionResultReady(input.proposedProjectionResult);
  assertDecisionRuntimeCommandResultReady(input.decisionRuntimeCommandResult);
  assertSupersessionProjectionResultReady(input.supersessionProjectionResult);

  assertSameValue(
    "source OTUnit id",
    input.sourceSnapshot.id,
    input.previewCommandResult.sourceOTUnitId,
  );
  assertSameValue(
    "source OTUnit id",
    input.sourceSnapshot.id,
    input.proposedProjectionResult.sourceOTUnitId,
  );
  assertSameValue(
    "source OTUnit id",
    input.sourceSnapshot.id,
    input.decisionRuntimeCommandResult.sourceOTUnitId,
  );
  assertSameValue(
    "source OTUnit id",
    input.sourceSnapshot.id,
    input.supersessionProjectionResult.sourceOTUnitId,
  );

  assertSameValue(
    "revision intent record id",
    input.revisionIntent.id,
    input.previewCommandResult.revisionIntentRecordId,
  );
  assertSameValue(
    "revision intent record id",
    input.revisionIntent.id,
    input.proposedProjectionResult.revisionIntentRecordId,
  );
  assertSameValue(
    "revision intent record id",
    input.revisionIntent.id,
    input.decisionRuntimeCommandResult.revisionIntentRecordId,
  );
  assertSameValue(
    "revision intent record id",
    input.revisionIntent.id,
    input.supersessionProjectionResult.revisionIntentRecordId,
  );

  assertSameValue(
    "preview id",
    input.previewCommandResult.preview.id,
    input.proposedProjectionResult.previewId,
  );
  assertSameValue(
    "preview id",
    input.previewCommandResult.preview.id,
    input.decisionRuntimeCommandResult.previewId,
  );
  assertSameValue(
    "preview id",
    input.previewCommandResult.preview.id,
    input.supersessionProjectionResult.previewId,
  );

  assertSameValue(
    "proposed OTUnit id",
    input.proposedProjectionResult.proposedOTUnitId,
    input.decisionRuntimeCommandResult.proposedOTUnitId,
  );
  assertSameValue(
    "proposed OTUnit id",
    input.proposedProjectionResult.proposedOTUnitId,
    input.supersessionProjectionResult.proposedOTUnitId,
  );

  const lifecycleProjection = projectOTUnitRevisionLifecycle({
    id: `${input.id}-lifecycle-projection`,
    revisionIntent: input.revisionIntent,
    preview: input.previewCommandResult.preview,
    proposedBoundary: input.proposedProjectionResult.proposedBoundary,
    decisionBoundary: input.decisionRuntimeCommandResult.decisionBoundary,
    supersessionBoundary: input.supersessionProjectionResult.supersessionBoundary,
    createdAt: input.createdAt,
  });

  return {
    id: input.id,
    kind: OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_BOUNDARY_KIND,
    commandName: OTUNIT_REVISION_LIFECYCLE_RUNTIME_PROJECTION_COMMAND_NAME,
    sourceOTUnitId: input.sourceSnapshot.id,
    revisionIntentRecordId: input.revisionIntent.id,
    previewId: input.previewCommandResult.preview.id,
    proposedOTUnitId: input.proposedProjectionResult.proposedOTUnitId,
    outputKind: "revision_lifecycle_projection",
    status: "projected",
    currentStage: lifecycleProjection.currentStage,
    decisionStatus: "accepted",
    supersessionDeclared: true,
    lifecycleProjection,
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
    createdAt: input.createdAt,
  };
}
