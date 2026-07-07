import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreview,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "./otunit-revision-chain-boundary";

export const OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_BOUNDARY_KIND =
  "otunit_revision_preview_runtime_command_boundary" as const;

export const OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_NAME =
  "otunit:revision:preview" as const;

export interface ProjectOTUnitRevisionPreviewRuntimeCommandBoundaryInput {
  id: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  revisionIntent: OTUnitRevisionIntentSnapshot;
  proposedPatch: OTUnitRevisionPreviewPatch;
  previewSummary?: string;
  createdAt?: string;
}

export interface OTUnitRevisionPreviewRuntimeCommandBoundaryResult {
  id: string;
  kind: typeof OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_BOUNDARY_KIND;
  commandName: typeof OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_NAME;
  sourceOTUnitId: string;
  revisionIntentRecordId: string;
  outputKind: "revision_preview";
  status: "requires_confirmation";
  preview: OTUnitRevisionPreview;
  runtimeCommandBoundaryOnly: true;
  cliCommandRegistered: false;
  terminalAdapterIntegrated: false;
  repositoryAppendAllowed: false;
  repositoryPersistenceAllowed: false;
  previewCreated: true;
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
    throw new Error(`Revision preview runtime command boundary requires ${label}.`);
  }
}

export function projectOTUnitRevisionPreviewRuntimeCommandBoundary(
  input: ProjectOTUnitRevisionPreviewRuntimeCommandBoundaryInput,
): OTUnitRevisionPreviewRuntimeCommandBoundaryResult {
  assertNonEmptyString("id", input.id);
  assertNonEmptyString("source OTUnit id", input.sourceSnapshot.id);
  assertNonEmptyString("revision intent record id", input.revisionIntent.id);

  const sourceOTUnitId = input.sourceSnapshot.id;
  const revisionIntentRecordId = input.revisionIntent.id;

  const preview: OTUnitRevisionPreview = {
    id: `${input.id}-revision-preview`,
    source: {
      otunitId: sourceOTUnitId,
      revisionIntentRecordId,
      reasonText: input.revisionIntent.reasonText,
      directionText: input.revisionIntent.directionText,
      evidenceRefs: input.revisionIntent.evidenceRefs,
    },
    proposedPatch: input.proposedPatch,
    previewSummary:
      input.previewSummary ?? "Runtime command preview boundary.",
    status: "requires_confirmation",
    requiresConfirmation: true,
    runtimeMutationAllowed: false,
    sourceOTUnitMutationAllowed: false,
    newOTUnitCreated: false,
    createdAt: input.createdAt,
  };

  return {
    id: input.id,
    kind: OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_BOUNDARY_KIND,
    commandName: OTUNIT_REVISION_PREVIEW_RUNTIME_COMMAND_NAME,
    sourceOTUnitId,
    revisionIntentRecordId,
    outputKind: "revision_preview",
    status: "requires_confirmation",
    preview,
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
    createdAt: input.createdAt,
  };
}
