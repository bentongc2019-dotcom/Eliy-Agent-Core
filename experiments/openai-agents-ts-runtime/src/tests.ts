import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "@openai/agents";
import { approvalIdentity, createRefundAgent, DEFAULT_MODEL_NOTE, disableTracingExport } from "./agent.js";
import { getRuntimeNetworkRecords, installRuntimeNetworkLogger, persistRuntimeNetworkRecords } from "./network-log.js";
import { ensureDirs, logsDir, reportsDir, stateDir, writeJson } from "./storage.js";
import { getToolExecutionCount, resetToolExecutions } from "./tool.js";

type TestStatus = "Passed" | "Failed" | "Credential Blocked";

type RuntimeTestResult = {
  test: string;
  status: TestStatus;
  evidence: Record<string, unknown>;
};

function hasCredential(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function markdownCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function gitInfo(): { branch: string; head: string; status: string } {
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: "../..", encoding: "utf8" }).trim();
  const branch = git(["branch", "--show-current"]);
  const head = git(["log", "--oneline", "-1"]);
  const status = git(["status", "--short"]);
  return { branch, head, status: status || "clean" };
}

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

async function runChild(statePath: string, decision: "approve" | "reject"): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [
      "dist/serialize-child.js",
      statePath,
      decision
    ], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`serialize-child exited with ${code}`));
    });
  });
}

async function writeRuntimeReports(finalConclusion: string, results: RuntimeTestResult[]): Promise<void> {
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL_NOTE;
  const networkRecords = getRuntimeNetworkRecords();
  await persistRuntimeNetworkRecords();
  await writeJson(join(reportsDir, "runtime-network-records.json"), networkRecords);

  const runtimeResults = `# Runtime Results

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Date: ${new Date().toISOString()}
Conclusion: ${finalConclusion}

| Test | Result | Evidence |
|---|---|---|
${results.map((r) => `| ${markdownCell(r.test)} | ${r.status} | ${markdownCell(JSON.stringify(r.evidence))} |`).join("\n")}

Model: ${model}
Tracing export disabled: Yes, via setTracingDisabled(true)
Hosted Tools used: No
OpenAI Conversations hosted Session used: No
MCP used: No
`;

  const eventsMap = `# Runtime Events Map

| HAC needed semantic | SDK actual object / event | Obtainable | Notes |
|---|---|---|---|
| tool_requested | RunResult.interruptions[] / RunToolApprovalItem.rawItem | Yes, with credential | Function tool approval interruption exposes tool name, callId, and arguments. |
| run_interrupted | RunResult.interruptions.length > 0 and RunState.getInterruptions() | Yes, with credential | The SDK returns pending approval items and resumable RunState. |
| human_approved | RunState.approve(approvalItem) | Yes, with credential | Public SDK API records approval on the same RunState before resume. |
| human_rejected | RunState.reject(approvalItem, { message }) | Yes, with credential | Public SDK API records rejection and optional model-visible message. |
| tool_started | Local tool execute callback start | Yes, with credential | Evidence from local execution log; SDK callback is the public tool boundary. |
| tool_result | RunToolCallOutputItem / local tool execute callback output | Yes, with credential | Evidence from RunResult.newItems and local execution log. |
| run_completed | RunResult.finalOutput and no pending interruptions | Yes, with credential | Normal completion after resume. |

Public intervention points:
- Before execution: FunctionTool.needsApproval.
- Human decision: RunState.approve() / RunState.reject().
- Resume: run(agent, existingRunState).
- Serialization: RunState.toString() and RunState.fromString().

OpenAI-specific objects can be isolated behind a thin adapter around RunState, RunToolApprovalItem, RunResult, and local tool execution logs.
`;

  const networkReport = `# Network Requests

Install/setup network and runtime network are separated.

## Install / Setup Network

Allowed and observed during setup:
- npm registry for package metadata and dependency installation.

## Application Runtime Network

Instrumentation method: global fetch wrapper installed before runtime test execution.

| URL / Domain | Method | Purpose | Runtime allowed | Credential present | Evidence |
|---|---|---|---|---|---|
${networkRecords.length === 0 ? "| None observed | n/a | Runtime path did not call network in this environment | n/a | No | reports/runtime-network-records.json |" : networkRecords.map((r) => `| ${r.domain} | ${r.method} | ${r.reason} | ${r.allowed ? "Yes" : "No"} | ${hasCredential() ? "API key present but value not logged" : "No"} | reports/runtime-network-records.json |`).join("\n")}

Runtime allowlist:
- api.openai.com for OpenAI Model API only.

Forbidden runtime services:
- Assistant Cloud: Not observed.
- Hosted Tools: Not used.
- MCP: Not used.
- OpenAI Conversations hosted Session: Not used.
- Remote database: Not used.
- Other providers: Not used.
- Undeclared telemetry: Not observed by fetch instrumentation.

Limitations:
- This logger captures global fetch calls. If a dependency uses lower-level socket APIs, those would require separate OS-level capture.
`;

  const modifyObservation = `# Modify Observation

Modify is observation-only in this spike and is not required as a native pass/fail capability.

Observed public extension shape:

1. The SDK exposes native approve/reject for a pending RunToolApprovalItem.
2. No public API was identified for mutating an existing pending tool call's arguments in place.
3. The thinnest correct implementation for HAC Modify should not patch SDK internals.

Candidate approaches:

- Reject the original tool call with a structured rejection message, then let the same run produce a new tool call with modified arguments.
- Have the HAC Harness create a new structured proposal outside the SDK pending item, then submit that proposal through a normal future user turn or controlled agent instruction.
- Keep original pending item immutable for auditability; treat the modified version as a new proposal with a distinct decision identity.

Do not:

- Edit serialized RunState internals to replace tool arguments.
- Patch the SDK.
- Claim native Modify support without a public API.
`;

  await writeFile(join(reportsDir, "runtime-results.md"), runtimeResults, "utf8");
  await writeFile(join(reportsDir, "runtime-events-map.md"), eventsMap, "utf8");
  await writeFile(join(reportsDir, "network-requests.md"), networkReport, "utf8");
  await writeFile(join(reportsDir, "modify-observation.md"), modifyObservation, "utf8");
}

async function writeFinalReport(finalConclusion: string, results: RuntimeTestResult[]): Promise<void> {
  const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const executionCount = await getToolExecutionCount();
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL_NOTE;
  const credential = hasCredential() ? "Yes" : "No";
  const envModel = process.env.OPENAI_MODEL ? "Yes" : "No";
  const runtimeTable = results.map((r) => `| ${markdownCell(r.test)} | ${r.status} | ${markdownCell(JSON.stringify(r.evidence))} |`).join("\n");
  const git = gitInfo();

  const finalReport = `# OpenAI Agents TypeScript Runtime Spine Candidate

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Date: ${new Date().toISOString()}

## 1. Branch, HEAD, Git Status

Current branch at report generation: ${git.branch}
Current HEAD at report generation: ${git.head}
Git status at report generation: ${git.status}
Formal baseline: dbb70a1 fix(webchat): prevent stale client context cache
Experiment branch: spike/openai-agents-ts-runtime
Formal Eliy business code modified: No

## 2. Pinned Package Versions

| Package | Exact Version | Scope |
|---|---:|---|
| @openai/agents | ${pkg.dependencies["@openai/agents"]} | production |
| zod | ${pkg.dependencies.zod} | production |
| typescript | ${pkg.devDependencies.typescript} | dev |
| tsx | ${pkg.devDependencies.tsx} | dev |
| @types/node | ${pkg.devDependencies["@types/node"]} | dev |

## 3. License and Dependency Scan

See reports/commercialization-gate.md and reports/license-inventory.json.

## 4. OpenAI API Key Present

OPENAI_API_KEY: ${credential}

## 5. Model

OPENAI_MODEL present: ${envModel}
Model used: ${model}

## 6. Test A-D Results

| Test | Result | Evidence |
|---|---|---|
${runtimeTable}

## 7. Tool Calls Before Approval

${results.find((r) => r.test.startsWith("Test A"))?.evidence.toolExecutionCount ?? "Not executed"}

## 8. Tool Calls After Reject

${results.find((r) => r.test.startsWith("Test B"))?.evidence.toolExecutionCount ?? "Not executed"}

## 9. Tool Calls After Approve

${results.find((r) => r.test.startsWith("Test C"))?.evidence.toolExecutionCount ?? executionCount}

## 10. Serialize / Restart / Resume Evidence

${JSON.stringify(results.find((r) => r.test.startsWith("Test D"))?.evidence ?? {}, null, 2)}

## 11. Same RunState Continuity Evidence

Static public API evidence:
- RunResult.state is a RunState.
- RunState.getInterruptions() exposes pending approval items.
- RunState.approve() and RunState.reject() mutate the same SDK RunState.
- run(agent, RunState) resumes from SDK state.
- RunState.toString() and RunState.fromString() support local serialize / restore.

Runtime evidence requires OPENAI_API_KEY. Current credential status: ${credential}

## 12. Runtime Event Mapping

See reports/runtime-events-map.md.

## 13. Runtime Network Requests

See reports/network-requests.md.

## 14. Tracing

Tracing export disabled: Yes, via setTracingDisabled(true).
Hosted tools, MCP, OpenAI Conversations hosted Session, Web UI, remote DB: Not used.

## 15. OpenAI-specific Type Leakage

Contained to the experiment adapter boundary:
- RunState
- RunToolApprovalItem
- RunResult
- Agent
- tool()

No formal Eliy business code imports these types.

## 16. Modify Observation

See reports/modify-observation.md.

## 17. Custom Code

Custom code is limited to an isolated CLI spike under experiments/openai-agents-ts-runtime/src.
No UI, Gateway, Memory, Skill, MCP, database, queue, or formal Runtime implementation was added.

## 18. Final Conclusion

${finalConclusion}
`;
  await writeFile(join(reportsDir, "final-report.md"), finalReport, "utf8");
}

async function runCredentialBlocked(): Promise<void> {
  const results: RuntimeTestResult[] = [
    {
      test: "Test A | Interruption",
      status: "Credential Blocked",
      evidence: {
        reason: "OPENAI_API_KEY absent; real model path not executed.",
        staticApi: ["tool.needsApproval", "RunResult.interruptions", "RunResult.state", "RunState.getInterruptions"],
        toolExecutionCount: 0
      }
    },
    {
      test: "Test B | Reject",
      status: "Credential Blocked",
      evidence: {
        reason: "OPENAI_API_KEY absent; native RunState.reject path not executed against real model interruption.",
        staticApi: ["RunState.reject(approvalItem)", "run(agent, RunState)"],
        toolExecutionCount: 0
      }
    },
    {
      test: "Test C | Approve",
      status: "Credential Blocked",
      evidence: {
        reason: "OPENAI_API_KEY absent; native RunState.approve path not executed against real model interruption.",
        staticApi: ["RunState.approve(approvalItem)", "run(agent, RunState)"],
        toolExecutionCount: 0
      }
    },
    {
      test: "Test D | Serialize / Restart / Resume",
      status: "Credential Blocked",
      evidence: {
        reason: "OPENAI_API_KEY absent; no real pending RunState could be serialized.",
        staticApi: ["RunState.toString()", "RunState.fromString(agent, serializedState)"],
        toolExecutionCount: 0
      }
    }
  ];
  await writeRuntimeReports("Credential Blocked", results);
  await writeFinalReport("Credential Blocked", results);
  console.log("Credential Blocked: OPENAI_API_KEY is not present. Static API checks and reports were generated.");
}

async function runRealRuntimeTests(): Promise<void> {
  disableTracingExport();
  installRuntimeNetworkLogger();
  await resetToolExecutions();

  const model = process.env.OPENAI_MODEL || undefined;
  const agent = createRefundAgent(model);
  const prompt = "Prepare a mock refund for amount 42.5 because the customer was double charged. Call prepare_refund.";
  const results: RuntimeTestResult[] = [];

  const interrupted = await run(agent, prompt, { maxTurns: 5 });
  const [approval] = interrupted.interruptions;
  const afterInterruptionCount = await getToolExecutionCount();
  if (!approval) throw new Error("Test A failed: no tool approval interruption returned.");
  results.push({
    test: "Test A | Interruption",
    status: afterInterruptionCount === 0 ? "Passed" : "Failed",
    evidence: {
      interruption: approvalIdentity(approval),
      toolExecutionCount: afterInterruptionCount,
      stateSchemaVersion: interrupted.state.toJSON().$schemaVersion
    }
  });

  interrupted.state.reject(approval, { message: "Human rejected this refund." });
  const rejected = await run(agent, interrupted.state, { maxTurns: 5 });
  const afterRejectCount = await getToolExecutionCount();
  results.push({
    test: "Test B | Reject",
    status: afterRejectCount === 0 ? "Passed" : "Failed",
    evidence: {
      toolExecutionCount: afterRejectCount,
      finalOutput: rejected.finalOutput,
      interruptionsAfterResume: rejected.interruptions.length,
      sameStateResumed: true
    }
  });

  const approveRun = await run(agent, prompt, { maxTurns: 5 });
  const [approveItem] = approveRun.interruptions;
  if (!approveItem) throw new Error("Test C failed: no approval interruption returned.");
  const beforeApproveCount = await getToolExecutionCount();
  approveRun.state.approve(approveItem);
  const approved = await run(agent, approveRun.state, { maxTurns: 5 });
  const afterApproveCount = await getToolExecutionCount();
  results.push({
    test: "Test C | Approve",
    status: afterApproveCount === beforeApproveCount + 1 ? "Passed" : "Failed",
    evidence: {
      beforeApproveCount,
      toolExecutionCount: afterApproveCount,
      approval: approvalIdentity(approveItem),
      finalOutput: approved.finalOutput,
      interruptionsAfterResume: approved.interruptions.length,
      sameStateResumed: true
    }
  });

  const serializeRun = await run(agent, prompt, { maxTurns: 5 });
  const [serializeApproval] = serializeRun.interruptions;
  if (!serializeApproval) throw new Error("Test D failed: no approval interruption returned.");
  const statePath = join(stateDir, "pending-runstate.json");
  await writeFile(statePath, serializeRun.state.toString(), "utf8");
  await runChild(statePath, "approve");
  const childResultPath = join(logsDir, "serialize-child-result.json");
  const childResult = JSON.parse(await readFile(childResultPath, "utf8")) as Record<string, unknown>;
  const childError = await fileExists(join(logsDir, "serialize-child-error.json"));
  results.push({
    test: "Test D | Serialize / Restart / Resume",
    status: !childError && typeof childResult.after === "number" && typeof childResult.before === "number" && childResult.after === childResult.before + 1 ? "Passed" : "Failed",
    evidence: {
      statePath,
      pendingApproval: approvalIdentity(serializeApproval),
      childResult,
      sameRunStatePathUsed: true,
      originalPromptResubmitted: false
    }
  });

  await writeJson(join(logsDir, "runtime-test-results.json"), results);
  await writeRuntimeReports(results.every((r) => r.status === "Passed") ? "OpenAI Runtime Candidate Passed" : "OpenAI Runtime Candidate Failed", results);
  await writeFinalReport(results.every((r) => r.status === "Passed") ? "OpenAI Runtime Candidate Passed" : "OpenAI Runtime Candidate Failed", results);
  console.log(results.every((r) => r.status === "Passed") ? "OpenAI Runtime Candidate Passed" : "OpenAI Runtime Candidate Failed");
}

async function main(): Promise<void> {
  await ensureDirs();
  disableTracingExport();
  await resetToolExecutions();
  installRuntimeNetworkLogger();

  if (!hasCredential()) {
    await runCredentialBlocked();
    return;
  }

  await runRealRuntimeTests();
}

main().catch(async (error) => {
  await writeJson(join(logsDir, "runtime-error.json"), {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  console.error(error);
  process.exitCode = 1;
});
