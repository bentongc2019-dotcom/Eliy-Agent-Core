import {
  decideProposedRevisedOTUnit,
} from "./otunit-revision-chain-boundary";

import type {
  ProposedRevisedOTUnitDecisionBoundaryRecord,
} from "./otunit-revision-chain-boundary";

import type {
  OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
} from "./otunit-proposed-revised-otunit-runtime-projection-command-boundary";

export const OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_BOUNDARY_KIND =
  "otunit_revision_decision_runtime_command_boundary" as const;

export const OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_NAME =
  "otunit:revision:decision" as const;

export interface OTUnitRevisionDecisionRuntimeCommandDecisionInput {
  id: string;
  proposedOTUnitId: string;
  status: "accepted" | "rejected";
  decidedBy: "user";
  reason?: string;
  createdAt?: string;
}

export interface ProjectOTUnitRevisionDecisionRuntimeCommandBoundaryInput {
  id: string;
  proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult;
  decision: OTUnitRevisionDecisionRuntimeCommandDecisionInput;
  createdAt?: string;
}

export interface OTUnitRevisionDecisionRuntimeCommandBoundaryResult {
  id: string;
  kind: typeof OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_BOUNDARY_KIND;
  commandName: typeof OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_NAME;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  previewId: string;
  proposedOTUnitId: string;
  outputKind: "proposed_revised_otunit_decision";
  status: "decided";
  decisionStatus: "accepted" | "rejected";
  decisionBoundary: ProposedRevisedOTUnitDecisionBoundaryRecord;
  runtimeCommandBoundaryOnly: true;
  cliCommandRegistered: false;
  terminalAdapterIntegrated: false;
  repositoryAppendAllowed: false;
  repositoryPersistenceAllowed: false;
  decisionRecorded: true;
  proposedRevisedOTUnitAccepted: boolean;
  proposedRevisedOTUnitRejected: boolean;
  proposedRevisedOTUnitPersisted: false;
  supersessionDeclared: false;
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
      `Revision decision runtime command boundary requires ${label}.`,
    );
  }
}

function assertProposedProjectionResultReady(
  proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
): void {
  if (proposedProjectionResult.outputKind !== "proposed_revised_otunit_projection") {
    throw new Error(
      "Revision decision runtime command boundary requires proposed revised OTUnit projection output.",
    );
  }

  if (proposedProjectionResult.status !== "requires_confirmation") {
    throw new Error(
      "Revision decision runtime command boundary requires proposed projection status requires_confirmation.",
    );
  }

  if (proposedProjectionResult.decisionStatus !== "confirmed") {
    throw new Error(
      "Revision decision runtime command boundary requires confirmed preview decision status.",
    );
  }

  if (proposedProjectionResult.projectionCreated !== true) {
    throw new Error(
      "Revision decision runtime command boundary requires projectionCreated=true.",
    );
  }

  if (proposedProjectionResult.proposedRevisedOTUnitProjected !== true) {
    throw new Error(
      "Revision decision runtime command boundary requires proposedRevisedOTUnitProjected=true.",
    );
  }

  if (proposedProjectionResult.proposedRevisedOTUnitPersisted !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires proposedRevisedOTUnitPersisted=false.",
    );
  }

  if (proposedProjectionResult.requiresConfirmation !== true) {
    throw new Error(
      "Revision decision runtime command boundary requires proposed projection requiresConfirmation=true.",
    );
  }

  if (proposedProjectionResult.runtimeMutationAllowed !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires runtimeMutationAllowed=false.",
    );
  }

  if (proposedProjectionResult.sourceOTUnitMutationAllowed !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires sourceOTUnitMutationAllowed=false.",
    );
  }

  if (proposedProjectionResult.sourceOTUnitStatusChangeAllowed !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires sourceOTUnitStatusChangeAllowed=false.",
    );
  }

  if (proposedProjectionResult.sourceOTUnitReplacementAllowed !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires sourceOTUnitReplacementAllowed=false.",
    );
  }

  if (proposedProjectionResult.newOTUnitCreated !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires newOTUnitCreated=false.",
    );
  }

  if (proposedProjectionResult.autoReplaceSourceOTUnit !== false) {
    throw new Error(
      "Revision decision runtime command boundary requires autoReplaceSourceOTUnit=false.",
    );
  }
}

function assertDecisionReady(
  proposedProjectionResult: OTUnitProposedRevisedOTUnitRuntimeProjectionCommandBoundaryResult,
  decision: OTUnitRevisionDecisionRuntimeCommandDecisionInput,
): void {
  assertNonEmptyString("decision id", decision.id);
  assertNonEmptyString("decision proposed OTUnit id", decision.proposedOTUnitId);

  if (decision.proposedOTUnitId !== proposedProjectionResult.proposedOTUnitId) {
    throw new Error(
      "Revision decision runtime command boundary requires decision proposedOTUnitId to match proposed projection.",
    );
  }

  if (decision.status !== "accepted" && decision.status !== "rejected") {
    throw new Error(
      "Revision decision runtime command boundary requires accepted or rejected decision.",
    );
  }

  if (decision.decidedBy !== "user") {
    throw new Error(
      "Revision decision runtime command boundary requires user decision.",
    );
  }
}

export function projectOTUnitRevisionDecisionRuntimeCommandBoundary(
  input: ProjectOTUnitRevisionDecisionRuntimeCommandBoundaryInput,
): OTUnitRevisionDecisionRuntimeCommandBoundaryResult {
  assertNonEmptyString("id", input.id);
  assertNonEmptyString("source OTUnit id", input.proposedProjectionResult.sourceOTUnitId);
  assertNonEmptyString(
    "revision intent record id",
    input.proposedProjectionResult.revisionIntentRecordId,
  );
  assertNonEmptyString("preview id", input.proposedProjectionResult.previewId);
  assertNonEmptyString(
    "proposed OTUnit id",
    input.proposedProjectionResult.proposedOTUnitId,
  );

  assertProposedProjectionResultReady(input.proposedProjectionResult);
  assertDecisionReady(input.proposedProjectionResult, input.decision);

  const decisionBoundary = decideProposedRevisedOTUnit({
    id: `${input.id}-decision-boundary`,
    proposed: input.proposedProjectionResult.proposedBoundary.proposed,
    decision: input.decision,
    createdAt: input.createdAt,
  });

  return {
    id: input.id,
    kind: OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_BOUNDARY_KIND,
    commandName: OTUNIT_REVISION_DECISION_RUNTIME_COMMAND_NAME,
    sourceOTUnitId: input.proposedProjectionResult.sourceOTUnitId,
    revisionIntentRecordId: input.proposedProjectionResult.revisionIntentRecordId,
    previewId: input.proposedProjectionResult.previewId,
    proposedOTUnitId: input.proposedProjectionResult.proposedOTUnitId,
    outputKind: "proposed_revised_otunit_decision",
    status: "decided",
    decisionStatus: input.decision.status,
    decisionBoundary,
    runtimeCommandBoundaryOnly: true,
    cliCommandRegistered: false,
    terminalAdapterIntegrated: false,
    repositoryAppendAllowed: false,
    repositoryPersistenceAllowed: false,
    decisionRecorded: true,
    proposedRevisedOTUnitAccepted: input.decision.status === "accepted",
    proposedRevisedOTUnitRejected: input.decision.status === "rejected",
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
    createdAt: input.createdAt,
  };
}
