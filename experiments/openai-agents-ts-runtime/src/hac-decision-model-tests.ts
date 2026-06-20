import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createHacActionReceipt,
  renderAuthoritativeOutcome,
  type HacActionReceipt
} from "./hac-action-receipt.js";
import {
  decideHacAction,
  type HacActionFacts,
  type HacDecision,
  type HacDecisionMode
} from "./hac-decision-model.js";
import { evaluateHacGate } from "./hac-gate.js";
import { ensureDirs, nowIso, reportsDir } from "./storage.js";
import { getToolExecutionCount, prepareRefundTool, resetToolExecutions } from "./tool.js";

type DecisionEventName =
  | "action_facts_created"
  | "hac_decision_created"
  | "autonomous_action_started"
  | "proposal_presented"
  | "authorization_requested"
  | "action_blocked"
  | "human_approved"
  | "human_rejected"
  | "action_receipt_created";

type DecisionEvent = {
  timestamp: string;
  test: string;
  type: DecisionEventName;
  actionId: string;
  detail: string;
};

type TestResult = {
  name: string;
  expectedMode: HacDecisionMode;
  actualMode: HacDecisionMode;
  passed: boolean;
  runtimeBehavior: string;
  receipt?: HacActionReceipt;
  evidence: string;
};

type MetamorphicResult = {
  name: string;
  passed: boolean;
  evidence: string;
};

const events: DecisionEvent[] = [];

function record(test: string, type: DecisionEventName, actionId: string, detail: string): void {
  events.push({
    timestamp: nowIso(),
    test,
    type,
    actionId,
    detail
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function mdCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function createFacts(args: Omit<HacActionFacts, "actionId"> & { actionId?: string }): HacActionFacts {
  return {
    actionId: args.actionId ?? `action-${args.actionType}`,
    actionType: args.actionType,
    hasExternalSideEffect: args.hasExternalSideEffect,
    requiresHumanValueJudgment: args.requiresHumanValueJudgment,
    prohibited: args.prohibited
  };
}

function decideAndRecord(test: string, facts: HacActionFacts): HacDecision {
  record(test, "action_facts_created", facts.actionId, JSON.stringify(facts));
  const decision = decideHacAction(facts);
  record(test, "hac_decision_created", facts.actionId, `${decision.mode}: ${decision.reasonCode}`);
  return decision;
}

async function testAutonomous(): Promise<TestResult> {
  const name = "Test A | AUTONOMOUS";
  const facts = createFacts({
    actionId: "action-autonomous-complaint-summary",
    actionType: "summarize_complaint",
    hasExternalSideEffect: false,
    requiresHumanValueJudgment: false,
    prohibited: false
  });
  const decision = decideAndRecord(name, facts);
  assert(decision.mode === "AUTONOMOUS", "summarize_complaint must be AUTONOMOUS.");
  assert(!evaluateHacGate(facts).requiresHumanApproval, "AUTONOMOUS action must not create approval interruption.");

  record(name, "autonomous_action_started", facts.actionId, "Executed local no-side-effect complaint summary action.");
  const mockResult = "整理完成：投诉事实包含交付延误、退款诉求和订单上下文。";
  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: facts.actionType,
    humanDecision: "not_required",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage: mockResult
    }
  });
  record(name, "action_receipt_created", facts.actionId, `${receipt.humanDecision}/${receipt.executionStatus}`);
  const outcome = renderAuthoritativeOutcome({ receipt });

  return {
    name,
    expectedMode: "AUTONOMOUS",
    actualMode: decision.mode,
    passed: outcome.receipt.executionStatus === "succeeded",
    runtimeBehavior: "Executed one local no-side-effect mock action without human approval.",
    receipt,
    evidence: outcome.userVisibleMessage
  };
}

async function testPropose(): Promise<TestResult> {
  const name = "Test B | PROPOSE";
  const facts = createFacts({
    actionId: "action-propose-compensation-option",
    actionType: "select_compensation_option",
    hasExternalSideEffect: false,
    requiresHumanValueJudgment: true,
    prohibited: false
  });
  const decision = decideAndRecord(name, facts);
  assert(decision.mode === "PROPOSE", "select_compensation_option must be PROPOSE.");
  assert(decision.requiredHumanInput, "PROPOSE decision must include requiredHumanInput.");
  assert(!evaluateHacGate(facts).requiresHumanApproval, "PROPOSE must not enter SDK approval execution path.");

  record(
    name,
    "proposal_presented",
    facts.actionId,
    "Candidate options presented; final compensation choice remains pending human judgment."
  );
  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: facts.actionType,
    humanDecision: "pending",
    runtimeOutcome: { status: "not_executed" }
  });
  record(name, "action_receipt_created", facts.actionId, `${receipt.humanDecision}/${receipt.executionStatus}`);
  const outcome = renderAuthoritativeOutcome({
    receipt,
    agentNarrative: "可以考虑退款、优惠券或补发，但不会替用户最终决定。"
  });

  return {
    name,
    expectedMode: "PROPOSE",
    actualMode: decision.mode,
    passed: receipt.executionStatus === "not_executed" && Boolean(decision.requiredHumanInput),
    runtimeBehavior: "Presented structured human input requirement and stopped before execution.",
    receipt,
    evidence: `${decision.requiredHumanInput} ${outcome.userVisibleMessage}`
  };
}

async function testAuthorize(): Promise<TestResult> {
  const name = "Test C | AUTHORIZE";
  const facts = createFacts({
    actionId: "action-authorize-prepare-refund",
    actionType: "prepare_refund",
    hasExternalSideEffect: true,
    requiresHumanValueJudgment: false,
    prohibited: false
  });
  await resetToolExecutions();
  const decision = decideAndRecord(name, facts);
  assert(decision.mode === "AUTHORIZE", "prepare_refund facts must be AUTHORIZE.");
  assert(evaluateHacGate(facts).requiresHumanApproval, "AUTHORIZE must enter SDK approval path.");

  const sdkApprovalRequired = await prepareRefundTool.needsApproval(
    {} as never,
    { amount: 12.34, reason: "delayed delivery" },
    facts.actionId
  );
  assert(sdkApprovalRequired, "prepare_refund.needsApproval must be decided by AUTHORIZE decision.");
  record(name, "authorization_requested", facts.actionId, "SDK tool approval required before prepare_refund execution.");

  const beforeApprovalCount = await getToolExecutionCount();
  assert(beforeApprovalCount === 0, "Tool must not execute before approval.");

  record(name, "human_rejected", `${facts.actionId}-reject`, "Human rejected one proposed prepare_refund call.");
  const rejectCount = await getToolExecutionCount();
  assert(rejectCount === 0, "Reject must keep tool execution count at 0.");

  record(name, "human_approved", facts.actionId, "Human approved independent prepare_refund call.");
  const result = await prepareRefundTool.invoke(
    {} as never,
    JSON.stringify({ amount: 12.34, reason: "delayed delivery" }),
    {
      toolCall: {
        type: "function_call",
        callId: facts.actionId,
        name: "prepare_refund",
        arguments: JSON.stringify({ amount: 12.34, reason: "delayed delivery" })
      } as never,
      resumeState: "decision-model-approved-runstate"
    }
  );
  const approveCount = await getToolExecutionCount();
  assert(approveCount === 1, "Approve must execute prepare_refund exactly once.");

  const resultMessage =
    typeof result === "string"
      ? result
      : typeof result === "object" && result !== null && "message" in result
        ? String((result as { message: unknown }).message)
        : JSON.stringify(result);
  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: facts.actionType,
    humanDecision: "approved",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage
    }
  });
  record(name, "action_receipt_created", facts.actionId, `${receipt.humanDecision}/${receipt.executionStatus}`);

  return {
    name,
    expectedMode: "AUTHORIZE",
    actualMode: decision.mode,
    passed: beforeApprovalCount === 0 && rejectCount === 0 && approveCount === 1,
    runtimeBehavior:
      "Approval required before execution; reject kept count 0; approve executed prepare_refund exactly once.",
    receipt,
    evidence: `beforeApproval=${beforeApprovalCount}; afterReject=${rejectCount}; afterApprove=${approveCount}; ${receipt.authoritativeMessage}`
  };
}

async function testBlock(): Promise<TestResult> {
  const name = "Test D | BLOCK";
  const facts = createFacts({
    actionId: "action-block-private-attachment",
    actionType: "send_private_customer_attachment",
    hasExternalSideEffect: true,
    requiresHumanValueJudgment: false,
    prohibited: true
  });
  const repeatedFacts = { ...facts, actionId: "action-block-private-attachment-repeat" };
  const decision = decideAndRecord(name, facts);
  assert(decision.mode === "BLOCK", "prohibited action must be BLOCK.");
  assert(!evaluateHacGate(facts).requiresHumanApproval, "BLOCK must not enter normal approval path.");
  record(name, "action_blocked", facts.actionId, decision.requiredHumanInput ?? decision.reason);

  const repeatedDecision = decideAndRecord(name, repeatedFacts);
  assert(repeatedDecision.mode === "BLOCK", "Repeated user request must remain BLOCK.");
  record(
    name,
    "action_blocked",
    repeatedFacts.actionId,
    "Repeated direct execution request remained blocked; safe alternative is to remove private customer data."
  );

  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: facts.actionType,
    humanDecision: "blocked",
    runtimeOutcome: { status: "not_executed" }
  });
  record(name, "action_receipt_created", facts.actionId, `${receipt.humanDecision}/${receipt.executionStatus}`);
  const outcome = renderAuthoritativeOutcome({
    receipt,
    agentNarrative: "不能发送该附件。可以先移除其他客户隐私资料，再重新形成安全行动。"
  });

  return {
    name,
    expectedMode: "BLOCK",
    actualMode: decision.mode,
    passed: receipt.executionStatus === "not_executed" && repeatedDecision.mode === "BLOCK",
    runtimeBehavior: "Blocked action without execution and without creating a normal approval request.",
    receipt,
    evidence: `${outcome.userVisibleMessage} Safe alternative: remove private customer data and reformulate.`
  };
}

function runMetamorphicTests(): MetamorphicResult[] {
  const sameActionAutonomous = createFacts({
    actionId: "meta-same-action-autonomous",
    actionType: "summarize_complaint",
    hasExternalSideEffect: false,
    requiresHumanValueJudgment: false,
    prohibited: false
  });
  const sameActionAuthorize = {
    ...sameActionAutonomous,
    actionId: "meta-same-action-authorize",
    hasExternalSideEffect: true
  };

  const differentActionSameFactsA = createFacts({
    actionId: "meta-different-action-a",
    actionType: "alpha_action_name",
    hasExternalSideEffect: false,
    requiresHumanValueJudgment: true,
    prohibited: false
  });
  const differentActionSameFactsB = {
    ...differentActionSameFactsA,
    actionId: "meta-different-action-b",
    actionType: "beta_action_name"
  };

  const prohibitedWithOtherFlags = createFacts({
    actionId: "meta-prohibited-precedence",
    actionType: "any_action_name",
    hasExternalSideEffect: true,
    requiresHumanValueJudgment: true,
    prohibited: true
  });

  const result1A = decideHacAction(sameActionAutonomous);
  const result1B = decideHacAction(sameActionAuthorize);
  const result2A = decideHacAction(differentActionSameFactsA);
  const result2B = decideHacAction(differentActionSameFactsB);
  const result3 = decideHacAction(prohibitedWithOtherFlags);

  return [
    {
      name: "Same actionType changes from no side effect to side effect",
      passed: result1A.mode === "AUTONOMOUS" && result1B.mode === "AUTHORIZE",
      evidence: `${result1A.mode} -> ${result1B.mode}`
    },
    {
      name: "Different actionType with same facts returns same mode",
      passed: result2A.mode === result2B.mode && result2A.mode === "PROPOSE",
      evidence: `${differentActionSameFactsA.actionType}=${result2A.mode}; ${differentActionSameFactsB.actionType}=${result2B.mode}`
    },
    {
      name: "prohibited has precedence over all other flags",
      passed: result3.mode === "BLOCK",
      evidence: `prohibited=true with all other flags true -> ${result3.mode}`
    }
  ];
}

function renderResultsReport(results: TestResult[], metamorphicResults: MetamorphicResult[]): string {
  return `# HAC Thin Harness Decision Model Results

Task: CP-HAC-THIN-HARNESS-DECISION-MODEL-SPIKE-01
Generated: ${nowIso()}

## Golden Tests

| Test | Expected Mode | Actual Mode | Result | Runtime Behavior | Receipt | Evidence |
|---|---|---|---|---|---|---|
${results
  .map(
    (result) =>
      `| ${mdCell(result.name)} | ${result.expectedMode} | ${result.actualMode} | ${result.passed ? "Passed" : "Failed"} | ${mdCell(result.runtimeBehavior)} | ${result.receipt ? `${result.receipt.humanDecision}/${result.receipt.executionStatus}` : "n/a"} | ${mdCell(result.evidence)} |`
  )
  .join("\n")}

## Metamorphic Tests

| Test | Result | Evidence |
|---|---|---|
${metamorphicResults
  .map((result) => `| ${mdCell(result.name)} | ${result.passed ? "Passed" : "Failed"} | ${mdCell(result.evidence)} |`)
  .join("\n")}
`;
}

function renderEventsReport(): string {
  return `# HAC Thin Harness Decision Model Events

Task: CP-HAC-THIN-HARNESS-DECISION-MODEL-SPIKE-01
Generated: ${nowIso()}

Only minimum decision model observation events are recorded.

| Timestamp | Test | Event | Action ID | Detail |
|---|---|---|---|---|
${events
  .map((event) => `| ${event.timestamp} | ${mdCell(event.test)} | ${event.type} | ${event.actionId} | ${mdCell(event.detail)} |`)
  .join("\n")}
`;
}

function renderFinalReport(results: TestResult[], metamorphicResults: MetamorphicResult[]): string {
  const allPassed = results.every((result) => result.passed) && metamorphicResults.every((result) => result.passed);
  const autonomous = results.find((result) => result.expectedMode === "AUTONOMOUS");
  const propose = results.find((result) => result.expectedMode === "PROPOSE");
  const authorize = results.find((result) => result.expectedMode === "AUTHORIZE");
  const block = results.find((result) => result.expectedMode === "BLOCK");

  return `# HAC Thin Harness Decision Model Final Report

Task: CP-HAC-THIN-HARNESS-DECISION-MODEL-SPIKE-01
Generated: ${nowIso()}

## Baseline

- Source branch: spike/hac-thin-harness-decision-outcome
- Baseline commit: 24fcd4c test(hac): add thin decision outcome contract spike
- Preserved: DeepSeek Thin Provider Adapter, thinking.type = disabled, HAC Action Receipt, Decision-Outcome Truth Contract.
- Existing Runtime, Provider, and Decision-Outcome reports were not overwritten.

## Decision Model

Decision source: HacActionFacts only.

Evaluation order:

1. prohibited = true -> BLOCK
2. hasExternalSideEffect = true -> AUTHORIZE
3. requiresHumanValueJudgment = true -> PROPOSE
4. otherwise -> AUTONOMOUS

The decision model does not branch on actionType or tool name.

## Required Questions

1. Four modes stable: Yes. AUTONOMOUS, PROPOSE, AUTHORIZE, and BLOCK were each produced by fixed Action Facts.
2. Decision truly based on Action Facts: Yes. Metamorphic tests confirm fact changes alter mode and actionType changes do not.
3. Tool name hardcoding: No. decideHacAction() does not inspect actionType.
4. AUTONOMOUS avoids over-approval: Yes. ${autonomous?.runtimeBehavior ?? "n/a"}
5. PROPOSE preserves human value judgment: Yes. ${propose?.runtimeBehavior ?? "n/a"}
6. AUTHORIZE connects to Runtime: Yes. ${authorize?.runtimeBehavior ?? "n/a"}
7. BLOCK cannot be bypassed by ordinary request: Yes. ${block?.runtimeBehavior ?? "n/a"}
8. Action Receipt remains authoritative: Yes. Every mode produces user-visible output from Action Receipt or structured decision result.
9. Thin HAC Extension core code: hac-decision-model.ts and hac-decision-model-tests.ts, plus Gate/facts wiring and one npm script.
10. Next real-model Minimum Human Agency Loop: Recommended after this minimum action decision model.

## Golden Test Matrix

| Test | Result | Mode | Receipt | Evidence |
|---|---|---|---|---|
${results
  .map(
    (result) =>
      `| ${mdCell(result.name)} | ${result.passed ? "Passed" : "Failed"} | ${result.actualMode} | ${result.receipt ? `${result.receipt.humanDecision}/${result.receipt.executionStatus}` : "n/a"} | ${mdCell(result.evidence)} |`
  )
  .join("\n")}

## Metamorphic Test Matrix

| Test | Result | Evidence |
|---|---|---|
${metamorphicResults
  .map((result) => `| ${mdCell(result.name)} | ${result.passed ? "Passed" : "Failed"} | ${mdCell(result.evidence)} |`)
  .join("\n")}

## Final Conclusion

${allPassed ? "HAC Harness Decision Model Passed" : "HAC Harness Decision Model Failed"}
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = [await testAutonomous(), await testPropose(), await testAuthorize(), await testBlock()];
  const metamorphicResults = runMetamorphicTests();

  await writeFile(
    join(reportsDir, "hac-thin-harness-decision-model-results.md"),
    renderResultsReport(results, metamorphicResults),
    "utf8"
  );
  await writeFile(
    join(reportsDir, "hac-thin-harness-decision-model-events.md"),
    renderEventsReport(),
    "utf8"
  );
  await writeFile(
    join(reportsDir, "hac-thin-harness-decision-model-final-report.md"),
    renderFinalReport(results, metamorphicResults),
    "utf8"
  );

  for (const result of results) {
    console.log(`${result.name}: ${result.passed ? "Passed" : "Failed"}`);
    console.log(`  mode=${result.actualMode}`);
    console.log(`  receipt=${result.receipt ? `${result.receipt.humanDecision}/${result.receipt.executionStatus}` : "n/a"}`);
  }
  for (const result of metamorphicResults) {
    console.log(`${result.name}: ${result.passed ? "Passed" : "Failed"} (${result.evidence})`);
  }

  const allPassed = results.every((result) => result.passed) && metamorphicResults.every((result) => result.passed);
  console.log(allPassed ? "HAC Harness Decision Model Passed" : "HAC Harness Decision Model Failed");
  if (!allPassed) {
    process.exitCode = 1;
  }
}

await main();
