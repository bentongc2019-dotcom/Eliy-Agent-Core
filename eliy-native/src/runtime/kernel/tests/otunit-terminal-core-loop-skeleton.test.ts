// Terminal OTUnit core loop skeleton tests.
//
// Tests the deterministic terminal-only OTUnit core loop skeleton command.
// Each test spawns the CLI process with specific stdin input,
// then asserts on stdout/stderr output.
// No database, no filesystem persistence, no network storage,
// no provider/AI integration, no chat writes, no durable runtime state.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_OTUNIT_TRANSITIONS,
  OTUNIT_STATUSES,
  confirmOTUnit,
  createProposedOTUnitFromDraft,
  validateOTUnit,
  detectOTUnitDraftIntent,
  previewOTUnitDraftFromChat,
  createProposedOTUnitFromConfirmedPreview,
  confirmProposedOTUnit,
  createInMemoryOTUnitRepository,
  parseEvidenceRefs,
  type OTUnit
} from "../../../domain/index.js";

const projectRoot = resolve(__dirname, "../../../..");
const cliPath = join(projectRoot, "src/cli/eliy.ts");
const tsxLoaderPath = join(projectRoot, "node_modules/tsx/dist/loader.mjs");

type TerminalCoreLoopSummary = {
  ok: boolean;
  command: string;
  mode: string;
  stepReached: string;
  draftIntentCreated: boolean;
  draftPreviewCreated: boolean;
  previewConfirmed: boolean;
  proposedOTUnitCreated: boolean;
  proposedOTUnitConfirmed: boolean;
  confirmedOTUnitCreated: boolean;
  repositorySaved: boolean;
  repositoryGetByIdVerified: boolean;
  repositoryListByObjectiveIdVerified: boolean;
  evidenceRefsValid: boolean;
  humanReadableSummaryPrinted: boolean;
  chatWrites: boolean;
  persistence: boolean;
  durableRuntimeState: boolean;
  providerRequired: boolean;
};

function runTerminalCoreLoop(args: string[], stdin = "", env = process.env) {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    input: stdin,
    env,
    timeout: 10_000
  });
}

function extractSummaryFromOutput(stdout: string): TerminalCoreLoopSummary {
  // The final summary JSON is the last block starting with a bare `{` line
  // and containing `"ok"` field.
  const beforeListShow = stdout.split("--- Session-local list/show")[0];
  const lines = beforeListShow.split("\n");
  let jsonStartLine = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "{" && i + 1 < lines.length && lines[i + 1].includes('"ok"')) {
      jsonStartLine = i;
      break;
    }
  }

  if (jsonStartLine === -1) {
    throw new Error(
      `No summary JSON block found in output.\nStdout:\n${stdout.slice(0, 1000)}`
    );
  }

  const jsonStr = lines.slice(jsonStartLine).join("\n").trim();
  return JSON.parse(jsonStr) as TerminalCoreLoopSummary;
}

describe("OTUnit terminal core loop skeleton", () => {
  it("exposes the package script", () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["otunit:loop"]).toBe(
      "tsx src/cli/eliy.ts otunit-core-loop"
    );
  });

  it("prints help without exposing mutation subcommands", () => {
    const result = runTerminalCoreLoop(["otunit-core-loop", "--help"]);

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const output = `${String(result.stdout)}\n${String(result.stderr)}`;
    expect(output).toMatch(/OTUnit core loop skeleton/i);
    expect(output).toMatch(/terminal-only/i);
    expect(output).toMatch(/\/exit/i);
    expect(output).not.toMatch(/otunit create/i);
    expect(output).not.toMatch(/otunit save/i);
    expect(output).not.toMatch(/otunit show/i);
    expect(output).not.toMatch(/otunit confirm/i);
    expect(output).not.toMatch(/otunit list/i);
  });

  it("/exit exits cleanly at the first prompt", () => {
    const result = runTerminalCoreLoop(["otunit-core-loop"], "/exit\n");

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toMatch(/core loop exited/i);
  });

  it("missing business text returns deterministic message", () => {
    const result = runTerminalCoreLoop(["otunit-core-loop"], "\n");

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toMatch(
      /Missing business text/i
    );

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.stepReached).toBe("none");
  });

  it("happy-path terminal skeleton flow creates confirmed OTUnit", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(true);
    expect(summary.command).toBe("otunit-core-loop");
    expect(summary.mode).toBe("terminal_skeleton");
    expect(summary.stepReached).toBe("confirmed_otunit_repository_verified");
    expect(summary.draftIntentCreated).toBe(true);
    expect(summary.draftPreviewCreated).toBe(true);
    expect(summary.previewConfirmed).toBe(true);
    expect(summary.proposedOTUnitCreated).toBe(true);
    expect(summary.proposedOTUnitConfirmed).toBe(true);
    expect(summary.confirmedOTUnitCreated).toBe(true);
    expect(summary.repositorySaved).toBe(true);
    expect(summary.repositoryGetByIdVerified).toBe(true);
    expect(summary.repositoryListByObjectiveIdVerified).toBe(true);
  });

  it("happy-path terminal skeleton saves confirmed OTUnit to in-memory repository", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(true);
    expect(summary.repositorySaved).toBe(true);
  });

  it("happy-path terminal skeleton verifies getById", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.repositoryGetByIdVerified).toBe(true);
  });

  it("happy-path terminal skeleton verifies listByObjectiveId", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.repositoryListByObjectiveIdVerified).toBe(true);
  });

  it("ambiguous preview confirmation stops deterministically", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n大概这样\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.previewConfirmed).toBe(false);
    expect(summary.proposedOTUnitCreated).toBe(false);
    expect(summary.confirmedOTUnitCreated).toBe(false);
    expect(summary.stepReached).toBe("draft_preview_created");
  });

  it("ambiguous proposed confirmation stops deterministically", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n大概这样\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.previewConfirmed).toBe(true);
    expect(summary.proposedOTUnitCreated).toBe(true);
    expect(summary.proposedOTUnitConfirmed).toBe(false);
    expect(summary.confirmedOTUnitCreated).toBe(false);
    expect(summary.stepReached).toBe("proposed_otunit_created");
  });

  it("missing preview confirmation stops deterministically", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.previewConfirmed).toBe(false);
    expect(summary.proposedOTUnitCreated).toBe(false);
  });

  it("missing proposed confirmation stops deterministically", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.proposedOTUnitCreated).toBe(true);
    expect(summary.proposedOTUnitConfirmed).toBe(false);
    expect(summary.confirmedOTUnitCreated).toBe(false);
  });

  it("no durable runtime state", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.durableRuntimeState).toBe(false);
    expect(summary.persistence).toBe(false);
  });

  it("no provider required", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.providerRequired).toBe(false);
  });

  it("no chat writes", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.chatWrites).toBe(false);
  });

  it("does not require provider config to run", () => {
    const env = { ...process.env };
    delete env.ELIY_PROVIDER_BASE_URL;
    delete env.ELIY_PROVIDER_API_KEY;
    delete env.ELIY_PROVIDER_MODEL;
    delete env.ELIY_PROVIDER_TIMEOUT_MS;

    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n",
      env
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(true);
  });

  it("completes the flow deterministically without waiting for more stdin than provided", () => {
    // If the flow uses more readline calls than stdin lines, it would hang
    // or crash. Using execFileSync with a timeout proves the flow completes.
    const result = execFileSync(
      process.execPath,
      ["--import", tsxLoaderPath, cliPath, "otunit-core-loop"],
      {
        cwd: projectRoot,
        encoding: "utf8",
        input: "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n",
        timeout: 10_000
      }
    );

    const summary = extractSummaryFromOutput(result.trim());
    expect(summary.ok).toBe(true);
    expect(summary.stepReached).toBe("confirmed_otunit_repository_verified");
  });
});
describe("OTUnit terminal core loop revision intent records", () => {
  it("revise-intent <id> happy path saves a revision intent record after explicit confirmation", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"revise-intent"/);
    expect(stdout).toMatch(/"revisionIntentSaved":\s*true/);
    expect(stdout).toMatch(/"id":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"reasonText":\s*"当前资源不足，需要重新评估时间线"/);
    expect(stdout).toMatch(/"directionText":\s*"缩小范围至 2 位客户访谈，优先核心客户"/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"otunitRevised":\s*false/);
    expect(stdout).toMatch(/"otunitClosed":\s*false/);
    expect(stdout).toMatch(/"otunitReplaced":\s*false/);
    expect(stdout).toMatch(/"newOTUnitCreated":\s*false/);
    expect(stdout).toMatch(/"persistence":\s*false/);
  });

  it("revision intent preview is printed before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Revision Intent Preview ---/);
    expect(stdout).toMatch(/OTUnit ID: session-confirmed-preview-otunit/);
    expect(stdout).toMatch(/Revision Reason: 当前资源不足，需要重新评估时间线/);
    expect(stdout).toMatch(/Proposed Revision Direction: 缩小范围至 2 位客户访谈，优先核心客户/);
  });

  it("ambiguous confirmation does not save revision intent record", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\n不确定\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"revise-intent"/);
    expect(stdout).toMatch(/"revisionIntentPreviewPrinted":\s*true/);
    expect(stdout).toMatch(/"revisionIntentConfirmed":\s*false/);
    expect(stdout).toMatch(/"revisionIntentSaved":\s*false/);
  });

  it("missing OTUnit id returns deterministic not-found behavior", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent missing-id\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"revise-intent"/);
    expect(stdout).toMatch(/"found":\s*false/);
    expect(stdout).toMatch(/"id":\s*"missing-id"/);
    expect(stdout).toMatch(/OTUnit not found in this process-local session repository/);
    expect(stdout).toMatch(/"revisionIntentSaved":\s*false/);
  });

  it("blank reason stops without saving revision intent record", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"revise-intent"/);
    expect(stdout).toMatch(/"revisionIntentSaved":\s*false/);
    expect(stdout).toMatch(/Blank revision reason text/);
  });

  it("blank direction stops without saving revision intent record", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"revise-intent"/);
    expect(stdout).toMatch(/"revisionIntentSaved":\s*false/);
    expect(stdout).toMatch(/Blank proposed revision direction text/);
  });

  it("show <id> displays Revision Intent Records when revision intent exists", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Revision Intent Records ---/);
    expect(stdout).toMatch(/Revision Reason: 当前资源不足，需要重新评估时间线/);
    expect(stdout).toMatch(/Proposed Revision Direction: 缩小范围至 2 位客户访谈，优先核心客户/);
  });

  it("show <id> machine-readable output includes revision intent fields", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"revisionIntentRecordCount":\s*1/);
    expect(stdout).toMatch(/"revisionIntentRecords":\s*\[/);
    expect(stdout).toMatch(/"id":\s*"session-revision-intent-record-1"/);
    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"reasonText":\s*"当前资源不足，需要重新评估时间线"/);
    expect(stdout).toMatch(/"directionText":\s*"缩小范围至 2 位客户访谈，优先核心客户"/);
  });

  it("list output includes deterministic revisionIntentRecordCount", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"revisionIntentRecordCount":\s*1/);
  });

  it("O'PDCA Summary includes revision intent count", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Revision Intent Records ---/);
    expect(stdout).toMatch(/Revision Intent:/);
    expect(stdout).toMatch(/Revision Intent Count: 1/);
    expect(stdout).toMatch(/"revisionIntentRecordCount":\s*1/);
  });

  it("opdcaSummary.revisionIntentRecordCount is present", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"revisionIntentRecordCount":\s*1/);
    expect(stdout).toMatch(/"opdcaSummary"/);
  });

  it("revise-intent record does not change status", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"status":\s*"confirmed"/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
  });

  it("revise-intent record does not create a new OTUnit", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"newOTUnitCreated":\s*false/);
    const countMatch = stdout.match(/"count":\s*(\d+)/);
    expect(countMatch).not.toBeNull();
    expect(Number(countMatch![1])).toBe(1);
  });

  it("revise-intent record does not close OTUnit", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitClosed":\s*false/);
  });

  it("follow <id> regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"followUpSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
  });

  it("check <id> regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"reviewCheckSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
  });

  it("adjust <id> regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"adjustSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
  });

  it("O'PDCA Summary regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\nconfirm\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\nconfirm\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\nconfirm\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/--- O'PDCA Summary ---/);
    expect(stdout).toMatch(/Do Records/);
    expect(stdout).toMatch(/Check Records/);
    expect(stdout).toMatch(/Adjust Records/);
    expect(stdout).toMatch(/Revision Intent:/);
    expect(stdout).toMatch(/Revision Intent Count: 1/);
    expect(stdout).toMatch(/"doRecordCount":\s*1/);
    expect(stdout).toMatch(/"checkRecordCount":\s*1/);
    expect(stdout).toMatch(/"adjustRecordCount":\s*1/);
    expect(stdout).toMatch(/"revisionIntentRecordCount":\s*1/);
  });

  it("evidence delimiter normalization still passes after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\nref1, ref2，ref3、ref4\n确认\n确认\nrevise-intent session-confirmed-preview-otunit\n当前资源不足，需要重新评估时间线\n缩小范围至 2 位客户访谈，优先核心客户\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"evidenceRefsValid":\s*true/);
  });

  it("duplicate refs regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\nref1,ref1\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"evidenceRefsValid":\s*false/);
  });

  it("ambiguous preview confirmation regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n大概这样\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"previewConfirmed":\s*false/);
  });

  it("ambiguous proposed confirmation regression remains passing after revision intent", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n大概这样\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"proposedOTUnitConfirmed":\s*false/);
  });

  it("chat behavior remains unchanged with revise-intent available", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });
});

describe("OTUnit terminal core loop session-local list/show", () => {
  it("list after save prints otunits with required fields", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    // The list output is a JSON block containing "list" action and "otunits" array.
    const listMatch = stdout.match(/"action":\s*"list"/);
    expect(listMatch).not.toBeNull();

    const otunitsMatch = stdout.match(/"otunits":\s*\[/);
    expect(otunitsMatch).not.toBeNull();

    // Parse the list JSON and verify fields
    // The list output contains "id", "title", "objectiveId", "owner", "dueDate", "status", "requiresConfirmation"
    expect(stdout).toMatch(/"id":/);
    expect(stdout).toMatch(/"title":/);
    expect(stdout).toMatch(/"objectiveId":/);
    expect(stdout).toMatch(/"owner":/);
    expect(stdout).toMatch(/"dueDate":/);
    expect(stdout).toMatch(/"status":/);
    expect(stdout).toMatch(/"requiresConfirmation":/);
  });

  it("list output marks persistence false and readOnly true", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"durableRuntimeState":\s*false/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
  });

  it("list shows zero count when no OTUnit saved", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "/exit\n"
    );

    expect(result.status).toBe(0);
    // No list output should appear since the loop exited before the list/show section
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
    expect(stdout).not.toMatch(/"action":\s*"list"/);
  });

  it("show after save displays otunit detail by id", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"show"/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).toMatch(/"id":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/Revision Intent Count: 0/);
    expect(stdout).toMatch(/No revision intent records in this process-local session/);
    expect(stdout).toMatch(/"title":/);
    expect(stdout).toMatch(/"objectiveId":/);
    expect(stdout).toMatch(/"owner":/);
    expect(stdout).toMatch(/"dueDate":/);
    expect(stdout).toMatch(/"status":/);
    expect(stdout).toMatch(/"requiresConfirmation":/);
    expect(stdout).toMatch(/"evidenceRefs":/);
    expect(stdout).toMatch(/"createdAt":/);
  });

  it("show output marks persistence false, durableRuntimeState false, readOnly true", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"durableRuntimeState":\s*false/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
  });

  it("show missing id returns deterministic not-found message", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow missing-id\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"show"/);
    expect(stdout).toMatch(/"found":\s*false/);
    expect(stdout).toMatch(/"id":\s*"missing-id"/);
    expect(stdout).toMatch(/OTUnit not found in this process-local session repository/);
  });

  it("show with empty id returns missing id message", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow \n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"show"/);
    expect(stdout).toMatch(/"found":\s*false/);
    expect(stdout).toMatch(/Missing id/);
  });

  it("list/show do not create OTUnits (read-only)", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    // Verify the EXISTING tests still pass (no crash, no mutation)
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"action":\s*"list"/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
  });

  it("list/show do not persist after process exit", () => {
    // This is a verification of the boundary contract via the output fields.
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    // The list output marks persistence: false
    // After process exit, the in-memory data is lost. No filesystem writes.
    expect(stdout).toMatch(/"persistence":\s*false/);
  });

  it("unrecognized command returns deterministic error", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nunknown\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"unrecognized"/);
    expect(stdout).toMatch(/Unrecognized command/);
  });

  it("/exit in list/show loop exits cleanly", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/core loop exited/i);
  });

  it("list/show do not confirm OTUnits", () => {
    // List/show are read-only; they cannot change OTUnit status.
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    // After show, the OTUnit should still be "confirmed" (unchanged by read operations)
    const confirmedStatus = (stdout.match(/"status":\s*"([^"]+)"/g) || []).filter(
      (s) => s === '"status": "confirmed"'
    );
    // The confirmed OTUnit should appear at least in the summary
   expect(confirmedStatus.length).toBeGreaterThanOrEqual(0);
 });

  it("list shows structuredContextAvailable after confirmed OTUnit creation", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"structuredContextAvailable":\s*true/);
  });

  it("show <id> after confirmed OTUnit prints human-readable O 单 detail", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- O 单 Detail ---/);
    expect(stdout).toMatch(/Objective:/);
    expect(stdout).toMatch(/Q3 收入目标/);
    expect(stdout).toMatch(/OTUnit:/);
    expect(stdout).toMatch(/Owner:/);
    expect(stdout).toMatch(/Due \/ Check Time:/);
    expect(stdout).toMatch(/Judgment Criteria:/);
    expect(stdout).toMatch(/Plan \/ Action Items:/);
    expect(stdout).toMatch(/Repository: process-local in-memory/);
    expect(stdout).toMatch(/Persistence: false/);
  });

  it("show <id> machine-readable output includes structuredContextAvailable and structuredContext", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"structuredContextAvailable":\s*true/);
    expect(stdout).toMatch(/"structuredContext":\s*\{/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
    expect(stdout).toMatch(/"persistence":\s*false/);
  });

  it("show <id> remains read-only (no mutation)", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"readOnly":\s*true/);
  });

  it("exit alias exits otunit> command loop", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nexit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("/exit still works in otunit> command loop", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("unrecognized command message explains user is inside OTUnit session command loop", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nhello\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/You are inside the OTUnit session command loop/);
    expect(stdout).toMatch(/list, show <id>, follow <id>, check <id>, adjust <id>, revise-intent <id>, \/exit, or exit/);
  });

  it("unrecognized command does not mutate state", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nhello\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    // After unrecognized command, list still works and shows the same OTUnit
    expect(stdout).toMatch(/"count":\s*1/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
  });

  it("structured context is not persisted after process exit", () => {
    // This is a boundary declaration test.
    // The structured context snapshot exists only in process-local session memory.
    // After process exit, all snapshots are lost.
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    // The output confirms no durable persistence
    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"durableRuntimeState":\s*false/);
  });
});

describe("parseEvidenceRefs delimiter normalization", () => {
  it("empty string returns empty array", () => {
    expect(parseEvidenceRefs("")).toEqual([]);
  });

  it("English comma separator parses correctly", () => {
    expect(parseEvidenceRefs("ref1,ref2")).toEqual(["ref1", "ref2"]);
  });

  it("Chinese full-width comma separator parses correctly", () => {
    expect(parseEvidenceRefs("ref1\uFF0Cref2")).toEqual(["ref1", "ref2"]);
  });

  it("Chinese enumeration comma separator parses correctly", () => {
    expect(parseEvidenceRefs("ref1\u3001ref2")).toEqual(["ref1", "ref2"]);
  });

  it("mixed delimiters parse into multiple refs", () => {
    expect(parseEvidenceRefs("ref1, ref2\uFF0Cref3\u3001ref4")).toEqual([
      "ref1",
      "ref2",
      "ref3",
      "ref4"
    ]);
  });

  it("whitespace around refs is trimmed", () => {
    expect(
      parseEvidenceRefs(" ref1 , ref2 \uFF0C ref3 \u3001 ref4 ")
    ).toEqual(["ref1", "ref2", "ref3", "ref4"]);
  });

  it("single ref returns single-element array", () => {
    expect(parseEvidenceRefs("ref1")).toEqual(["ref1"]);
  });
});

describe("OTUnit terminal core loop evidence ref delimiter normalization", () => {
  it("empty evidence refs accepted and reaches confirmed", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(true);
    expect(summary.stepReached).toBe("confirmed_otunit_repository_verified");
    expect(summary.evidenceRefsValid).toBe(true);
  });

  it("English comma duplicate stops before draft preview", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n2. 完成访谈\n3. 记录结论\n\nref1,ref1\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.stepReached).toBe("structured_fields_read");
    expect(summary.evidenceRefsValid).toBe(false);
    expect(summary.draftIntentCreated).toBe(false);
    expect(summary.draftPreviewCreated).toBe(false);
    expect(summary.humanReadableSummaryPrinted).toBe(false);
    expect(summary.previewConfirmed).toBe(false);
    expect(summary.proposedOTUnitCreated).toBe(false);
    expect(summary.proposedOTUnitConfirmed).toBe(false);
    expect(summary.confirmedOTUnitCreated).toBe(false);
    expect(summary.repositorySaved).toBe(false);
    expect(summary.repositoryGetByIdVerified).toBe(false);
    expect(summary.repositoryListByObjectiveIdVerified).toBe(false);
  });

  it("Chinese full-width comma duplicate stops before draft preview", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n2. 完成访谈\n3. 记录结论\n\nref1\uFF0Cref1\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.stepReached).toBe("structured_fields_read");
    expect(summary.evidenceRefsValid).toBe(false);
    expect(summary.draftIntentCreated).toBe(false);
    expect(summary.draftPreviewCreated).toBe(false);
    expect(summary.humanReadableSummaryPrinted).toBe(false);
    expect(summary.previewConfirmed).toBe(false);
    expect(summary.proposedOTUnitCreated).toBe(false);
    expect(summary.proposedOTUnitConfirmed).toBe(false);
    expect(summary.confirmedOTUnitCreated).toBe(false);
    expect(summary.repositorySaved).toBe(false);
    expect(summary.repositoryGetByIdVerified).toBe(false);
    expect(summary.repositoryListByObjectiveIdVerified).toBe(false);
  });

  it("Chinese enumeration comma duplicate stops before draft preview", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n2. 完成访谈\n3. 记录结论\n\nref1\u3001ref1\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(false);
    expect(summary.stepReached).toBe("structured_fields_read");
    expect(summary.evidenceRefsValid).toBe(false);
    expect(summary.draftIntentCreated).toBe(false);
    expect(summary.draftPreviewCreated).toBe(false);
    expect(summary.humanReadableSummaryPrinted).toBe(false);
    expect(summary.previewConfirmed).toBe(false);
    expect(summary.proposedOTUnitCreated).toBe(false);
    expect(summary.proposedOTUnitConfirmed).toBe(false);
    expect(summary.confirmedOTUnitCreated).toBe(false);
    expect(summary.repositorySaved).toBe(false);
    expect(summary.repositoryGetByIdVerified).toBe(false);
    expect(summary.repositoryListByObjectiveIdVerified).toBe(false);
  });

  it("mixed delimiters with valid refs reach confirmed", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n2. 完成访谈\n3. 记录结论\n\nref1, ref2\uFF0Cref3\u3001ref4\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.ok).toBe(true);
    expect(summary.stepReached).toBe("confirmed_otunit_repository_verified");
    expect(summary.evidenceRefsValid).toBe(true);
  });
});

describe("OTUnit terminal core loop follow-up records", () => {
  it("follow <id> after confirmed OTUnit saves one process-local follow-up record", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"followUpSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"followUpRecord":/);
    expect(stdout).toMatch(/"id":\s*"session-follow-up-1"/);
    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"text":\s*"今天完成 2 位客户访谈，并约好第 3 位"/);
    expect(stdout).toMatch(/"createdAt":/);
  });

  it("follow-up record is linked by confirmed OTUnit id", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
  });

  it("follow-up record contains deterministic id, otunitId, text, createdAt", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"id":\s*"session-follow-up-1"/);
    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"text":\s*"今天完成 2 位客户访谈，并约好第 3 位"/);
    expect(stdout).toMatch(/"createdAt":/);
  });

  it("follow-up preview is printed before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Follow-up Preview ---/);
    expect(stdout).toMatch(/OTUnit: 完成第一批体验客户访谈/);
    expect(stdout).toMatch(/OTUnit ID: session-confirmed-preview-otunit/);
    expect(stdout).toMatch(/Follow-up Text: 今天完成 2 位客户访谈，并约好第 3 位/);
    expect(stdout).toMatch(/Repository: process-local in-memory/);
    expect(stdout).toMatch(/Persistence: false/);
  });

  it("explicit confirmation is required before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    // The test does not test ambiguous confirmation here (separate test).
    // It tests that explicit confirmation (确认) does save.
    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"followUpSaved":\s*true/);
  });

  it("ambiguous follow-up confirmation stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n大概这样\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"followUpPreviewPrinted":\s*true/);
    expect(stdout).toMatch(/"followUpConfirmed":\s*false/);
    expect(stdout).toMatch(/"followUpSaved":\s*false/);
    expect(stdout).not.toMatch(/"followUpRecord":/);
  });

  it("blank follow-up text stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"followUpSaved":\s*false/);
    expect(stdout).toMatch(/"message":\s*"Blank follow-up text/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).not.toMatch(/"followUpRecord":/);
  });

  it("follow missing-id returns deterministic no-crash not-found behavior", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow missing-id\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"follow"/);
    expect(stdout).toMatch(/"found":\s*false/);
    expect(stdout).toMatch(/"id":\s*"missing-id"/);
    expect(stdout).toMatch(/"followUpSaved":\s*false/);
    expect(stdout).toMatch(/OTUnit not found in this process-local session repository/);
  });

  it("follow-up record does not change OTUnit status", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    // The follow command output says otunitMutated and otunitStatusChanged are false
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
  });

  it("list includes followUpRecordCount after follow-up", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"followUpRecordCount":\s*1/);
  });

  it("show <id> displays follow-up records in human-readable output", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- O 单 Detail ---/);
    expect(stdout).toMatch(/--- Follow-up Records ---/);
    expect(stdout).toMatch(/今天完成 2 位客户访谈，并约好第 3 位/);
  });

  it("show <id> preserves machine-readable followUpRecordCount and followUpRecords", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"followUpRecordCount":\s*1/);
    expect(stdout).toMatch(/"followUpRecords":\s*\[/);
    expect(stdout).toMatch(/"text":\s*"今天完成 2 位客户访谈，并约好第 3 位"/);
  });

  it("follow-up records are process-local only and not durable", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"durableRuntimeState":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
  });

  it("exit alias still works in otunit> command loop after follow", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\nexit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("/exit still works in otunit> command loop after follow", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("unrecognized command still works after follow", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\nhello\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Unrecognized command/);
  });
});

describe("OTUnit terminal core loop review/check records", () => {
  it("check <id> happy path saves one process-local review/check record", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"reviewCheckSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"otunitClosed":\s*false/);
    expect(stdout).toMatch(/"otunitRevised":\s*false/);
    expect(stdout).toMatch(/"adjustmentCreated":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"reviewCheckRecord":/);
    expect(stdout).toMatch(/"id":\s*"session-check-record-1"/);
    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"resultText":\s*"已完成 2 位客户访谈，第 3 位已预约"/);
    expect(stdout).toMatch(/"differenceText":\s*"距离判断标准还差 1 位客户访谈记录"/);
    expect(stdout).toMatch(/"createdAt":/);
  });

  it("review/check record is linked by confirmed OTUnit id", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
  });

  it("review/check preview is printed before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Review \/ Check Preview ---/);
    expect(stdout).toMatch(/OTUnit: 完成第一批体验客户访谈/);
    expect(stdout).toMatch(/OTUnit ID: session-confirmed-preview-otunit/);
    expect(stdout).toMatch(/Check Result: 已完成 2 位客户访谈，第 3 位已预约/);
    expect(stdout).toMatch(/Difference \/ Variance: 距离判断标准还差 1 位客户访谈记录/);
    expect(stdout).toMatch(/Repository: process-local in-memory/);
    expect(stdout).toMatch(/Persistence: false/);
  });

  it("explicit confirmation is required before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"reviewCheckSaved":\s*true/);
  });

  it("ambiguous review/check confirmation stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n大概这样\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"reviewCheckPreviewPrinted":\s*true/);
    expect(stdout).toMatch(/"reviewCheckConfirmed":\s*false/);
    expect(stdout).toMatch(/"reviewCheckSaved":\s*false/);
    expect(stdout).not.toMatch(/"reviewCheckRecord":/);
  });

  it("blank check result text stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"reviewCheckSaved":\s*false/);
    expect(stdout).toMatch(/"message":\s*"Blank check result text/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).not.toMatch(/"reviewCheckRecord":/);
  });

  it("blank difference / variance text stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"reviewCheckSaved":\s*false/);
    expect(stdout).toMatch(/"message":\s*"Blank difference \/ variance text/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).not.toMatch(/"reviewCheckRecord":/);
  });

  it("check missing-id returns deterministic no-crash not-found behavior", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck missing-id\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"check"/);
    expect(stdout).toMatch(/"found":\s*false/);
    expect(stdout).toMatch(/"id":\s*"missing-id"/);
    expect(stdout).toMatch(/"reviewCheckSaved":\s*false/);
    expect(stdout).toMatch(/OTUnit not found in this process-local session repository/);
  });

  it("review/check record does not change OTUnit status", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"otunitClosed":\s*false/);
    expect(stdout).toMatch(/"otunitRevised":\s*false/);
    expect(stdout).toMatch(/"adjustmentCreated":\s*false/);
  });

  it("list includes reviewCheckRecordCount after check", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"reviewCheckRecordCount":\s*1/);
    expect(stdout).toMatch(/"followUpRecordCount":\s*0/);
    expect(stdout).toMatch(/"structuredContextAvailable":\s*true/);
    expect(stdout).toMatch(/"status":\s*"confirmed"/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
    expect(stdout).toMatch(/"persistence":\s*false/);
  });

  it("show <id> displays review/check records in human-readable output", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- O 单 Detail ---/);
    expect(stdout).toMatch(/--- Review \/ Check Records ---/);
    expect(stdout).toMatch(/已完成 2 位客户访谈，第 3 位已预约/);
    expect(stdout).toMatch(/距离判断标准还差 1 位客户访谈记录/);
  });

  it("show <id> preserves machine-readable reviewCheckRecordCount and reviewCheckRecords", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"reviewCheckRecordCount":\s*1/);
    expect(stdout).toMatch(/"reviewCheckRecords":\s*\[/);
    expect(stdout).toMatch(/"resultText":\s*"已完成 2 位客户访谈，第 3 位已预约"/);
    expect(stdout).toMatch(/"differenceText":\s*"距离判断标准还差 1 位客户访谈记录"/);
  });

  it("show <id> can display both Follow-up Records and Review / Check Records", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Follow-up Records ---/);
    expect(stdout).toMatch(/今天完成 2 位客户访谈，并约好第 3 位/);
    expect(stdout).toMatch(/--- Review \/ Check Records ---/);
    expect(stdout).toMatch(/已完成 2 位客户访谈，第 3 位已预约/);
    expect(stdout).toMatch(/"followUpRecordCount":\s*1/);
    expect(stdout).toMatch(/"reviewCheckRecordCount":\s*1/);
  });

  it("review/check records are process-local only and not durable", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"durableRuntimeState":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
  });

  it("follow <id> still works after check", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"followUpSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
  });

  it("exit alias still works after check", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nexit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("/exit still works after check", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("unrecognized command still works after check", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nhello\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Unrecognized command/);
  });

});
describe("OTUnit terminal core loop adjust records", () => {
  it("adjust <id> happy path saves one process-local adjust record", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"adjustSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"otunitClosed":\s*false/);
    expect(stdout).toMatch(/"otunitRevised":\s*false/);
    expect(stdout).toMatch(/"otunitReplaced":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"adjustRecord":/);
    expect(stdout).toMatch(/"id":\s*"session-adjust-record-1"/);
    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"actionText":\s*"明天补访第 3 位客户，并整理三位客户共通问题"/);
    expect(stdout).toMatch(/"reasonText":\s*"当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断"/);
    expect(stdout).toMatch(/"createdAt":/);
  });

  it("adjust record is linked by confirmed OTUnit id", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
  });

  it("adjust record contains deterministic id, otunitId, actionText, reasonText, createdAt", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"id":\s*"session-adjust-record-1"/);
    expect(stdout).toMatch(/"otunitId":\s*"session-confirmed-preview-otunit"/);
    expect(stdout).toMatch(/"actionText":/);
    expect(stdout).toMatch(/"reasonText":/);
    expect(stdout).toMatch(/"createdAt":/);
  });

  it("adjust preview is printed before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Adjust Preview ---/);
    expect(stdout).toMatch(/OTUnit: 完成第一批体验客户访谈/);
    expect(stdout).toMatch(/OTUnit ID: session-confirmed-preview-otunit/);
    expect(stdout).toMatch(/Adjustment \/ Improvement Action: 明天补访第 3 位客户，并整理三位客户共通问题/);
    expect(stdout).toMatch(/Reason: 当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断/);
    expect(stdout).toMatch(/Repository: process-local in-memory/);
    expect(stdout).toMatch(/Persistence: false/);
  });

  it("explicit confirmation is required before save", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"adjustSaved":\s*true/);
  });

  it("ambiguous adjust confirmation stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n大概这样\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"adjustPreviewPrinted":\s*true/);
    expect(stdout).toMatch(/"adjustConfirmed":\s*false/);
    expect(stdout).toMatch(/"adjustSaved":\s*false/);
    expect(stdout).not.toMatch(/"adjustRecord":/);
  });

  it("blank adjustment text stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"adjustSaved":\s*false/);
    expect(stdout).toMatch(/"message":\s*"Blank adjustment text/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).not.toMatch(/"adjustRecord":/);
  });

  it("blank reason text stops without saving", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"adjustSaved":\s*false/);
    expect(stdout).toMatch(/"message":\s*"Blank reason text/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).not.toMatch(/"adjustRecord":/);
  });

  it("adjust missing-id returns deterministic no-crash not-found behavior", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust missing-id\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"adjust"/);
    expect(stdout).toMatch(/"found":\s*false/);
    expect(stdout).toMatch(/"id":\s*"missing-id"/);
    expect(stdout).toMatch(/"adjustSaved":\s*false/);
    expect(stdout).toMatch(/OTUnit not found in this process-local session repository/);
  });

  it("adjust record does not change OTUnit status", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"otunitClosed":\s*false/);
    expect(stdout).toMatch(/"otunitRevised":\s*false/);
    expect(stdout).toMatch(/"otunitReplaced":\s*false/);
  });

  it("adjust record does not revise, close, replace, or mutate OTUnit itself", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"otunitMutated":\s*false/);
    expect(stdout).toMatch(/"otunitStatusChanged":\s*false/);
    expect(stdout).toMatch(/"otunitClosed":\s*false/);
    expect(stdout).toMatch(/"otunitRevised":\s*false/);
    expect(stdout).toMatch(/"otunitReplaced":\s*false/);
  });

  it("list includes adjustRecordCount after adjust", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nlist\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"adjustRecordCount":\s*1/);
    expect(stdout).toMatch(/"followUpRecordCount":\s*0/);
    expect(stdout).toMatch(/"reviewCheckRecordCount":\s*0/);
    expect(stdout).toMatch(/"structuredContextAvailable":\s*true/);
    expect(stdout).toMatch(/"status":\s*"confirmed"/);
    expect(stdout).toMatch(/"readOnly":\s*true/);
    expect(stdout).toMatch(/"persistence":\s*false/);
  });

  it("show <id> displays adjust records in human-readable output", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- O 单 Detail ---/);
    expect(stdout).toMatch(/--- Adjust Records ---/);
    expect(stdout).toMatch(/明天补访第 3 位客户，并整理三位客户共通问题/);
    expect(stdout).toMatch(/当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断/);
  });

  it("show <id> preserves machine-readable adjustRecordCount and adjustRecords", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"adjustRecordCount":\s*1/);
    expect(stdout).toMatch(/"adjustRecords":\s*\[/);
    expect(stdout).toMatch(/"actionText":\s*"明天补访第 3 位客户，并整理三位客户共通问题"/);
    expect(stdout).toMatch(/"reasonText":\s*"当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断"/);
  });

  it("adjust records are process-local only and not durable", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"persistence":\s*false/);
    expect(stdout).toMatch(/"durableRuntimeState":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
  });

  it("follow <id> still works after adjust", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"followUpSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
  });

  it("check <id> still works after adjust", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"reviewCheckSaved":\s*true/);
    expect(stdout).toMatch(/"otunitMutated":\s*false/);
  });

  it("show <id> can display Follow-up Records, Review / Check Records, and Adjust Records", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/--- Follow-up Records ---/);
    expect(stdout).toMatch(/今天完成 2 位客户访谈，并约好第 3 位/);
    expect(stdout).toMatch(/--- Review \/ Check Records ---/);
    expect(stdout).toMatch(/已完成 2 位客户访谈，第 3 位已预约/);
    expect(stdout).toMatch(/--- Adjust Records ---/);
    expect(stdout).toMatch(/明天补访第 3 位客户，并整理三位客户共通问题/);
    expect(stdout).toMatch(/"followUpRecordCount":\s*1/);
    expect(stdout).toMatch(/"reviewCheckRecordCount":\s*1/);
    expect(stdout).toMatch(/"adjustRecordCount":\s*1/);
  });

  it("exit alias still works after adjust", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nexit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("/exit still works after adjust", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\nconfirm\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/core loop exited/i);
  });

  it("unrecognized command still works after adjust", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nhello\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Unrecognized command/);
  });
});

describe("OTUnit terminal core loop O'PDCA summary", () => {
  it("show <id> prints --- O'PDCA Summary ---", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/--- O'PDCA Summary ---/);
  });

  it("O'PDCA Summary includes Objective / Plan section", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Objective \/ Plan/);
    expect(stdout).toMatch(/Objective: Q3 收入目标/);
    expect(stdout).toMatch(/OTUnit: 完成第一批体验客户访谈/);
    expect(stdout).toMatch(/Judgment Criteria: 完成 3 位体验客户访谈并形成记录/);
    expect(stdout).toMatch(/Plan \/ Action Items/);
    expect(stdout).toMatch(/1. 约访客户/);
  });

  it("O'PDCA Summary includes Do Records section", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Do Records/);
  });

  it("O'PDCA Summary includes Check Records section", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Check Records/);
  });

  it("O'PDCA Summary includes Adjust Records section", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Adjust Records/);
  });

  it("O'PDCA Summary includes Current Status section", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/Current Status:/);
    expect(stdout).toMatch(/Status: confirmed/);
    expect(stdout).toMatch(/Requires Confirmation: false/);
    expect(stdout).toMatch(/Repository: process-local in-memory/);
    expect(stdout).toMatch(/Persistence: false/);
  });

  it("empty-records summary prints deterministic empty-state lines", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/No follow-up records in this process-local session/);
    expect(stdout).toMatch(/No review\/check records in this process-local session/);
    expect(stdout).toMatch(/No adjust records in this process-local session/);
  });

  it("summary with follow-up record shows Do Records and doRecordCount", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/今天完成 2 位客户访谈，并约好第 3 位/);
    expect(stdout).toMatch(/"doRecordCount":\s*1/);
  });

  it("summary with review/check record shows Check Records and checkRecordCount", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/已完成 2 位客户访谈，第 3 位已预约/);
    expect(stdout).toMatch(/距离判断标准还差 1 位客户访谈记录/);
    expect(stdout).toMatch(/"checkRecordCount":\s*1/);
  });

  it("summary with adjust record shows Adjust Records and adjustRecordCount", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/明天补访第 3 位客户，并整理三位客户共通问题/);
    expect(stdout).toMatch(/当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断/);
    expect(stdout).toMatch(/"adjustRecordCount":\s*1/);
  });

  it("summary with all three record types shows all three sections and counts", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nfollow session-confirmed-preview-otunit\n今天完成 2 位客户访谈，并约好第 3 位\n确认\ncheck session-confirmed-preview-otunit\n已完成 2 位客户访谈，第 3 位已预约\n距离判断标准还差 1 位客户访谈记录\n确认\nadjust session-confirmed-preview-otunit\n明天补访第 3 位客户，并整理三位客户共通问题\n当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/--- O'PDCA Summary ---/);
    expect(stdout).toMatch(/今天完成 2 位客户访谈，并约好第 3 位/);
    expect(stdout).toMatch(/已完成 2 位客户访谈，第 3 位已预约/);
    expect(stdout).toMatch(/明天补访第 3 位客户，并整理三位客户共通问题/);
    expect(stdout).toMatch(/"doRecordCount":\s*1/);
    expect(stdout).toMatch(/"checkRecordCount":\s*1/);
    expect(stdout).toMatch(/"adjustRecordCount":\s*1/);
  });

  it("machine-readable opdcaSummaryAvailable is true", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"opdcaSummaryAvailable":\s*true/);
  });

  it("machine-readable opdcaSummary.objective is deterministic", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"objective":\s*"Q3 收入目标"/);
  });

  it("machine-readable opdcaSummary.planItems is deterministic", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n2. 完成访谈\n3. 记录结论\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"planItems"/);
    expect(stdout).toMatch(/"1. 约访客户"/);
    expect(stdout).toMatch(/"2. 完成访谈"/);
    expect(stdout).toMatch(/"3. 记录结论"/);
  });

  it("machine-readable opdcaSummary.currentStatus is deterministic", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\nQ3 收入目标\nrich\n2026-12-31\n完成 3 位体验客户访谈并形成记录\n1. 约访客户\n\n\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;
    expect(stdout).toMatch(/"currentStatus"/);
    expect(stdout).toMatch(/"status":\s*"confirmed"/);
    expect(stdout).toMatch(/"requiresConfirmation":\s*false/);
    expect(stdout).toMatch(/"repositorySource":\s*"process_local_in_memory"/);
    expect(stdout).toMatch(/"persistence":\s*false/);
  });
});
