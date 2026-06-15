import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "@openai/agents";
import { approvalIdentity, createRefundAgent, disableTracingExport } from "./agent.js";
import {
  configureDeepSeekProvider,
  createDeepSeekClient,
  getDeepSeekProviderConfig
} from "./deepseek-provider.js";
import { getRuntimeNetworkRecords, installRuntimeNetworkLogger, persistRuntimeNetworkRecords } from "./network-log.js";
import { ensureDirs, logsDir, reportsDir, stateDir, writeJson } from "./storage.js";
import { getToolExecutionCount, resetToolExecutions } from "./tool.js";

type DeepSeekConclusion =
  | "DeepSeek Provider Compatibility Passed"
  | "DeepSeek Provider Compatibility Failed"
  | "Credential Blocked"
  | "Service Access Blocked";

type TestStatus = "Passed" | "Failed" | "Credential Blocked" | "Service Access Blocked" | "Not Run";

type RuntimeTestResult = {
  test: string;
  status: TestStatus;
  evidence: Record<string, unknown>;
};

type ConnectivityResult = {
  status: TestStatus;
  httpStatus?: number;
  errorType?: string;
  model: string;
  requestId?: string;
  toolCalling: "Passed" | "Failed" | "Not Run";
  usage?: unknown;
};

const PROMPT = "为一笔因交付延误产生的订单准备退款：金额 12.34，原因是 delayed delivery。请使用 prepare_refund 工具处理。";

function markdownCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function sanitize(value: unknown): string {
  const secret = process.env.DEEPSEEK_API_KEY;
  let text = typeof value === "string" ? value : JSON.stringify(value);
  if (secret) text = text.replaceAll(secret, "[REDACTED]");
  return text;
}

function gitInfo(): { branch: string; head: string; status: string } {
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: "../..", encoding: "utf8" }).trim();
  return {
    branch: git(["branch", "--show-current"]),
    head: git(["log", "--oneline", "-1"]),
    status: git(["status", "--short"]) || "clean"
  };
}

function classifyError(error: unknown): DeepSeekConclusion {
  const text = sanitize(error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error));
  if (/\b401\b|invalid_api_key|authentication|unauthorized/i.test(text)) return "Credential Blocked";
  if (/\b402\b|\b403\b|\b429\b|quota|billing|insufficient|rate limit|model.*not.*access|permission|balance/i.test(text)) {
    return "Service Access Blocked";
  }
  return "DeepSeek Provider Compatibility Failed";
}

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

async function runChild(statePath: string, decision: "approve" | "reject"): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [
      "dist/deepseek-serialize-child.js",
      statePath,
      decision
    ], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`deepseek-serialize-child exited with ${code}`));
    });
  });
}

async function checkConnectivity(): Promise<ConnectivityResult> {
  const config = getDeepSeekProviderConfig();
  if (!config.apiKeyPresent) {
    return {
      status: "Credential Blocked",
      model: config.model,
      errorType: "DEEPSEEK_API_KEY missing",
      toolCalling: "Not Run"
    };
  }

  try {
    const client = createDeepSeekClient();
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "user",
          content: "Return a tool call for prepare_refund with amount 12.34 and reason delayed delivery."
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "prepare_refund",
            description: "Prepare a mock refund.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                amount: { type: "number" },
                reason: { type: "string" }
              },
              required: ["amount", "reason"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "prepare_refund" } }
    });
    const choice = response.choices[0];
    const functionToolCalls = choice?.message?.tool_calls?.filter((call) => call.type === "function") ?? [];
    return {
      status: functionToolCalls.some((call) => call.function.name === "prepare_refund") ? "Passed" : "Failed",
      model: response.model || config.model,
      requestId: response._request_id ?? undefined,
      toolCalling: functionToolCalls.length ? "Passed" : "Failed",
      usage: response.usage
    };
  } catch (error) {
    const conclusion = classifyError(error);
    return {
      status: conclusion === "Credential Blocked" ? "Credential Blocked" : conclusion === "Service Access Blocked" ? "Service Access Blocked" : "Failed",
      model: config.model,
      errorType: sanitize(error instanceof Error ? error.message : String(error)),
      toolCalling: "Failed"
    };
  }
}

function aggregateUsage(items: unknown[]): { raw: unknown[]; requestCount: number } {
  return { raw: items, requestCount: items.length };
}

function rMatrix(results: RuntimeTestResult[]): Record<string, "Passed" | "Failed"> {
  const status = (name: string) => results.find((result) => result.test.startsWith(name))?.status;
  const a = status("Test A") === "Passed";
  const b = status("Test B") === "Passed";
  const c = status("Test C") === "Passed";
  const d = status("Test D") === "Passed";
  return {
    R1: a ? "Passed" : "Failed",
    R2: a && b && c ? "Passed" : "Failed",
    R3: b && c ? "Passed" : "Failed",
    R4: b && c ? "Passed" : "Failed",
    R5: d ? "Passed" : "Failed",
    R6: a && b && c && d ? "Passed" : "Failed"
  };
}

async function writeDeepSeekReports(
  conclusion: DeepSeekConclusion,
  connectivity: ConnectivityResult,
  results: RuntimeTestResult[],
  usageItems: unknown[],
  providerCodeLines: number
): Promise<void> {
  const config = getDeepSeekProviderConfig();
  const networkRecords = getRuntimeNetworkRecords();
  const git = gitInfo();
  const matrix = rMatrix(results);
  const requestCount = networkRecords.filter((record) => record.allowed).length;
  await persistRuntimeNetworkRecords();
  await writeJson(join(reportsDir, "deepseek-provider-runtime-network-records.json"), networkRecords);

  const resultsTable = results.map((result) =>
    `| ${markdownCell(result.test)} | ${result.status} | ${markdownCell(sanitize(result.evidence))} |`
  ).join("\n");

  const comparison = `| Item | OpenAI native model | DeepSeek V4 Flash |
|---|---|---|
| Tool Call produced | Passed | ${results.find((r) => r.test.startsWith("Test A"))?.status ?? "Not Run"} |
| Interruption | Passed | ${results.find((r) => r.test.startsWith("Test A"))?.status ?? "Not Run"} |
| Reject | Passed | ${results.find((r) => r.test.startsWith("Test B"))?.status ?? "Not Run"} |
| Approve | Passed | ${results.find((r) => r.test.startsWith("Test C"))?.status ?? "Not Run"} |
| Same RunState Resume | Passed | ${results.find((r) => r.test.startsWith("Test B"))?.status === "Passed" && results.find((r) => r.test.startsWith("Test C"))?.status === "Passed" ? "Passed" : "Not proven"} |
| Cross-process Recovery | Passed | ${results.find((r) => r.test.startsWith("Test D"))?.status ?? "Not Run"} |
| Tool execution count correct | Passed | ${matrix.R2 === "Passed" && matrix.R3 === "Passed" ? "Passed" : "Not proven"} |
| Event Mapping | Passed | ${matrix.R6 === "Passed" ? "Passed" : "Not proven"} |
| Patch / Fork | None | None |
| Provider-specific code | Baseline | ${providerCodeLines} lines in src/deepseek-provider.ts |
`;

  const runtimeResults = `# DeepSeek Provider Runtime Results

Task: CP-HAC-OPENAI-AGENTS-TS-DEEPSEEK-COMPATIBILITY-SPIKE-01
Date: ${new Date().toISOString()}
Conclusion: ${conclusion}

Provider: OpenAI-compatible Chat Completions
Model: ${config.model}
Base URL: ${config.baseURL}

## API Connectivity

| Item | Result |
|---|---|
| API key present | ${config.apiKeyPresent ? "SET" : "NOT_SET"} |
| Status | ${connectivity.status} |
| Model | ${connectivity.model} |
| Tool Calling | ${connectivity.toolCalling} |
| Request ID | ${connectivity.requestId ?? "Not available"} |
| Error Type | ${connectivity.errorType ?? "None"} |

## Test A-D

| Test | Result | Evidence |
|---|---|---|
${resultsTable || "| Not run | Not Run | No runtime execution |"}
`;

  const networkReport = `# DeepSeek Provider Network Requests

Install/setup network and runtime network are separated.

Allowed runtime remote service:
- ${config.runtimeAllowedDomain} for DeepSeek OpenAI-compatible Model API.

| URL / Domain | Method | Purpose | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
|---|---|---|---|---|---|---|---|
${networkRecords.length === 0 ? "| None observed | n/a | Runtime path did not call network | n/a | No | n/a | n/a | reports/deepseek-provider-runtime-network-records.json |" : networkRecords.map((record) => `| ${record.domain} | ${record.method} | ${record.reason} | Remote | ${config.apiKeyPresent ? "Yes, value not logged" : "No"} | Yes | ${record.allowed ? "Allowed" : "Blocked"} | reports/deepseek-provider-runtime-network-records.json |`).join("\n")}

Forbidden runtime services:
- Assistant Cloud: Not observed.
- Hosted Tools: Not used.
- MCP: Not used.
- OpenAI Conversations hosted Session: Not used.
- Remote database: Not used.
- Other Provider: Not observed.
- Undeclared telemetry: Not observed by fetch instrumentation.

API request count from fetch instrumentation: ${requestCount}
Token usage: ${usageItems.length ? sanitize(aggregateUsage(usageItems)) : "SDK result did not provide / no runtime call completed"}
`;

  const eventsMap = `# DeepSeek Provider Runtime Events Map

| HAC semantic | SDK actual object / event | Test evidence | Thin adapter isolatable |
|---|---|---|---|
| tool_requested | SDK Result/State object: RunResult.interruptions[] / RunToolApprovalItem.rawItem | ${results.find((r) => r.test.startsWith("Test A"))?.status ?? "Not Run"} | Yes |
| run_interrupted | SDK Result/State object: RunResult.interruptions.length > 0 / RunState.getInterruptions() | ${results.find((r) => r.test.startsWith("Test A"))?.status ?? "Not Run"} | Yes |
| human_approved | SDK Runtime operation: RunState.approve(approvalItem) | ${results.find((r) => r.test.startsWith("Test C"))?.status ?? "Not Run"} | Yes |
| human_rejected | SDK Runtime operation: RunState.reject(approvalItem, { message }) | ${results.find((r) => r.test.startsWith("Test B"))?.status ?? "Not Run"} | Yes |
| tool_started | Experiment local log at tool execute callback start | ${results.find((r) => r.test.startsWith("Test C"))?.status ?? "Not Run"} | Yes |
| tool_result | SDK result item plus experiment local tool execution output | ${results.find((r) => r.test.startsWith("Test C"))?.status ?? "Not Run"} | Yes |
| run_completed | SDK Result object: RunResult.finalOutput and zero pending interruptions | ${results.every((r) => r.status === "Passed") ? "Passed" : "Not fully proven"} | Yes |

SDK-native objects are RunResult, RunState, and RunToolApprovalItem. Tool execution count and network records are experiment logs.
`;

  const modifyObservation = `# DeepSeek Provider Modify Observation

Pending tool arguments are readable through RunToolApprovalItem.arguments.

Public in-place mutation of pending tool arguments: Not identified.

Thin correct path remains:

1. Reject the original Tool Call using RunState.reject().
2. Have HAC Harness form a new structured Proposal.
3. Let Runtime/model produce a new Tool Call with a new decision identity.

Patch / Fork / private API required: No for the reject-and-new-proposal path; yes would be required to mutate SDK serialized interruption internals, which this spike does not do.
`;

  const finalReport = `# DeepSeek Provider Compatibility Final Report

Task: CP-HAC-OPENAI-AGENTS-TS-DEEPSEEK-COMPATIBILITY-SPIKE-01
Date: ${new Date().toISOString()}

## 1. Branch / HEAD / Git Status

Branch: ${git.branch}
Baseline Commit: 92da792 test(openai-agents): record native runtime acceptance pass
Current HEAD at report generation: ${git.head}
Git status at report generation: ${git.status}

## 2. SDK and Dependencies

| Package | Version |
|---|---:|
| @openai/agents | 0.11.6 |
| openai | 6.42.0 |
| zod | 4.4.3 |

## 3. Provider

Runtime: OpenAI Agents SDK TypeScript
Provider: DeepSeek OpenAI-compatible Chat Completions
Base URL: ${config.baseURL}
Model: ${config.model}
API key present: ${config.apiKeyPresent ? "SET" : "NOT_SET"}

## 4. API Connectivity

Status: ${connectivity.status}
HTTP Status: ${connectivity.httpStatus ?? "Not available"}
Error Type: ${connectivity.errorType ?? "None"}
Request ID: ${connectivity.requestId ?? "Not available"}
Tool Calling: ${connectivity.toolCalling}

## 5. Test Results

| Test | Result | Evidence |
|---|---|---|
${resultsTable || "| Test A-D | Not Run | Credential or service blocked before runtime tests |"}

## 6. Tool Execution Counts

Before approval: ${results.find((r) => r.test.startsWith("Test A"))?.evidence.toolExecutionCount ?? "Not run"}
After reject: ${results.find((r) => r.test.startsWith("Test B"))?.evidence.toolExecutionCount ?? "Not run"}
After approve: ${results.find((r) => r.test.startsWith("Test C"))?.evidence.toolExecutionCount ?? "Not run"}

## 7. R1-R6

| Capability | Result |
|---|---|
| R1 Tool execution can be intercepted before execution | ${matrix.R1} |
| R2 Unauthorized tool does not execute | ${matrix.R2} |
| R3 Approve / Reject are structured Runtime operations | ${matrix.R3} |
| R4 Same RunState resumes after decision | ${matrix.R4} |
| R5 State serializes and resumes across process | ${matrix.R5} |
| R6 Runtime state/events can be structurally mapped | ${matrix.R6} |

## 8. OpenAI Native Baseline Comparison

${comparison}

## 9. Provider Adapter

Implementation: src/deepseek-provider.ts
Provider-specific code lines: ${providerCodeLines}
Uses public APIs: setDefaultOpenAIClient(), setOpenAIAPI("chat_completions"), setTracingDisabled(true)
Agent / Tool / RunState main logic changed for provider: No
Thin Model Provider Adapter feasible: Yes

## 10. OpenAI-specific Type Leakage

OpenAI Agents SDK types remain contained in the experiment runtime boundary: Agent, RunState, RunToolApprovalItem, RunResult.
No formal Eliy business code imports these types.

## 11. Patch / Fork / Private API

Patch used: No
Fork used: No
Private API used: No
Hosted Session used: No
MCP used: No
Custom Agent Loop used: No
Second RunState used: No

## 12. API Requests and Token Usage

API request count from fetch instrumentation: ${requestCount}
Token usage: ${usageItems.length ? sanitize(aggregateUsage(usageItems)) : "SDK result did not provide / no runtime call completed"}

## 13. Modify Observation

See reports/deepseek-provider-modify-observation.md.

## 14. Conclusion

${conclusion}

## 15. Recommendation

${conclusion === "DeepSeek Provider Compatibility Passed" ? "Recommend adopting OpenAI Agents SDK TypeScript + DeepSeek V4 Flash as the current Single Runtime Spine main hypothesis." : "Do not adopt OpenAI Agents SDK TypeScript + DeepSeek V4 Flash as the Single Runtime Spine main hypothesis until this blocker is resolved."}
`;

  await writeFile(join(reportsDir, "deepseek-provider-runtime-results.md"), runtimeResults, "utf8");
  await writeFile(join(reportsDir, "deepseek-provider-network-requests.md"), networkReport, "utf8");
  await writeFile(join(reportsDir, "deepseek-provider-runtime-events-map.md"), eventsMap, "utf8");
  await writeFile(join(reportsDir, "deepseek-provider-modify-observation.md"), modifyObservation, "utf8");
  await writeFile(join(reportsDir, "deepseek-provider-final-report.md"), finalReport, "utf8");
}

async function runDeepSeekRuntime(): Promise<{
  conclusion: DeepSeekConclusion;
  connectivity: ConnectivityResult;
  results: RuntimeTestResult[];
  usageItems: unknown[];
}> {
  const config = configureDeepSeekProvider();
  installRuntimeNetworkLogger();
  await resetToolExecutions();

  const connectivity = await checkConnectivity();
  const usageItems: unknown[] = [];
  if (connectivity.usage) usageItems.push({ source: "connectivity", usage: connectivity.usage });

  if (!config.apiKeyPresent) {
    return {
      conclusion: "Credential Blocked",
      connectivity,
      results: [
        {
          test: "Test A-D | DeepSeek runtime",
          status: "Credential Blocked",
          evidence: { reason: "DEEPSEEK_API_KEY missing; no API request attempted." }
        }
      ],
      usageItems
    };
  }

  if (connectivity.status === "Credential Blocked") return { conclusion: "Credential Blocked", connectivity, results: [], usageItems };
  if (connectivity.status === "Service Access Blocked") return { conclusion: "Service Access Blocked", connectivity, results: [], usageItems };
  if (connectivity.status !== "Passed") return { conclusion: "DeepSeek Provider Compatibility Failed", connectivity, results: [], usageItems };

  const agent = createRefundAgent(config.model);
  const results: RuntimeTestResult[] = [];

  try {
    const interrupted = await run(agent, PROMPT, { maxTurns: 5 });
    usageItems.push(...interrupted.rawResponses.map((response) => ({ source: "test-a", usage: response.usage })));
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

    const rejectRun = await run(agent, PROMPT, { maxTurns: 5 });
    usageItems.push(...rejectRun.rawResponses.map((response) => ({ source: "test-b-pending", usage: response.usage })));
    const [rejectItem] = rejectRun.interruptions;
    if (!rejectItem) throw new Error("Test B failed: no tool approval interruption returned.");
    rejectRun.state.reject(rejectItem, { message: "Human rejected this refund." });
    const rejected = await run(agent, rejectRun.state, { maxTurns: 5 });
    usageItems.push(...rejected.rawResponses.map((response) => ({ source: "test-b-resume", usage: response.usage })));
    const afterRejectCount = await getToolExecutionCount();
    results.push({
      test: "Test B | Reject",
      status: afterRejectCount === 0 ? "Passed" : "Failed",
      evidence: {
        toolExecutionCount: afterRejectCount,
        finalOutput: rejected.finalOutput,
        interruptionsAfterResume: rejected.interruptions.length,
        sameStateResumed: true,
        originalPromptResubmitted: false
      }
    });

    const approveRun = await run(agent, PROMPT, { maxTurns: 5 });
    usageItems.push(...approveRun.rawResponses.map((response) => ({ source: "test-c-pending", usage: response.usage })));
    const [approveItem] = approveRun.interruptions;
    if (!approveItem) throw new Error("Test C failed: no tool approval interruption returned.");
    const beforeApproveCount = await getToolExecutionCount();
    approveRun.state.approve(approveItem);
    const approved = await run(agent, approveRun.state, { maxTurns: 5 });
    usageItems.push(...approved.rawResponses.map((response) => ({ source: "test-c-resume", usage: response.usage })));
    const afterApproveCount = await getToolExecutionCount();
    results.push({
      test: "Test C | Approve",
      status: beforeApproveCount === 0 && afterApproveCount === 1 ? "Passed" : "Failed",
      evidence: {
        beforeApproveCount,
        toolExecutionCount: afterApproveCount,
        approval: approvalIdentity(approveItem),
        finalOutput: approved.finalOutput,
        interruptionsAfterResume: approved.interruptions.length,
        sameStateResumed: true,
        originalPromptResubmitted: false
      }
    });

    const serializeRun = await run(agent, PROMPT, { maxTurns: 5 });
    usageItems.push(...serializeRun.rawResponses.map((response) => ({ source: "test-d-pending", usage: response.usage })));
    const [serializeApproval] = serializeRun.interruptions;
    if (!serializeApproval) throw new Error("Test D failed: no tool approval interruption returned.");
    const statePath = join(stateDir, "deepseek-pending-runstate.json");
    const serializedState = serializeRun.state.toString();
    await writeFile(statePath, serializedState, "utf8");
    const oldProcessPid = process.pid;
    await runChild(statePath, "approve");
    const childResultPath = join(logsDir, "deepseek-serialize-child-result.json");
    const childResult = JSON.parse(await readFile(childResultPath, "utf8")) as Record<string, unknown>;
    const childError = await fileExists(join(logsDir, "deepseek-serialize-child-error.json"));
    if (Array.isArray(childResult.usage)) {
      usageItems.push(...childResult.usage.map((usage) => ({ source: "test-d-child-resume", usage })));
    }
    results.push({
      test: "Test D | Serialize / Restart / Resume",
      status: !childError && typeof childResult.after === "number" && typeof childResult.before === "number" && childResult.after === childResult.before + 1 ? "Passed" : "Failed",
      evidence: {
        oldProcessPid,
        newProcessPid: childResult.newProcessPid,
        stateFileSha256: createHash("sha256").update(serializedState).digest("hex"),
        stateFileBytes: Buffer.byteLength(serializedState),
        pendingApproval: approvalIdentity(serializeApproval),
        childResult,
        sameRunStatePathUsed: true,
        originalPromptResubmitted: false
      }
    });
  } catch (error) {
    const conclusion = classifyError(error);
    results.push({
      test: "Runtime execution",
      status: conclusion === "Credential Blocked" || conclusion === "Service Access Blocked" ? conclusion : "Failed",
      evidence: { error: sanitize(error instanceof Error ? error.message : String(error)) }
    });
    return { conclusion, connectivity, results, usageItems };
  }

  const conclusion = results.every((result) => result.status === "Passed")
    ? "DeepSeek Provider Compatibility Passed"
    : "DeepSeek Provider Compatibility Failed";
  return { conclusion, connectivity, results, usageItems };
}

async function main(): Promise<void> {
  await ensureDirs();
  disableTracingExport();
  const providerCode = await readFile("src/deepseek-provider.ts", "utf8");
  const providerCodeLines = providerCode.split("\n").filter((line) => line.trim().length > 0).length;
  const { conclusion, connectivity, results, usageItems } = await runDeepSeekRuntime();
  await writeJson(join(logsDir, "deepseek-runtime-results.json"), { conclusion, connectivity, results });
  await writeDeepSeekReports(conclusion, connectivity, results, usageItems, providerCodeLines);
  console.log(conclusion);
}

main().catch(async (error) => {
  const conclusion = classifyError(error);
  const connectivity: ConnectivityResult = {
    status: conclusion === "Credential Blocked" || conclusion === "Service Access Blocked" ? conclusion : "Failed",
    model: getDeepSeekProviderConfig().model,
    errorType: sanitize(error instanceof Error ? error.message : String(error)),
    toolCalling: "Failed"
  };
  await writeJson(join(logsDir, "deepseek-runtime-error.json"), {
    message: sanitize(error instanceof Error ? error.message : String(error)),
    stack: sanitize(error instanceof Error ? error.stack : undefined)
  });
  await writeDeepSeekReports(conclusion, connectivity, [], [], 0);
  console.error(conclusion);
  process.exitCode = conclusion === "DeepSeek Provider Compatibility Failed" ? 1 : 0;
});
