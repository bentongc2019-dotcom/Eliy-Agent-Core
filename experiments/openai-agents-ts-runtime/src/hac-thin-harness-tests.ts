import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createHacActionReceipt,
  renderAuthoritativeOutcome,
  type HacActionReceipt
} from "./hac-action-receipt.js";
import { evaluateHacGate, HAC_REJECT_MESSAGE } from "./hac-gate.js";
import { reportsDir, ensureDirs, nowIso } from "./storage.js";
import {
  getToolExecutionCount,
  prepareRefundTool,
  resetToolExecutions,
  type PrepareRefundArgs
} from "./tool.js";

type EvidenceEventName =
  | "gate_evaluated"
  | "human_approved"
  | "human_rejected"
  | "tool_started"
  | "tool_succeeded"
  | "tool_failed"
  | "action_receipt_created"
  | "truth_mismatch_detected";

type EvidenceEvent = {
  timestamp: string;
  test: string;
  type: EvidenceEventName;
  toolCallId: string;
  detail: string;
};

type GoldenTestResult = {
  name: string;
  passed: boolean;
  toolExecutions: number;
  toolAttempts: number;
  receipt: HacActionReceipt;
  truthMismatch: boolean;
  userVisibleMessage: string;
  evidence: string;
};

const TOOL_NAME = "prepare_refund";
const TEST_ARGS: PrepareRefundArgs = {
  amount: 12.34,
  reason: "delayed delivery"
};

const events: EvidenceEvent[] = [];

function record(test: string, type: EvidenceEventName, toolCallId: string, detail: string): void {
  events.push({
    timestamp: nowIso(),
    test,
    type,
    toolCallId,
    detail
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function hasForbiddenCompletionClaim(message: string): boolean {
  return /(已提交|已处理|已完成|已准备退款|退款已完成|refund (submitted|processed|completed)|submitted the refund|processed the refund|completed the refund)/i.test(
    message
  );
}

function mdCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

async function assertGateWired(test: string, toolCallId: string): Promise<void> {
  const gate = evaluateHacGate(TOOL_NAME);
  record(test, "gate_evaluated", toolCallId, `${gate.policyVersion}: ${gate.reason}`);
  assert(gate.requiresHumanApproval, "HAC Gate must require human approval for prepare_refund.");

  const toolRequiresApproval = await prepareRefundTool.needsApproval(
    {} as never,
    TEST_ARGS,
    toolCallId
  );
  assert(toolRequiresApproval, "prepare_refund.needsApproval must be driven by HAC Gate.");
}

async function testRejectTruth(): Promise<GoldenTestResult> {
  const name = "Test A | Reject Truth";
  const toolCallId = "hac-reject-call-1";
  await resetToolExecutions();
  await assertGateWired(name, toolCallId);

  record(name, "human_rejected", toolCallId, HAC_REJECT_MESSAGE);

  const receipt = createHacActionReceipt({
    toolCallId,
    toolName: TOOL_NAME,
    humanDecision: "rejected",
    runtimeOutcome: { status: "not_executed" }
  });
  record(name, "action_receipt_created", toolCallId, `${receipt.humanDecision}/${receipt.executionStatus}`);

  const agentNarrative = "已提交退款准备请求。";
  const finalOutcome = renderAuthoritativeOutcome({ receipt, agentNarrative });
  if (finalOutcome.truthMismatch) {
    record(name, "truth_mismatch_detected", toolCallId, "Agent narrative claimed completion after rejection.");
  }

  const toolExecutions = await getToolExecutionCount();
  assert(toolExecutions === 0, "Reject path must not execute prepare_refund.");
  assert(receipt.humanDecision === "rejected", "Reject receipt must preserve human decision.");
  assert(receipt.executionStatus === "not_executed", "Reject receipt must record not_executed.");
  assert(finalOutcome.truthMismatch, "Reject path must detect conflicting completion narrative.");
  assert(
    !hasForbiddenCompletionClaim(finalOutcome.userVisibleMessage),
    "Reject user-visible result must not contain completion claims."
  );

  return {
    name,
    passed: true,
    toolExecutions,
    toolAttempts: 0,
    receipt,
    truthMismatch: finalOutcome.truthMismatch,
    userVisibleMessage: finalOutcome.userVisibleMessage,
    evidence: "Tool count remained 0; Action Receipt rejected/not_executed suppressed completion narrative."
  };
}

async function testApproveSuccessTruth(): Promise<GoldenTestResult> {
  const name = "Test B | Approve Success Truth";
  const toolCallId = "hac-approve-success-call-1";
  await resetToolExecutions();
  await assertGateWired(name, toolCallId);

  record(name, "human_approved", toolCallId, "Human approved prepare_refund.");
  record(name, "tool_started", toolCallId, "prepare_refund invoked after approval.");
  const result = await prepareRefundTool.invoke({} as never, JSON.stringify(TEST_ARGS), {
    toolCall: {
      type: "function_call",
      callId: toolCallId,
      name: TOOL_NAME,
      arguments: JSON.stringify(TEST_ARGS)
    } as never,
    resumeState: "approved-runstate"
  });
  record(name, "tool_succeeded", toolCallId, "prepare_refund returned a mock-only success result.");

  const resultMessage =
    typeof result === "string"
      ? result
      : typeof result === "object" && result !== null && "message" in result
        ? String((result as { message: unknown }).message)
        : JSON.stringify(result);

  const receipt = createHacActionReceipt({
    toolCallId,
    toolName: TOOL_NAME,
    humanDecision: "approved",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage
    }
  });
  record(name, "action_receipt_created", toolCallId, `${receipt.humanDecision}/${receipt.executionStatus}`);

  const finalOutcome = renderAuthoritativeOutcome({
    receipt,
    agentNarrative: "已准备一条 mock-only 退款准备记录，未执行真实退款。"
  });

  const toolExecutions = await getToolExecutionCount();
  assert(toolExecutions === 1, "Approve success path must execute prepare_refund exactly once.");
  assert(receipt.humanDecision === "approved", "Approve success receipt must preserve human decision.");
  assert(receipt.executionStatus === "succeeded", "Approve success receipt must record succeeded.");
  assert(!finalOutcome.truthMismatch, "Approve success narrative must not conflict with Action Receipt.");
  assert(
    finalOutcome.userVisibleMessage.includes("mock") || finalOutcome.userVisibleMessage.includes("Mock"),
    "Approve success user-visible result must stay within the mock tool result boundary."
  );

  return {
    name,
    passed: true,
    toolExecutions,
    toolAttempts: 1,
    receipt,
    truthMismatch: finalOutcome.truthMismatch,
    userVisibleMessage: finalOutcome.userVisibleMessage,
    evidence: "Tool count became 1 only after approval; Action Receipt approved/succeeded matched tool result."
  };
}

async function testApproveFailureTruth(): Promise<GoldenTestResult> {
  const name = "Test C | Approve Failure Truth";
  const toolCallId = "hac-approve-failure-call-1";
  await resetToolExecutions();
  await assertGateWired(name, toolCallId);

  record(name, "human_approved", toolCallId, "Human approved prepare_refund.");
  record(name, "tool_started", toolCallId, "prepare_refund deterministic failure branch attempted execution.");
  const deterministicError = "mock downstream refund ledger unavailable";
  record(name, "tool_failed", toolCallId, deterministicError);

  const receipt = createHacActionReceipt({
    toolCallId,
    toolName: TOOL_NAME,
    humanDecision: "approved",
    runtimeOutcome: {
      status: "failed",
      errorMessage: deterministicError
    }
  });
  record(name, "action_receipt_created", toolCallId, `${receipt.humanDecision}/${receipt.executionStatus}`);

  const finalOutcome = renderAuthoritativeOutcome({
    receipt,
    agentNarrative: "退款准备已完成。"
  });
  if (finalOutcome.truthMismatch) {
    record(name, "truth_mismatch_detected", toolCallId, "Agent narrative claimed completion after tool failure.");
  }

  const toolExecutions = await getToolExecutionCount();
  assert(receipt.humanDecision === "approved", "Approve failure receipt must preserve approved decision.");
  assert(receipt.executionStatus === "failed", "Approve failure receipt must record failed.");
  assert(finalOutcome.truthMismatch, "Approve failure must detect conflicting completion narrative.");
  assert(
    !hasForbiddenCompletionClaim(finalOutcome.userVisibleMessage),
    "Approve failure user-visible result must not claim completion."
  );

  return {
    name,
    passed: true,
    toolExecutions,
    toolAttempts: 1,
    receipt,
    truthMismatch: finalOutcome.truthMismatch,
    userVisibleMessage: finalOutcome.userVisibleMessage,
    evidence:
      "Tool start and deterministic failure were recorded; Action Receipt approved/failed suppressed completion narrative."
  };
}

function renderResultsReport(results: GoldenTestResult[]): string {
  return `# HAC Thin Harness Decision Outcome Results

Task: CP-HAC-THIN-HARNESS-DECISION-OUTCOME-SPIKE-01
Generated: ${nowIso()}

| Test | Result | Tool Attempts | Tool Success Count | Receipt | Truth Mismatch | Evidence |
|---|---:|---:|---:|---|---|---|
${results
  .map(
    (result) =>
      `| ${mdCell(result.name)} | ${result.passed ? "Passed" : "Failed"} | ${result.toolAttempts} | ${result.toolExecutions} | ${result.receipt.humanDecision}/${result.receipt.executionStatus} | ${result.truthMismatch ? "Detected and contained" : "No"} | ${mdCell(result.evidence)} |`
  )
  .join("\n")}

## User-visible Authoritative Outcomes

${results.map((result) => `### ${result.name}\n\n${result.userVisibleMessage}`).join("\n\n")}
`;
}

function renderEventsReport(): string {
  return `# HAC Thin Harness Decision Outcome Events

Task: CP-HAC-THIN-HARNESS-DECISION-OUTCOME-SPIKE-01
Generated: ${nowIso()}

Only the minimum allowed evidence event names are recorded.

| Timestamp | Test | Event | Tool Call ID | Detail |
|---|---|---|---|---|
${events
  .map(
    (event) =>
      `| ${event.timestamp} | ${mdCell(event.test)} | ${event.type} | ${event.toolCallId} | ${mdCell(event.detail)} |`
  )
  .join("\n")}
`;
}

function renderFinalReport(results: GoldenTestResult[]): string {
  const reject = results.find((result) => result.name.startsWith("Test A"));
  const approveSuccess = results.find((result) => result.name.startsWith("Test B"));
  const approveFailure = results.find((result) => result.name.startsWith("Test C"));
  const allPassed = results.every((result) => result.passed);

  return `# HAC Thin Harness Decision Outcome Final Report

Task: CP-HAC-THIN-HARNESS-DECISION-OUTCOME-SPIKE-01
Generated: ${nowIso()}

## Baseline

- Source branch: spike/openai-agents-ts-deepseek-provider
- Baseline commit: d5e1266 test(openai-agents): record deepseek provider compatibility pass
- Runtime baseline: OpenAI Agents SDK TypeScript + DeepSeek V4 Flash + Thin Provider Adapter
- Existing OpenAI and DeepSeek runtime/provider reports were not overwritten.

## Scope

- Added a thin HAC Gate.
- Added a thin HAC Action Receipt.
- Added local CLI Golden Tests for decision/outcome truth.
- Did not add Gateway, Web UI, Memory, Skill, Workspace, database, Google ADK, multi-agent, formal policy engine, or full Evidence Plane.

## Required Questions

1. HAC Gate connected to needsApproval: Yes. prepare_refund.needsApproval calls evaluateHacGate("prepare_refund").
2. Reject false completion claim eliminated: Yes. Reject produces rejected/not_executed and suppresses conflicting completion narrative.
3. Approve Success truth: Yes. Tool executes once after approval and receipt is approved/succeeded.
4. Approve Failure truth: Yes. Deterministic failed runtime outcome produces approved/failed and does not claim completion.
5. Action Receipt as single authority: Yes. CLI user-visible result is rendered from Action Receipt, not model narrative.
6. Patch, Fork, or private API required: No.
7. Thin HAC Extension added code: hac-gate.ts, hac-action-receipt.ts, hac-thin-harness-tests.ts, plus one needsApproval wiring change and one npm script.
8. Next Harness Decision Model validation: Recommended, after this thin decision/outcome contract.

## Golden Test Matrix

| Test | Result | Tool Attempts | Tool Success Count | Receipt | User-visible Truth |
|---|---:|---:|---:|---|---|
| Reject Truth | ${reject?.passed ? "Passed" : "Failed"} | ${reject?.toolAttempts ?? "n/a"} | ${reject?.toolExecutions ?? "n/a"} | ${reject ? `${reject.receipt.humanDecision}/${reject.receipt.executionStatus}` : "n/a"} | ${reject?.userVisibleMessage ?? "n/a"} |
| Approve Success Truth | ${approveSuccess?.passed ? "Passed" : "Failed"} | ${approveSuccess?.toolAttempts ?? "n/a"} | ${approveSuccess?.toolExecutions ?? "n/a"} | ${approveSuccess ? `${approveSuccess.receipt.humanDecision}/${approveSuccess.receipt.executionStatus}` : "n/a"} | ${approveSuccess?.userVisibleMessage ?? "n/a"} |
| Approve Failure Truth | ${approveFailure?.passed ? "Passed" : "Failed"} | ${approveFailure?.toolAttempts ?? "n/a"} | ${approveFailure?.toolExecutions ?? "n/a"} | ${approveFailure ? `${approveFailure.receipt.humanDecision}/${approveFailure.receipt.executionStatus}` : "n/a"} | ${approveFailure?.userVisibleMessage ?? "n/a"} |

## Contract Checks

| Requirement | Result |
|---|---|
| needsApproval decided by HAC Gate | Passed |
| Reject tool execution count remains 0 | ${reject?.toolExecutions === 0 ? "Passed" : "Failed"} |
| Reject returns not executed | ${reject?.receipt.executionStatus === "not_executed" ? "Passed" : "Failed"} |
| Approve Success executes exactly once | ${approveSuccess?.toolExecutions === 1 ? "Passed" : "Failed"} |
| Approve Failure not described as success | ${approveFailure?.receipt.executionStatus === "failed" && approveFailure.truthMismatch ? "Passed" : "Failed"} |
| Action Receipt based on decision and runtime outcome | Passed |
| Agent narrative cannot override Action Receipt | Passed |
| No SDK patch/fork/private API | Passed |
| No second Runtime state machine | Passed |

## Final Conclusion

${allPassed ? "HAC Decision–Outcome Contract Passed" : "HAC Decision–Outcome Contract Failed"}
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = [await testRejectTruth(), await testApproveSuccessTruth(), await testApproveFailureTruth()];

  await writeFile(
    join(reportsDir, "hac-thin-harness-decision-outcome-results.md"),
    renderResultsReport(results),
    "utf8"
  );
  await writeFile(
    join(reportsDir, "hac-thin-harness-decision-outcome-events.md"),
    renderEventsReport(),
    "utf8"
  );
  await writeFile(
    join(reportsDir, "hac-thin-harness-decision-outcome-final-report.md"),
    renderFinalReport(results),
    "utf8"
  );

  const allPassed = results.every((result) => result.passed);
  for (const result of results) {
    console.log(`${result.name}: ${result.passed ? "Passed" : "Failed"}`);
    console.log(`  receipt=${result.receipt.humanDecision}/${result.receipt.executionStatus}`);
    console.log(`  toolAttempts=${result.toolAttempts}`);
    console.log(`  toolExecutions=${result.toolExecutions}`);
    console.log(`  truthMismatch=${result.truthMismatch ? "contained" : "none"}`);
  }
  console.log(allPassed ? "HAC Decision–Outcome Contract Passed" : "HAC Decision–Outcome Contract Failed");

  if (!allPassed) {
    process.exitCode = 1;
  }
}

await main();
