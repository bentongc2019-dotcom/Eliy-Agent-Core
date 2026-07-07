/**
 * OTUnit Revision Lifecycle Show Command Adapter
 *
 * Pure terminal adapter contract / projection that turns a revision lifecycle
 * show command boundary result into deterministic plain-text terminal adapter
 * output for future terminal dogfood use.
 *
 * No CLI registration, no CLI file changes, no filesystem persistence,
 * no database persistence, no provider integration, no environment reads,
 * no ANSI color, no runtime behavior change, and no source OTUnit mutation
 * or replacement.
 *
 * PR #64 — Terminal adapter contract only.
 *
 * Stage: C / Runtime Command - Terminal Dogfood
 * Strict boundary: terminal adapter contract / pure projection only.
 */

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND,
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
} from "./otunit-revision-lifecycle-show-command-boundary";

import type {
  OTUnitRevisionLifecycleShowCommandBoundaryResult,
} from "./otunit-revision-lifecycle-show-command-boundary";

export const OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND =
  "otunit_revision_lifecycle_show_command_adapter" as const;

export const OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME =
  "terminal:otunit:revision:lifecycle:show" as const;

export interface OTUnitRevisionLifecycleShowCommandAdapterResult {
  id: string;
  kind: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND;
  adapterName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME;
  commandName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME;
  boundaryResultId: string;
  readModelId: string;
  snapshotId: string;
  stdout: string;
  stderr: "";
  exitCode: 0;
  outputKind: "plain_text";
  lineCount: number;
  byteLength: number;
  terminalAdapterContractOnly: true;
  terminalAdapterIntegrated: false;
  cliCommandRegistered: false;
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
export interface ProjectOTUnitRevisionLifecycleShowCommandAdapterInput {
  id: string;
  boundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult;
  createdAt?: string;
}

function containsTerminalEscapeControl(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);

    if (code === 27 || code === 155) {
      return true;
    }
  }

  return false;
}

function assertPlainText(label: string, value: string): void {
  if (containsTerminalEscapeControl(value)) {
    throw new Error(`Revision lifecycle show command adapter requires plain text: ${label}.`);
  }
}

function assertBoundaryResultIsAdapterReady(
  boundaryResult: OTUnitRevisionLifecycleShowCommandBoundaryResult,
): void {
  if (boundaryResult.kind !== OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND) {
    throw new Error("Revision lifecycle show command adapter requires command boundary kind.");
  }

  if (!boundaryResult.id) {
    throw new Error("Revision lifecycle show command adapter requires boundary result id.");
  }

  if (!boundaryResult.readModelId) {
    throw new Error("Revision lifecycle show command adapter requires read model id.");
  }

  if (!boundaryResult.snapshotId) {
    throw new Error("Revision lifecycle show command adapter requires snapshot id.");
  }

  if (boundaryResult.commandName !== OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME) {
    throw new Error("Revision lifecycle show command adapter requires revision lifecycle show command name.");
  }

  if (boundaryResult.outputKind !== "plain_text") {
    throw new Error("Revision lifecycle show command adapter requires plain_text output.");
  }

  if (boundaryResult.terminalShowReady !== true) {
    throw new Error("Revision lifecycle show command adapter requires terminalShowReady=true.");
  }

  if (boundaryResult.plainTextOnly !== true) {
    throw new Error("Revision lifecycle show command adapter requires plainTextOnly=true.");
  }

  if (boundaryResult.ansiColorAllowed !== false) {
    throw new Error("Revision lifecycle show command adapter requires ansiColorAllowed=false.");
  }

  if (boundaryResult.runtimeCommandBoundaryOnly !== true) {
    throw new Error("Revision lifecycle show command adapter requires runtimeCommandBoundaryOnly=true.");
  }

  if (boundaryResult.terminalAdapterIntegrated !== false) {
    throw new Error("Revision lifecycle show command adapter requires terminalAdapterIntegrated=false.");
  }

  if (boundaryResult.plainText.length === 0) {
    throw new Error("Revision lifecycle show command adapter requires non-empty plainText.");
  }

  if (boundaryResult.lines.length !== boundaryResult.lineCount) {
    throw new Error("Revision lifecycle show command adapter requires lines length to equal lineCount.");
  }

  if (boundaryResult.lines.join("\n") !== boundaryResult.plainText) {
    throw new Error("Revision lifecycle show command adapter requires plainText to equal joined lines.");
  }

  assertPlainText("title", boundaryResult.title);
  assertPlainText("summary", boundaryResult.summary);
  assertPlainText("plainText", boundaryResult.plainText);

  for (const line of boundaryResult.lines) {
    assertPlainText("line", line);
  }

  for (const section of boundaryResult.sections) {
    assertPlainText(`section title ${section.title}`, section.title);

    for (const line of section.lines) {
      assertPlainText(`section line ${section.title}`, line);
    }
  }
}

function computeUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function projectOTUnitRevisionLifecycleShowCommandAdapter(
  input: ProjectOTUnitRevisionLifecycleShowCommandAdapterInput,
): OTUnitRevisionLifecycleShowCommandAdapterResult {
  const { boundaryResult } = input;

  assertBoundaryResultIsAdapterReady(boundaryResult);

  return {
    id: input.id,
    kind: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_ADAPTER_KIND,
    adapterName: OTUNIT_REVISION_LIFECYCLE_SHOW_TERMINAL_ADAPTER_NAME,
    commandName: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
    boundaryResultId: boundaryResult.id,
    readModelId: boundaryResult.readModelId,
    snapshotId: boundaryResult.snapshotId,
    stdout: boundaryResult.plainText,
    stderr: "",
    exitCode: 0,
    outputKind: "plain_text",
    lineCount: boundaryResult.lineCount,
    byteLength: computeUtf8ByteLength(boundaryResult.plainText),
    terminalAdapterContractOnly: true,
    terminalAdapterIntegrated: false,
    cliCommandRegistered: false,
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
