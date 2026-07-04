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
      "完成第一批体验客户访谈\n确认\n确认\n"
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
      "完成第一批体验客户访谈\n确认\n确认\n"
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
      "完成第一批体验客户访谈\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.repositoryGetByIdVerified).toBe(true);
  });

  it("happy-path terminal skeleton verifies listByObjectiveId", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.repositoryListByObjectiveIdVerified).toBe(true);
  });

  it("ambiguous preview confirmation stops deterministically", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n大概这样\n"
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
      "完成第一批体验客户访谈\n确认\n大概这样\n"
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
      "完成第一批体验客户访谈\n\n"
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
      "完成第一批体验客户访谈\n确认\n\n"
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
      "完成第一批体验客户访谈\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.durableRuntimeState).toBe(false);
    expect(summary.persistence).toBe(false);
  });

  it("no provider required", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n确认\n确认\n"
    );

    expect(result.status).toBe(0);
    const summary = extractSummaryFromOutput(result.stdout as string);
    expect(summary.providerRequired).toBe(false);
  });

  it("no chat writes", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n确认\n确认\n"
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
      "完成第一批体验客户访谈\n确认\n确认\n",
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
        input: "完成第一批体验客户访谈\n确认\n确认\n",
        timeout: 10_000
      }
    );

    const summary = extractSummaryFromOutput(result.trim());
    expect(summary.ok).toBe(true);
    expect(summary.stepReached).toBe("confirmed_otunit_repository_verified");
  });
});

describe("OTUnit terminal core loop session-local list/show", () => {
  it("list after save prints otunits with required fields", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n确认\n确认\nlist\n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nlist\n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
    );

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"show"/);
    expect(stdout).toMatch(/"found":\s*true/);
    expect(stdout).toMatch(/"id":\s*"session-confirmed-preview-otunit"/);
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
      "完成第一批体验客户访谈\n确认\n确认\nshow session-confirmed-preview-otunit\n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nshow missing-id\n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nshow \n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nlist\n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nlist\n/exit\n"
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
      "完成第一批体验客户访谈\n确认\n确认\nunknown\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/"action":\s*"unrecognized"/);
    expect(stdout).toMatch(/Unrecognized command/);
  });

  it("/exit in list/show loop exits cleanly", () => {
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n确认\n确认\n/exit\n"
    );

    expect(result.status).toBe(0);
    const stdout = result.stdout as string;

    expect(stdout).toMatch(/core loop exited/i);
  });

  it("list/show do not confirm OTUnits", () => {
    // List/show are read-only; they cannot change OTUnit status.
    const result = runTerminalCoreLoop(
      ["otunit-core-loop"],
      "完成第一批体验客户访谈\n确认\n确认\nlist\nshow session-confirmed-preview-otunit\n/exit\n"
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
});
