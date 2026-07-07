/**
 * OTUnit Revision Lifecycle Show Command CLI Wiring Boundary
 *
 * Deterministic CLI wiring boundary that turns the revision lifecycle show
 * command boundary / terminal adapter chain into a CLI-consumable plain-text
 * result.
 *
 * No filesystem persistence, no database persistence, no provider / real LLM
 * integration, no environment reads, no ANSI color, and no source OTUnit
 * mutation or replacement.
 */

import {
  projectOTUnitRevisionLifecycleShowCommandBoundary,
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
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
  RunOTUnitRevisionRepositoryDogfoodHarnessInput,
} from "./otunit-revision-repository-dogfood-harness";

import type {
  OTUnitRevisionRepositoryDogfoodSnapshot,
} from "./otunit-revision-repository-dogfood-snapshot";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionPreviewPatch,
  SourceOTUnitSnapshot,
} from "./otunit-revision-chain-boundary";

export const OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_WIRING_BOUNDARY_KIND =
  "otunit_revision_lifecycle_show_command_cli_wiring_boundary" as const;

export const OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_PATH = [
  "otunit",
  "revision",
  "lifecycle",
  "show",
] as const;

export interface OTUnitRevisionLifecycleShowCommandCliWiringBoundaryResult {
  id: string;
  kind: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_WIRING_BOUNDARY_KIND;
  commandName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME;
  commandPath: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_PATH;
  adapterKind: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND;
  adapterName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME;
  boundaryResultId: string;
  readModelId: string;
  snapshotId: string;
  adapterResultId: string;
  stdout: string;
  stderr: "";
  exitCode: 0;
  outputKind: "plain_text";
  lineCount: number;
  byteLength: number;
  cliCommandRegistered: true;
  terminalAdapterIntegrated: true;
  terminalShowReady: true;
  plainTextOnly: true;
  ansiColorAllowed: false;
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

export interface ProjectOTUnitRevisionLifecycleShowCommandCliWiringBoundaryInput {
  id: string;
  createdAt?: string;
}

function makeSourceOTUnitSnapshot(): SourceOTUnitSnapshot {
  return {
    id: "otunit-test-001",
    title: "Test OTUnit",
    objective: "Test the OTUnit revision lifecycle show CLI wiring boundary.",
    owner: "test-user",
    dueDate: "2026-07-30",
    judgmentCriteria: "CLI wiring should produce deterministic plain-text output.",
    planOrActionItems: ["Step 1: Create read model", "Step 2: Project show output"],
    evidenceRefs: ["ev-cli-wiring-001"],
    status: "active",
  };
}

function makeRevisionIntent(): OTUnitRevisionIntentSnapshot {
  return {
    id: "rev-intent-cli-001",
    sourceOTUnitId: "otunit-test-001",
    reasonText: "Need to verify CLI wiring for show command.",
    directionText: "Project the read model into the show command boundary.",
    evidenceRefs: ["ev-cli-wiring-001", "ev-cli-wiring-002"],
  };
}

function makeRevisionPatch(): OTUnitRevisionPreviewPatch {
  return {
    title: "Test OTUnit (Revised — CLI Wiring)",
    objective: "Verify CLI wiring for revision lifecycle show output.",
    owner: "test-user",
    dueDate: "2026-08-15",
    judgmentCriteria: "The CLI must emit deterministic plain-text show output.",
    planOrActionItems: [
      "Create read model.",
      "Project through show command boundary.",
      "Print plain-text output through the CLI.",
    ],
    evidenceRefs: ["ev-cli-wiring-001", "ev-cli-wiring-002"],
  };
}

function buildHarnessInput(): RunOTUnitRevisionRepositoryDogfoodHarnessInput {
  return {
    id: "cli-wiring-dogfood-001",
    sourceSnapshot: makeSourceOTUnitSnapshot(),
    revisionIntent: makeRevisionIntent(),
    proposedPatch: makeRevisionPatch(),
  };
}

function assertCliShowResult(
  result: OTUnitRevisionLifecycleShowCommandAdapterResult,
): void {
  if (result.kind !== OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND) {
    throw new Error("CLI wiring boundary requires terminal adapter kind.");
  }

  if (result.adapterName !== OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME) {
    throw new Error("CLI wiring boundary requires terminal adapter name.");
  }

  if (result.outputKind !== "plain_text") {
    throw new Error("CLI wiring boundary requires plain_text adapter output.");
  }

  if (result.cliCommandRegistered !== false) {
    throw new Error("CLI wiring boundary requires terminal adapter contract output.");
  }
}

async function buildDefaultReadModel(input: {
  createdAt?: string;
}): Promise<{
  snapshot: OTUnitRevisionRepositoryDogfoodSnapshot;
  readModel: OTUnitRevisionDogfoodSnapshotReadModel;
}> {
  const harnessResult = await runOTUnitRevisionRepositoryDogfoodHarness({
    ...buildHarnessInput(),
    createdAt: input.createdAt,
  });

  const snapshot = projectOTUnitRevisionRepositoryDogfoodSnapshot({
    id: "cli-wiring-snapshot-001",
    harnessResult,
    createdAt: input.createdAt,
  });

  const readModel = projectOTUnitRevisionDogfoodSnapshotReadModel({
    id: "cli-wiring-read-model-001",
    snapshot,
    createdAt: input.createdAt,
  });

  return { snapshot, readModel };
}

export async function projectOTUnitRevisionLifecycleShowCommandCliWiringBoundary(
  input: ProjectOTUnitRevisionLifecycleShowCommandCliWiringBoundaryInput,
): Promise<OTUnitRevisionLifecycleShowCommandCliWiringBoundaryResult> {
  const { snapshot, readModel } = await buildDefaultReadModel({
    createdAt: input.createdAt,
  });

  const boundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult =
    projectOTUnitRevisionLifecycleShowCommandBoundary({
      id: "cli-wiring-boundary-001",
      readModel,
      createdAt: input.createdAt,
    });

  const adapterResult = projectOTUnitRevisionLifecycleShowCommandAdapter({
    id: "cli-wiring-adapter-001",
    boundaryResult,
    createdAt: input.createdAt,
  });

  assertCliShowResult(adapterResult);

  return {
    id: input.id,
    kind: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_WIRING_BOUNDARY_KIND,
    commandName: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
    commandPath: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_PATH,
    adapterKind: adapterResult.kind,
    adapterName: adapterResult.adapterName,
    boundaryResultId: boundaryResult.id,
    readModelId: readModel.id,
    snapshotId: snapshot.id,
    adapterResultId: adapterResult.id,
    stdout: adapterResult.stdout,
    stderr: adapterResult.stderr,
    exitCode: adapterResult.exitCode,
    outputKind: adapterResult.outputKind,
    lineCount: adapterResult.lineCount,
    byteLength: adapterResult.byteLength,
    cliCommandRegistered: true,
    terminalAdapterIntegrated: true,
    terminalShowReady: true,
    plainTextOnly: true,
    ansiColorAllowed: false,
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
