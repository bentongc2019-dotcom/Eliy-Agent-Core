/**
 * OTUnit Revision Lifecycle Show Command Boundary
 *
 * Pure command boundary / formatter boundary that turns a terminal-show-ready
 * OTUnit revision dogfood snapshot read model into deterministic plain-text
 * show output for future terminal dogfood use.
 *
 * No CLI registration, no CLI file changes, no filesystem persistence,
 * no database persistence, no provider / real LLM integration,
 * no environment variable read, no environment file read, no ANSI color, no runtime behavior change,
 * and no source OTUnit mutation or replacement.
 *
 * PR #63 — Command boundary / formatter boundary only.
 *
 * Stage: C / Runtime Command – Terminal Dogfood
 * Strict boundary: command boundary / formatter boundary only.
 */

import type {
  OTUnitRevisionDogfoodSnapshotReadModel,
} from "./otunit-revision-dogfood-snapshot-read-model";

// ── Kind & Name ──────────────────────────────────────────────────────────────

export const OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND =
  "otunit_revision_lifecycle_show_command_boundary" as const;

export const OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME =
  "otunit:revision:lifecycle:show" as const;

// ── Output Types ─────────────────────────────────────────────────────────────

export interface OTUnitRevisionLifecycleShowCommandBoundarySection {
  title: string;
  lines: readonly string[];
}

export interface OTUnitRevisionLifecycleShowCommandBoundaryResult {
  id: string;
  kind: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND;
  commandName: typeof OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME;
  readModelId: string;
  snapshotId: string;
  outputKind: "plain_text";
  title: "OTUnit Revision Lifecycle";
  summary: string;
  sections: readonly OTUnitRevisionLifecycleShowCommandBoundarySection[];
  lines: readonly string[];
  plainText: string;
  lineCount: number;
  runtimeCommandBoundaryOnly: true;
  terminalAdapterIntegrated: false;
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

// ── Input Types ──────────────────────────────────────────────────────────────

export interface ProjectOTUnitRevisionLifecycleShowCommandBoundaryInput {
  id: string;
  readModel: OTUnitRevisionDogfoodSnapshotReadModel;
  createdAt?: string;
}

// ── Validation Helpers ───────────────────────────────────────────────────────

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
    throw new Error(`Revision lifecycle show command boundary requires plain text: ${label}.`);
  }
}

// ── Read Model Validation ────────────────────────────────────────────────────

function assertReadModelIsShowReady(
  readModel: OTUnitRevisionDogfoodSnapshotReadModel,
): void {
  if (!readModel.id) {
    throw new Error("Revision lifecycle show command boundary requires read model id.");
  }

  if (!readModel.snapshotId) {
    throw new Error("Revision lifecycle show command boundary requires snapshot id.");
  }

  if (readModel.terminalShowReady !== true) {
    throw new Error("Revision lifecycle show command boundary requires terminalShowReady=true.");
  }

  if (readModel.plainTextOnly !== true) {
    throw new Error("Revision lifecycle show command boundary requires plainTextOnly=true.");
  }

  if (readModel.ansiColorAllowed !== false) {
    throw new Error("Revision lifecycle show command boundary requires ansiColorAllowed=false.");
  }

  if (readModel.appendCount !== readModel.recordCount) {
    throw new Error("Revision lifecycle show command boundary requires appendCount to equal recordCount.");
  }

  if (readModel.recordSteps.length !== readModel.recordCount) {
    throw new Error("Revision lifecycle show command boundary requires recordSteps length to equal recordCount.");
  }

  if (readModel.sections.length === 0) {
    throw new Error("Revision lifecycle show command boundary requires at least one section.");
  }

  assertPlainText("title", readModel.title);
  assertPlainText("summary", readModel.summary);
  assertPlainText("sourceOTUnitId", readModel.sourceOTUnitId);
  assertPlainText("revisionIntentRecordId", readModel.revisionIntentRecordId);

  for (const step of readModel.recordSteps) {
    assertPlainText(`record step ${step.index} label`, step.label);
    assertPlainText(`record step ${step.index} kind`, step.kind);
  }

  for (const section of readModel.sections) {
    assertPlainText(`section title ${section.title}`, section.title);

    for (const line of section.lines) {
      assertPlainText(`section line label ${line.label}`, line.label);
      assertPlainText(`section line value ${line.label}`, line.value);
    }
  }
}

// ── Projection Helpers ───────────────────────────────────────────────────────

function projectSections(
  readModel: OTUnitRevisionDogfoodSnapshotReadModel,
): readonly OTUnitRevisionLifecycleShowCommandBoundarySection[] {
  const recordStepsSection: OTUnitRevisionLifecycleShowCommandBoundarySection = {
    title: "Record Steps",
    lines: readModel.recordSteps.map((step) => step.label),
  };

  const readModelSections = readModel.sections.map((section) => ({
    title: section.title,
    lines: section.lines.map((line) => `${line.label}: ${line.value}`),
  }));

  return [recordStepsSection, ...readModelSections];
}

function flattenShowLines(input: {
  readModel: OTUnitRevisionDogfoodSnapshotReadModel;
  sections: readonly OTUnitRevisionLifecycleShowCommandBoundarySection[];
}): readonly string[] {
  const lines: string[] = [
    "OTUnit Revision Lifecycle",
    `Read Model: ${input.readModel.id}`,
    `Snapshot: ${input.readModel.snapshotId}`,
    `Summary: ${input.readModel.summary}`,
    "",
  ];

  for (const section of input.sections) {
    lines.push(section.title);

    for (const line of section.lines) {
      lines.push(`- ${line}`);
    }

    lines.push("");
  }

  return lines.slice(0, lines.length - 1);
}

// ── Main Projection Function ─────────────────────────────────────────────────

export function projectOTUnitRevisionLifecycleShowCommandBoundary(
  input: ProjectOTUnitRevisionLifecycleShowCommandBoundaryInput,
): OTUnitRevisionLifecycleShowCommandBoundaryResult {
  const { readModel } = input;

  assertReadModelIsShowReady(readModel);

  const sections = projectSections(readModel);
  const lines = flattenShowLines({ readModel, sections });
  const plainText = lines.join("\n");

  assertPlainText("plainText", plainText);

  return {
    id: input.id,
    kind: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_BOUNDARY_KIND,
    commandName: OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_NAME,
    readModelId: readModel.id,
    snapshotId: readModel.snapshotId,
    outputKind: "plain_text",
    title: "OTUnit Revision Lifecycle",
    summary: readModel.summary,
    sections,
    lines,
    plainText,
    lineCount: lines.length,
    runtimeCommandBoundaryOnly: true,
    terminalAdapterIntegrated: false,
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
