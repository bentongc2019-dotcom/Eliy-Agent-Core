import {
  declareOTUnitSupersessionFromAcceptedDecision,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitSupersessionBoundaryRecord,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
} from "./otunit-revision-decision-runtime-command-boundary";

export const OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_BOUNDARY_KIND =
  "otunit_supersession_projection_runtime_command_boundary" as const;

export const OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_NAME =
  "otunit:revision:supersession:project" as const;

export interface ProjectOTUnitSupersessionProjectionRuntimeCommandBoundaryInput {
  id: string;
  decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult;
  createdAt?: string;
}

export interface OTUnitSupersessionProjectionRuntimeCommandBoundaryResult {
  id: string;
  kind: typeof OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_BOUNDARY_KIND;
  commandName: typeof OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_NAME;

  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  previewId: string;
  proposedOTUnitId: string;

  outputKind: "supersession_projection";
  status: "projected";
  decisionStatus: "accepted";

  supersessionBoundary: OTUnitSupersessionBoundaryRecord;

  runtimeCommandBoundaryOnly: true;
  cliCommandRegistered: false;
  terminalAdapterIntegrated: false;
  repositoryAppendAllowed: false;
  repositoryPersistenceAllowed: false;

  supersessionProjectionCreated: true;
  supersessionBoundaryProjected: true;
  supersessionDeclared: true;
  supersessionPersisted: false;
  supersessionAppliedToSourceOTUnit: false;
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
      `Supersession projection runtime command boundary requires ${label}.`,
    );
  }
}

function assertDecisionRuntimeCommandResultReady(
  decisionRuntimeCommandResult: OTUnitRevisionDecisionRuntimeCommandBoundaryResult,
): void {
  if (
    decisionRuntimeCommandResult.outputKind !==
    "proposed_revised_otunit_decision"
  ) {
    throw new Error(
      "Supersession projection runtime command boundary requires proposed revised OTUnit decision output.",
    );
  }

  if (decisionRuntimeCommandResult.status !== "decided") {
    throw new Error(
      "Supersession projection runtime command boundary requires decided status.",
    );
  }

  if (decisionRuntimeCommandResult.decisionStatus !== "accepted") {
    throw new Error(
      "Supersession projection runtime command boundary requires accepted decision.",
    );
  }

  if (decisionRuntimeCommandResult.decisionRecorded !== true) {
    throw new Error(
      "Supersession projection runtime command boundary requires decisionRecorded=true.",
    );
  }

  if (decisionRuntimeCommandResult.proposedRevisedOTUnitAccepted !== true) {
    throw new Error(
      "Supersession projection runtime command boundary requires proposedRevisedOTUnitAccepted=true.",
    );
  }

  if (decisionRuntimeCommandResult.proposedRevisedOTUnitRejected !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires proposedRevisedOTUnitRejected=false.",
    );
  }

  if (decisionRuntimeCommandResult.proposedRevisedOTUnitPersisted !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires proposedRevisedOTUnitPersisted=false.",
    );
  }

  if (decisionRuntimeCommandResult.supersessionDeclared !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires supersessionDeclared=false before projection.",
    );
  }

  if (decisionRuntimeCommandResult.requiresConfirmation !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires requiresConfirmation=false.",
    );
  }

  if (decisionRuntimeCommandResult.runtimeMutationAllowed !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires runtimeMutationAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires sourceOTUnitMutationAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.sourceOTUnitStatusChangeAllowed !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires sourceOTUnitStatusChangeAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.sourceOTUnitReplacementAllowed !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires sourceOTUnitReplacementAllowed=false.",
    );
  }

  if (decisionRuntimeCommandResult.newOTUnitCreated !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires newOTUnitCreated=false.",
    );
  }

  if (decisionRuntimeCommandResult.autoReplaceSourceOTUnit !== false) {
    throw new Error(
      "Supersession projection runtime command boundary requires autoReplaceSourceOTUnit=false.",
    );
  }
}

export function projectOTUnitSupersessionProjectionRuntimeCommandBoundary(
  input: ProjectOTUnitSupersessionProjectionRuntimeCommandBoundaryInput,
): OTUnitSupersessionProjectionRuntimeCommandBoundaryResult {
  assertNonEmptyString("id", input.id);
  assertNonEmptyString(
    "source OTUnit id",
    input.decisionRuntimeCommandResult.sourceOTUnitId,
  );
  assertNonEmptyString(
    "revision intent record id",
    input.decisionRuntimeCommandResult.revisionIntentRecordId,
  );
  assertNonEmptyString("preview id", input.decisionRuntimeCommandResult.previewId);
  assertNonEmptyString(
    "proposed OTUnit id",
    input.decisionRuntimeCommandResult.proposedOTUnitId,
  );

  assertDecisionRuntimeCommandResultReady(input.decisionRuntimeCommandResult);

  const supersessionBoundary = declareOTUnitSupersessionFromAcceptedDecision({
    id: `${input.id}-supersession-boundary`,
    decisionBoundaryRecord: input.decisionRuntimeCommandResult.decisionBoundary,
    createdAt: input.createdAt,
  });

  return {
    id: input.id,
    kind: OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_BOUNDARY_KIND,
    commandName: OTUNIT_SUPERSESSION_PROJECTION_RUNTIME_COMMAND_NAME,
    sourceOTUnitId: input.decisionRuntimeCommandResult.sourceOTUnitId,
    revisionIntentRecordId:
      input.decisionRuntimeCommandResult.revisionIntentRecordId,
    previewId: input.decisionRuntimeCommandResult.previewId,
    proposedOTUnitId: input.decisionRuntimeCommandResult.proposedOTUnitId,
    outputKind: "supersession_projection",
    status: "projected",
    decisionStatus: "accepted",
    supersessionBoundary,
    runtimeCommandBoundaryOnly: true,
    cliCommandRegistered: false,
    terminalAdapterIntegrated: false,
    repositoryAppendAllowed: false,
    repositoryPersistenceAllowed: false,
    supersessionProjectionCreated: true,
    supersessionBoundaryProjected: true,
    supersessionDeclared: true,
    supersessionPersisted: false,
    supersessionAppliedToSourceOTUnit: false,
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
