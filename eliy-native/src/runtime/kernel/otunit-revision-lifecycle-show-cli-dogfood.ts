/**
 * OTUnit Revision Lifecycle Show CLI Dogfood
 *
 * Deterministic dogfood-only boundary that projects the existing revision
 * lifecycle show chain into terminal plain-text output for the CLI.
 *
 * No filesystem persistence, no database persistence, no provider / real LLM
 * integration, no environment reads, and no source OTUnit mutation or
 * replacement.
 */

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
  projectOTUnitRevisionLifecycleShowCommandBoundary,
} from "./otunit-revision-lifecycle-show-command-boundary";

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND,
  OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME,
  projectOTUnitRevisionLifecycleShowCommandAdapter,
} from "./otunit-revision-lifecycle-show-command-adapter";

import {
  projectOTUnitRevisionDogfoodSnapshotReadModel,
} from "./otunit-revision-dogfood-snapshot-read-model";

import {
  projectOTUnitRevisionRepositoryDogfoodSnapshot,
} from "./otunit-revision-repository-dogfood-snapshot";

import {
  runOTUnitRevisionRepositoryDogfoodHarness,
} from "./otunit-revision-repository-dogfood-harness";

import type {
  OTUnitRevisionDogfoodSnapshotReadModel,
} from "./otunit-revision-dogfood-snapshot-read-model";

import type {
  OTUnitRevisionLifecycleShowCommandAdapterResult,
} from "./otunit-revision-lifecycle-show-command-adapter";

import type {
  OTUnitRevisionLifecycleShowCommandBoundaryResult,
} from "./otunit-revision-lifecycle-show-command-boundary";

import type {
  OTUnitRevisionRepositoryDogfoodSnapshot,
} from "./otunit-revision-repository-dogfood-snapshot";

import type {
  RunOTUnitRevisionRepositoryDogfoodHarnessInput,
} from "./otunit-revision-repository-dogfood-harness";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "./otunit-revision-chain-boundary";

export const OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND =
  "otunit_revision_lifecycle_show_cli_dogfood" as const;

export const OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_COMMAND_PATH = [
  "otunit",
  "revision-lifecycle-show",
] as const;

export interface OTUnitRevisionLifecycleShowCliDogfoodResult {
  id: string;
  kind: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND;
  commandName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME;
  commandPath: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_COMMAND_PATH;
  boundaryResultId: string;
  readModelId: string;
  snapshotId: string;
  adapterResultId: string;
  adapterKind: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND;
  adapterName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME;
  adapterResult: OTUnitRevisionLifecycleShowCommandAdapterResult;
  stdout: string;
  stderr: "";
  exitCode: 0;
  outputKind: "plain_text";
  dogfoodOnly: true;
  terminalShowReady: true;
  plainTextOnly: true;
  ansiColorAllowed: false;
  cliCommandRegistered: true;
  terminalAdapterIntegrated: true;
  runtimeMutationAllowed: false;
  repositoryPersistenceAllowed: false;
  filesystemPersistenceAllowed: false;
  databasePersistenceAllowed: false;
  sourceOTUnitMutationAllowed: false;
  sourceOTUnitStatusChangeAllowed: false;
  sourceOTUnitReplacementAllowed: false;
  autoReplaceSourceOTUnit: false;
  createdAt?: string;
}

export interface RunOTUnitRevisionLifecycleShowCliDogfoodInput {
  id: string;
  createdAt?: string;
}

function makeSourceOTUnitSnapshot(): SourceOTUnitSnapshot {
  return {
    id: "otunit-test-001",
    title: "Test OTUnit",
    objective: "Test the OTUnit revision lifecycle show CLI dogfood path.",
    owner: "test-user",
    dueDate: "2026-07-30",
    judgmentCriteria: "The CLI must emit deterministic plain text output.",
    planOrActionItems: [
      "Create a terminal-show-ready read model.",
      "Project the show boundary.",
      "Print adapter stdout through the CLI.",
    ],
    evidenceRefs: ["ev-cli-dogfood-001"],
    status: "active",
  };
}

function makeRevisionIntent(): OTUnitRevisionIntentSnapshot {
  return {
    id: "rev-intent-cli-dogfood-001",
    sourceOTUnitId: "otunit-test-001",
    reasonText: "Verify the exact revision-lifecycle-show CLI path.",
    directionText: "Project the existing lifecycle show chain through the CLI.",
    evidenceRefs: ["ev-cli-dogfood-001", "ev-cli-dogfood-002"],
  };
}

function makeRevisionPatch(): OTUnitRevisionPreviewPatch {
  return {
    title: "Test OTUnit (Revised - CLI Dogfood)",
    objective: "Verify exact revision-lifecycle-show CLI output.",
    owner: "test-user",
    dueDate: "2026-08-15",
    judgmentCriteria: "The CLI must print adapter stdout with no ANSI escapes.",
    planOrActionItems: [
      "Create read model.",
      "Project through show command boundary.",
      "Write adapter stdout to terminal.",
    ],
    evidenceRefs: ["ev-cli-dogfood-001", "ev-cli-dogfood-002"],
  };
}

function buildHarnessInput(): RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  return {
    id: "cli-dogfood-harness-001",
    sourceSnapshot: makeSourceOTUnitSnapshot(),
    revisionIntent: makeRevisionIntent(),
    proposedPatch: makeRevisionPatch(),
  };
}

async function buildReadModel(
  createdAt?: string,
): Promise<{
  snapshot: OTUnitRevisionRepositoryDogfoodSnapshot;
  readModel: OTUnitRevisionDogfoodSnapshotReadModel;
}> {
  const harnessResult = await runOTUnitRevisionRepositoryDogfoodHarness({
    ...buildHarnessInput(),
    createdAt,
  });

  const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
    id: "cli-dogfood-snapshot-001",
    harnessResult,
    createdAt,
  });

  const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
    id: "cli-dogfood-read-model-001",
    snapshot,
    createdAt,
  });

  return { snapshot, readModel };
}

function assertPlainTextOutput(result: OTUnitRevisionLifecycleShowCommandAdapterResult): void {
  if (result.outputKind !== "plain_text") {
    throw new Error("revision-lifecycle-show dogfood requires plain_text output.");
  }

  if (result.ansiColorAllowed !== false) {
    throw new Error("revision-lifecycle-show dogfood requires ansiColorAllowed=false.");
  }

  if (result.cliCommandRegistered !== false) {
    throw new Error("revision-lifecycle-show dogfood requires terminal adapter contract output.");
  }
}

export async function runOTUnitRevisionLifecycleShowCliDogfood(
  input: RunOTUnitRevisionLifecycleShowCliDogfoodInput,
): Promise<OTUnitRevisionLifecycleShowCliDogfoodResult> {
  const { snapshot, readModel } = await buildReadModel(input.createdAt);

  const boundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult =
    projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cli-dogfood-boundary-001",
      readModel,
      createdAt: input.createdAt,
    });

  const adapterResult = projectOTUnitRevisionLifecycleShowCommandAdapter({
    id: "cli-dogfood-adapter-001",
    boundaryResult,
    createdAt: input.createdAt,
  });

  assertPlainTextOutput(adapterResult);

  return {
    id: input.id,
    kind: OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND,
    commandName: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
    commandPath: OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_COMMAND_PATH,
    boundaryResultId: boundaryResult.id,
    readModelId: readModel.id,
    snapshotId: snapshot.id,
    adapterResultId: adapterResult.id,
    adapterKind: adapterResult.kind,
    adapterName: adapterResult.adapterName,
    adapterResult,
    stdout: adapterResult.stdout,
    stderr: "",
    exitCode: 0,
    outputKind: "plain_text",
    dogfoodOnly: true,
    terminalShowReady: true,
    plainTextOnly: true,
    ansiColorAllowed: false,
    cliCommandRegistered: true,
    terminalAdapterIntegrated: true,
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    filesystemPersistenceAllowed: false,
    databasePersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    createdAt: input.createdAt,
  };
}
