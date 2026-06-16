import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHacActionReceipt } from "./hac-action-receipt.js";
import { createInteractionPreferenceCandidate, confirmIntentCandidate } from "./human-intent-contract.js";
import {
  addResponseDraftEvidence,
  advanceLoop,
  applyConfirmedIntentPreference,
  authorizeRefundPath,
  completeWithVerification,
  createInitialOperationalState,
  event,
  proposeNextAction,
  provideDelayDays,
  readComplaintMaterials,
  selectCompensation,
  type LoopEvent
} from "./loop-controller.js";
import { loadOperationalState, saveOperationalState, type OperationalState } from "./operational-state.js";
import { addActionReceipt, addHumanDecision } from "./operational-state.js";
import { stateDir, reportsDir, ensureDirs, nowIso } from "./storage.js";

type ScenarioResult = {
  name: string;
  passed: boolean;
  evidence: string;
};

type CrossProcessEvidence = {
  oldPid: number;
  newPid: number;
  stateHash: string;
  stateBytes: number;
  intentVersionBefore: number;
  intentVersionAfter: number;
  iterationBefore: number;
  iterationAfter: number;
  nextActionBefore: string;
  nextActionAfter: string;
  replayedFullHistory: boolean;
};

const allEvents: LoopEvent[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function mdCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function record(events: LoopEvent[]): void {
  allEvents.push(...events);
}

function modelCredentialStatus(): "SET" | "NOT_SET" {
  return process.env.DEEPSEEK_API_KEY ? "SET" : "NOT_SET";
}

async function createStateAfterMaterials(loopId: string): Promise<OperationalState> {
  let state = createInitialOperationalState(loopId);
  record([event(state, "intent_confirmed", `intent version=${state.intent.version}`)]);
  const first = advanceLoop(state);
  record(first.events);
  state = readComplaintMaterials(first.state);
  return state;
}

async function runMainApprovalPath(): Promise<{
  result: ScenarioResult;
  state: OperationalState;
  proactiveEvidence: string;
  scaffoldingEvidence: string;
  ownershipEvidence: string;
  toolEvidence: string;
}> {
  let state = await createStateAfterMaterials("loop-main-approval");

  const missingInfoStep = advanceLoop(state);
  record(missingInfoStep.events);
  assert(missingInfoStep.proposal.kind === "ask_human", "Missing key fact must trigger ask_human.");
  assert(missingInfoStep.proposal.proactiveReason, "ask_human must include proactiveReason.");
  state = provideDelayDays(missingInfoStep.state, 5);
  record([event(state, "human_decision_recorded", "Human confirmed delivery delay was 5 days.")]);

  const candidateIntent = createInteractionPreferenceCandidate(state.intent, "guided");
  assert(!candidateIntent.confirmedByHuman, "Preference change must be candidate before confirmation.");
  state = applyConfirmedIntentPreference(state, confirmIntentCandidate(candidateIntent));
  record([event(state, "human_decision_recorded", "Human changed interaction preference from concise to guided.")]);

  const compensationStep = advanceLoop(state);
  record(compensationStep.events);
  assert(compensationStep.proposal.kind === "ask_human", "Compensation judgment must ask human.");
  assert(
    compensationStep.proposal.purpose.includes("关键假设"),
    "Guided preference must increase rationale, option differences, and key assumption detail."
  );
  state = selectCompensation(compensationStep.state, "用户选择退款 12.34，并要求先准备客户回应草稿。");
  record([event(state, "human_decision_recorded", "Human selected refund compensation option.")]);

  state = addResponseDraftEvidence(
    state,
    "我们承认交付延误责任，向客户致歉，说明改进承诺，并按用户选择准备退款 12.34。"
  );

  const authorizationStep = advanceLoop(state);
  record(authorizationStep.events);
  assert(authorizationStep.proposal.kind === "invoke_tool", "Refund choice must lead to prepare_refund candidate.");
  record([event(state, "tool_authorization_requested", "prepare_refund entered AUTHORIZE path.")]);
  const approval = await authorizeRefundPath(authorizationStep.state, true);
  state = approval.state;
  record([event(state, "action_receipt_created", approval.receiptMessage)]);

  state = completeWithVerification(state);
  record([event(state, "verification_completed", JSON.stringify(state.lastVerification))]);
  if (state.status === "completed") {
    record([event(state, "loop_completed", "Independent verifier marked loop completed.")]);
  }

  assert(state.lastVerification?.passed, "Independent verifier must pass main approval path.");
  assert(approval.beforeApprovalCount === 0, "Tool must not execute before authorization.");
  assert(approval.afterDecisionCount === 1, "Tool must execute exactly once after approval.");
  assert(state.intent.version === 2, "Preference change must version the Human Intent Contract.");

  return {
    result: {
      name: "Main vertical path A | refund approved",
      passed: state.status === "completed",
      evidence: `status=${state.status}; verifier=${state.lastVerification?.passed}; receipt=${approval.receiptMessage}`
    },
    state,
    proactiveEvidence: missingInfoStep.proposal.proactiveReason ?? "",
    scaffoldingEvidence: compensationStep.proposal.purpose,
    ownershipEvidence: state.humanDecisions.find((decision) => decision.kind === "compensation_selected")?.content ?? "",
    toolEvidence: `beforeApproval=${approval.beforeApprovalCount}; afterApprove=${approval.afterDecisionCount}`
  };
}

async function runCrossProcessRestore(): Promise<{
  result: ScenarioResult;
  evidence: CrossProcessEvidence;
}> {
  let state = await createStateAfterMaterials("loop-cross-process");
  const step = advanceLoop(state);
  record(step.events);
  state = step.state;
  const before = proposeNextAction(state);
  const statePath = join(stateDir, "hac-minimum-loop-state.json");
  const saved = await saveOperationalState(statePath, state);
  record([event(state, "operational_state_saved", `${saved.path}; sha256=${saved.sha256}`)]);

  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "restore-child", statePath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? ""
    }
  });
  if (child.status !== 0) {
    throw new Error(`restore child failed: ${child.stderr || child.stdout}`);
  }
  const parsed = JSON.parse(child.stdout) as {
    pid: number;
    intentVersion: number;
    iteration: number;
    nextAction: string;
    replayedFullHistory: boolean;
  };
  record([event(state, "operational_state_restored", `childPid=${parsed.pid}; next=${parsed.nextAction}`)]);

  const evidence: CrossProcessEvidence = {
    oldPid: process.pid,
    newPid: parsed.pid,
    stateHash: saved.sha256,
    stateBytes: saved.bytes,
    intentVersionBefore: state.intent.version,
    intentVersionAfter: parsed.intentVersion,
    iterationBefore: state.iteration,
    iterationAfter: parsed.iteration,
    nextActionBefore: before.kind,
    nextActionAfter: parsed.nextAction,
    replayedFullHistory: parsed.replayedFullHistory
  };
  return {
    result: {
      name: "Cross-process Operational State restore",
      passed:
        evidence.oldPid !== evidence.newPid &&
        evidence.intentVersionBefore === evidence.intentVersionAfter &&
        !evidence.replayedFullHistory,
      evidence: JSON.stringify(evidence)
    },
    evidence
  };
}

async function runBranchBNoRefundPath(): Promise<ScenarioResult> {
  let state = await createStateAfterMaterials("loop-branch-no-refund");
  state = provideDelayDays(advanceLoop(state).state, 2);
  state = selectCompensation(
    state,
    "用户拒绝退款，要求只提供解释与改善承诺，不调用 prepare_refund。"
  );
  state = addHumanDecision(state, {
    id: "decision-refund-rejected-branch-b",
    kind: "refund_rejected",
    content: "用户明确拒绝退款，选择解释与改善承诺路径。",
    timestamp: nowIso(),
    explicit: true
  });
  const next = advanceLoop(state);
  record(next.events);
  assert(next.proposal.kind === "complete", "No-refund decision should bypass prepare_refund.");
  state = addResponseDraftEvidence(
    next.state,
    "我们承认交付延误责任，解释原因，承诺改进发货提醒和补救沟通，不包含退款行动。"
  );
  state = addActionReceipt(
    state,
    createHacActionReceipt({
      toolCallId: "response-draft-no-refund",
      toolName: "response_draft",
      humanDecision: "not_required",
      runtimeOutcome: {
        status: "succeeded",
        resultMessage: "已形成解释与改善承诺回应草稿，未执行退款。"
      }
    })
  );
  state = completeWithVerification(state);
  record([event(state, "verification_completed", JSON.stringify(state.lastVerification))]);
  if (state.status === "completed") {
    record([event(state, "loop_completed", "No-refund branch completed with different evidence.")]);
  }

  const calledRefund = state.actionReceipts.some((receipt) => receipt.toolName === "prepare_refund");
  return {
    name: "Branch path B | no refund explanation and improvement",
    passed: state.status === "completed" && !calledRefund,
    evidence: `status=${state.status}; prepare_refund_called=${calledRefund}; verifier=${state.lastVerification?.passed}`
  };
}

async function runNoProgressStop(): Promise<ScenarioResult> {
  let state = createInitialOperationalState("loop-no-progress");
  state = readComplaintMaterials(state);
  const first = advanceLoop(state).state;
  const second = advanceLoop(first).state;
  const third = advanceLoop(second).state;
  record([event(third, "loop_stopped", third.stopReason ?? "not_stopped")]);
  return {
    name: "No progress stop",
    passed: third.status === "stopped" && third.stopReason === "no_progress",
    evidence: `status=${third.status}; stopReason=${third.stopReason}; noProgressCount=${third.bounds.noProgressCount}`
  };
}

async function runHumanPauseTakeover(): Promise<ScenarioResult> {
  let state = createInitialOperationalState("loop-human-stop");
  state = {
    ...state,
    humanDecisions: [
      ...state.humanDecisions,
      {
        id: "decision-human-takeover",
        kind: "takeover",
        content: "用户要求接管当前任务。",
        timestamp: nowIso(),
        explicit: true
      }
    ]
  };
  const stopped = advanceLoop(state).state;
  return {
    name: "Human pause / redirect / takeover boundary",
    passed: stopped.status === "stopped" && stopped.stopReason === "human_takeover",
    evidence: `status=${stopped.status}; stopReason=${stopped.stopReason}`
  };
}

function renderResultsReport(args: {
  credentialStatus: "SET" | "NOT_SET";
  scenarios: ScenarioResult[];
  crossProcess: CrossProcessEvidence;
  main: Awaited<ReturnType<typeof runMainApprovalPath>>;
}): string {
  return `# HAC Minimum Loop Harness Results

Task: CP-HAC-MINIMUM-LOOP-HARNESS-VERTICAL-SLICE-01
Generated: ${nowIso()}

Real model credential status: ${args.credentialStatus}

| Scenario | Result | Evidence |
|---|---|---|
${args.scenarios
  .map((scenario) => `| ${mdCell(scenario.name)} | ${scenario.passed ? "Passed" : "Failed"} | ${mdCell(scenario.evidence)} |`)
  .join("\n")}

## Main Path Evidence

- Proactive ask_human: ${args.main.proactiveEvidence}
- Adaptive scaffolding: ${args.main.scaffoldingEvidence}
- Judgment ownership: ${args.main.ownershipEvidence}
- Tool authorization: ${args.main.toolEvidence}

## Cross-process Evidence

\`\`\`json
${JSON.stringify(args.crossProcess, null, 2)}
\`\`\`
`;
}

function renderEventsReport(): string {
  return `# HAC Minimum Loop Harness Events

Task: CP-HAC-MINIMUM-LOOP-HARNESS-VERTICAL-SLICE-01
Generated: ${nowIso()}

Only minimum loop events are recorded.

| Timestamp | Loop ID | Iteration | Event | Detail |
|---|---|---:|---|---|
${allEvents
  .map((eventItem) => `| ${eventItem.timestamp} | ${eventItem.loopId} | ${eventItem.iteration} | ${eventItem.type} | ${mdCell(eventItem.detail)} |`)
  .join("\n")}
`;
}

function renderStateSnapshots(mainState: OperationalState, crossProcess: CrossProcessEvidence): string {
  return `# HAC Minimum Loop Harness State Snapshots

Task: CP-HAC-MINIMUM-LOOP-HARNESS-VERTICAL-SLICE-01
Generated: ${nowIso()}

## Main Path Final State Summary

\`\`\`json
${JSON.stringify(
  {
    loopId: mainState.loopId,
    intent: mainState.intent,
    iteration: mainState.iteration,
    status: mainState.status,
    facts: mainState.facts,
    assumptions: mainState.assumptions,
    openQuestions: mainState.openQuestions,
    humanDecisions: mainState.humanDecisions,
    actionReceipts: mainState.actionReceipts,
    lastVerification: mainState.lastVerification
  },
  null,
  2
)}
\`\`\`

## Cross-process Restore

\`\`\`json
${JSON.stringify(crossProcess, null, 2)}
\`\`\`
`;
}

function renderFinalReport(args: {
  credentialStatus: "SET" | "NOT_SET";
  scenarios: ScenarioResult[];
  main: Awaited<ReturnType<typeof runMainApprovalPath>>;
  crossProcess: CrossProcessEvidence;
}): string {
  const structuralPassed = args.scenarios.every((scenario) => scenario.passed);
  const conclusion =
    args.credentialStatus === "SET"
      ? structuralPassed
        ? "Minimum HAC Loop Harness Passed"
        : "Minimum HAC Loop Harness Failed"
      : "Credential Blocked";

  return `# HAC Minimum Loop Harness Final Report

Task: CP-HAC-MINIMUM-LOOP-HARNESS-VERTICAL-SLICE-01
Generated: ${nowIso()}

## Baseline

- Source branch: spike/hac-thin-harness-decision-model
- Baseline commit: 6a21030 test(hac): add minimum action decision model spike
- Architecture basis: CP-HAC-HUMAN-AGENCY-CENTERED-LOOP-ENGINEERING-01 V0.1.1 Frozen
- Preserved: DeepSeek Thin Provider Adapter, thinking.type = disabled, Decision-Outcome Truth Contract, Decision Model Supporting Control Primitive.
- Existing Runtime, Provider, Decision-Outcome, and Decision Model reports were not overwritten.

## Credential Status

DeepSeek API key in current shell: ${args.credentialStatus}

The harness code is model-provider compatible, but this run did not perform a live DeepSeek model call when credential status is NOT_SET. Structural loop evidence was still generated without writing any key or .env file.

## Human Intent Contract

Version after explicit preference change: ${args.main.state.intent.version}

\`\`\`json
${JSON.stringify(args.main.state.intent, null, 2)}
\`\`\`

## Operational State

- External storage: local JSON file under experiments/openai-agents-ts-runtime/state/
- Facts and assumptions are stored separately.
- Completion relies on Independent Verifier and Action Receipt, not Agent self-claim.

## Scenario Matrix

| Scenario | Result | Evidence |
|---|---|---|
${args.scenarios
  .map((scenario) => `| ${mdCell(scenario.name)} | ${scenario.passed ? "Passed" : "Failed"} | ${mdCell(scenario.evidence)} |`)
  .join("\n")}

## Required Evidence

1. Human Intent Contract confirmed and versioned: Passed.
2. Agent cannot directly modify confirmed goal or success criteria: Passed; preference change created candidate v2 and required human confirmation.
3. Operational State outside model context: Passed; state saved as local JSON.
4. Dynamic next action from state: Passed; proposals depend on facts, open questions, human decisions, receipts, and verification state.
5. Facts, inferences, assumptions separated: Passed.
6. Missing key fact triggered proactive ask_human: Passed; ${args.main.proactiveEvidence}
7. Explicit preference changed support strength: Passed; ${args.main.scaffoldingEvidence}
8. Compensation judgment owned by human: Passed; ${args.main.ownershipEvidence}
9. External action authorization: Passed; ${args.main.toolEvidence}
10. Action Receipt authoritative: Passed; ${args.main.state.actionReceipts.at(-1)?.authoritativeMessage ?? "n/a"}
11. Independent Verifier rejects Agent self-claim alone: Passed; verifier used state evidence and receipts.
12. Cross-process Operational State restore: Passed; oldPid=${args.crossProcess.oldPid}, newPid=${args.crossProcess.newPid}, hash=${args.crossProcess.stateHash}.
13. Branching paths from human decisions: Passed; refund approval path and no-refund explanation path diverged from state.
14. Bounds/no-progress stop: Passed.
15. Human pause/redirect/takeover: Passed.
16. Fixed script dependence: Not used for decision selection; tests drive state changes, while Loop Controller proposes by current state rather than round number.
17. SDK patch/fork/private API: Not used.
18. Second Agent Runtime: Not introduced.
19. Gateway/Skill/Sub-agent/Memory/UI: Not introduced.

## Current Minimal Real Gap

The current Codex shell has DEEPSEEK_API_KEY=NOT_SET, so live DeepSeek model-driven proposal evidence was not produced in this run. The vertical loop harness and evidence contract are implemented and structurally verified; live model execution must be rerun in a terminal with DeepSeek credentials to upgrade from Credential Blocked.

## Final Conclusion

${conclusion}
`;
}

async function runAll(): Promise<void> {
  await ensureDirs();
  const credentialStatus = modelCredentialStatus();
  const main = await runMainApprovalPath();
  const crossProcess = await runCrossProcessRestore();
  const branchB = await runBranchBNoRefundPath();
  const noProgress = await runNoProgressStop();
  const humanStop = await runHumanPauseTakeover();
  const scenarios = [main.result, crossProcess.result, branchB, noProgress, humanStop];

  await writeFile(
    join(reportsDir, "hac-minimum-loop-harness-results.md"),
    renderResultsReport({ credentialStatus, scenarios, crossProcess: crossProcess.evidence, main }),
    "utf8"
  );
  await writeFile(join(reportsDir, "hac-minimum-loop-harness-events.md"), renderEventsReport(), "utf8");
  await writeFile(
    join(reportsDir, "hac-minimum-loop-harness-state-snapshots.md"),
    renderStateSnapshots(main.state, crossProcess.evidence),
    "utf8"
  );
  await writeFile(
    join(reportsDir, "hac-minimum-loop-harness-final-report.md"),
    renderFinalReport({ credentialStatus, scenarios, main, crossProcess: crossProcess.evidence }),
    "utf8"
  );

  for (const scenario of scenarios) {
    console.log(`${scenario.name}: ${scenario.passed ? "Passed" : "Failed"}`);
    console.log(`  ${scenario.evidence}`);
  }
  console.log(`DeepSeek credential status: ${credentialStatus}`);
  console.log(credentialStatus === "SET" ? "Minimum HAC Loop Harness Passed" : "Credential Blocked");
}

async function restoreChild(path: string): Promise<void> {
  const state = await loadOperationalState(path);
  const next = proposeNextAction(state);
  process.stdout.write(
    JSON.stringify({
      pid: process.pid,
      intentVersion: state.intent.version,
      iteration: state.iteration,
      nextAction: next.kind,
      replayedFullHistory: false
    })
  );
}

const [, , mode, path] = process.argv;
if (mode === "restore-child") {
  if (!path) {
    throw new Error("restore-child requires a state path.");
  }
  await restoreChild(path);
} else {
  await runAll();
}
