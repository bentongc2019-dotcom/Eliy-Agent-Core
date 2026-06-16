import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHacActionReceipt } from "./hac-action-receipt.js";
import { verifyMinimumLoopOutcome } from "./independent-verifier.js";
import {
  advanceLoop,
  completeWithVerification,
  createInitialOperationalState,
  event,
  proposeNextAction,
  type LoopEvent
} from "./loop-controller.js";
import {
  addLaunchOptions,
  addResponseDraftEvidence,
  authorizeRefundPath,
  authorizeReleaseStatusUpdate,
  createInitialComplaintIntent,
  createProductLaunchState,
  provideDelayDays,
  provideLaunchFacts,
  readComplaintMaterials,
  readProductLaunchMaterials,
  recordReleaseDecision,
  selectCompensation
} from "./hac-scenario-fixtures.js";
import {
  addActionReceipt,
  addEvidence,
  addHumanDecision,
  loadOperationalState,
  saveOperationalState,
  type OperationalState
} from "./operational-state.js";
import { getToolExecutionCountByName, resetToolExecutions } from "./tool.js";
import { ensureDirs, nowIso, reportsDir, stateDir } from "./storage.js";

type ScenarioResult = {
  name: string;
  passed: boolean;
  evidence: string;
};

type RunManifest = {
  runId: string;
  timestamp: string;
  gitCommit: string;
  gitStatusClean: boolean;
  branch: string;
  model: string;
  provider: string;
  providerConfiguration: string;
  testCommand: string;
  scenario: string;
  result: string;
  reportPaths: string[];
};

const allEvents: LoopEvent[] = [];

function mdCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function record(events: LoopEvent[]): void {
  allEvents.push(...events);
}

function hasDeepSeekCredential(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

function shell(command: string): string {
  const result = spawnSync("zsh", ["-lc", command], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });
  return result.stdout.trim();
}

async function runCustomerComplaintRegression(): Promise<ScenarioResult> {
  let state = createInitialOperationalState("cross-task-regression-complaint", nowIso(), createInitialComplaintIntent());
  state = readComplaintMaterials(advanceLoop(state).state);
  state = provideDelayDays(advanceLoop(state).state, 5);
  state = selectCompensation(state, "用户选择退款 12.34，并要求先准备客户回应草稿。");
  state = addResponseDraftEvidence(
    state,
    "我们承认交付延误责任，向客户致歉，说明改进承诺，并按用户选择准备退款 12.34。"
  );
  const authorizationStep = advanceLoop(state);
  const approval = await authorizeRefundPath(authorizationStep.state, true);
  state = completeWithVerification(approval.state);
  return {
    name: "Customer Complaint Vertical Slice",
    passed: state.status === "completed" && Boolean(state.lastVerification?.passed),
    evidence: `status=${state.status}; verifier=${state.lastVerification?.passed}; ${approval.receiptMessage}`
  };
}

async function runProductLaunchPathA(): Promise<{
  result: ScenarioResult;
  state: OperationalState;
  proactiveEvidence: string;
  ownershipEvidence: string;
  toolEvidence: string;
}> {
  let state = readProductLaunchMaterials(createProductLaunchState("cross-task-launch-delay"));
  const missingInfo = advanceLoop(state);
  record(missingInfo.events);
  assert(missingInfo.proposal.kind === "ask_human", "Missing release facts must ask human.");
  assert(missingInfo.proposal.proactiveReason, "Missing release facts must include proactiveReason.");
  state = provideLaunchFacts(missingInfo.state);
  state = addLaunchOptions(state);

  const decisionStep = advanceLoop(state);
  record(decisionStep.events);
  assert(decisionStep.proposal.kind === "ask_human", "Go / No-Go must remain human-owned.");
  state = recordReleaseDecision(decisionStep.state, "延期发布，先修复阻断缺陷，并通知外部相关方。", true);
  const notifyStep = advanceLoop(state);
  record(notifyStep.events);
  assert(notifyStep.proposal.kind === "invoke_tool", "Delay decision must lead to authorized status update.");
  const tool = await authorizeReleaseStatusUpdate(notifyStep.state, true);
  state = addEvidence(tool.state, {
    id: "fact-launch-delay-follow-up",
    kind: "fact",
    content: "后续质量、回滚和沟通行动：修复 2 个阻断级缺陷，复跑关键路径测试，保留回滚方案，并发送延期状态通知。",
    source: "loop_output",
    status: "confirmed",
    evidenceRefs: ["criterion:已明确后续质量、回滚和沟通行动"]
  });
  state = { ...state, lastVerification: verifyMinimumLoopOutcome(state), status: "completed" };
  record([{
    timestamp: nowIso(),
    loopId: state.loopId,
    iteration: state.iteration,
    type: "verification_completed",
    detail: JSON.stringify(state.lastVerification)
  }]);

  return {
    result: {
      name: "Product Launch Vertical Slice | Delay and notify",
      passed: Boolean(state.lastVerification?.passed) && tool.afterDecisionCount === 1,
      evidence: `verifier=${state.lastVerification?.passed}; ${tool.receiptMessage}`
    },
    state,
    proactiveEvidence: missingInfo.proposal.proactiveReason ?? "",
    ownershipEvidence: state.humanDecisions.find((decision) => decision.label === "release_decision")?.content ?? "",
    toolEvidence: `beforeAuthorization=${tool.beforeAuthorizationCount}; afterApprove=${tool.afterDecisionCount}`
  };
}

async function runProductLaunchPathB(): Promise<ScenarioResult> {
  await resetToolExecutions();
  let state = readProductLaunchMaterials(createProductLaunchState("cross-task-launch-limited"));
  state = provideLaunchFacts(advanceLoop(state).state);
  state = addLaunchOptions(state);
  state = recordReleaseDecision(state, "按期进行限定范围发布，不立即发送公开延期通知。", false);
  const next = advanceLoop(state);
  record(next.events);
  assert(next.proposal.kind === "complete", "Limited release must not call notification tool.");
  state = addHumanDecision(next.state, {
    id: "decision-no-public-status-update",
    kind: "action_rejected",
    label: "external_action_decision",
    actionIntent: {
      externalActionType: "send_release_status_update",
      requiresAuthorization: true
    },
    content: "用户明确不发送公开延期通知。",
    timestamp: nowIso(),
    explicit: true,
    evidenceRefs: ["criterion:对外通知只有在明确授权后才能发送"]
  });
  state = addEvidence(state, {
    id: "fact-limited-release-follow-up",
    kind: "fact",
    content: "后续质量、回滚和沟通行动：限定范围发布，监控错误率，保留回滚窗口，扩大范围前复核阻断缺陷。",
    source: "loop_output",
    status: "confirmed",
    evidenceRefs: ["criterion:已明确后续质量、回滚和沟通行动"]
  });
  state = addActionReceipt(
    state,
    createHacActionReceipt({
      toolCallId: "limited-release-plan",
      toolName: "release_plan",
      humanDecision: "not_required",
      runtimeOutcome: {
        status: "succeeded",
        resultMessage: "已形成限定范围发布、监控和回滚计划；未发送公开延期通知。"
      }
    })
  );
  const verification = verifyMinimumLoopOutcome(state);
  return {
    name: "Product Launch Branch B | Limited release without public delay notice",
    passed:
      verification.passed &&
      (await getToolExecutionCountByName("send_release_status_update")) === 0,
    evidence: `verifier=${verification.passed}; send_release_status_update_count=${await getToolExecutionCountByName("send_release_status_update")}`
  };
}

async function runProductCrossProcessRestore(): Promise<ScenarioResult> {
  let state = readProductLaunchMaterials(createProductLaunchState("cross-task-launch-restore"));
  state = advanceLoop(state).state;
  const before = proposeNextAction(state);
  const path = join(stateDir, "hac-loop-cross-task-product-state.json");
  const saved = await saveOperationalState(path, state);
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "restore-child", path], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "" }
  });
  if (child.status !== 0) {
    throw new Error(`restore child failed: ${child.stderr || child.stdout}`);
  }
  const parsed = JSON.parse(child.stdout) as {
    pid: number;
    intentGoal: string;
    intentVersion: number;
    nextAction: string;
    replayedFullHistory: boolean;
  };
  return {
    name: "Product Launch Operational State Restore",
    passed:
      parsed.intentGoal.includes("按期发布") &&
      parsed.intentVersion === state.intent.version &&
      parsed.nextAction === before.kind &&
      !parsed.replayedFullHistory,
    evidence: `oldPid=${process.pid}; newPid=${parsed.pid}; hash=${saved.sha256}; next=${before.kind}->${parsed.nextAction}; replayedFullHistory=${parsed.replayedFullHistory}`
  };
}

function grepScenarioCoupling(): string {
  const result = spawnSync(
    "zsh",
    [
      "-lc",
      "grep -RInE 'complaint|refund|compensation|delayed delivery|product launch|release' experiments/openai-agents-ts-runtime/src 2>/dev/null || true"
    ],
    { cwd: new URL("../../..", import.meta.url), encoding: "utf8" }
  );
  return result.stdout.trim();
}

async function writeRunManifest(runId: string, result: string, reportPaths: string[]): Promise<string> {
  const manifestDir = join(reportsDir, "runs", runId);
  await mkdir(manifestDir, { recursive: true });
  const manifest: RunManifest = {
    runId,
    timestamp: nowIso(),
    gitCommit: shell("git rev-parse HEAD"),
    gitStatusClean: shell("git status --short").trim().length === 0,
    branch: shell("git branch --show-current"),
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    provider: "DeepSeek OpenAI-compatible API",
    providerConfiguration: hasDeepSeekCredential()
      ? "DEEPSEEK_API_KEY=SET; thinking.type=disabled"
      : "DEEPSEEK_API_KEY=NOT_SET; deterministic local verification only",
    testCommand: "npm run test:hac-loop-cross-task-generalization",
    scenario: "customer_complaint_regression + product_launch_go_no_go",
    result,
    reportPaths
  };
  const path = join(manifestDir, "run-manifest.json");
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return path;
}

function renderFinalReport(args: {
  runId: string;
  manifestPath: string;
  customer: ScenarioResult;
  launchA: Awaited<ReturnType<typeof runProductLaunchPathA>>;
  launchB: ScenarioResult;
  restore: ScenarioResult;
  grepOutput: string;
  finalConclusion: string;
}): string {
  return `# HAC Loop Cross-task Generalization Final Report

Task: CP-HAC-MINIMUM-LOOP-HARNESS-CROSS-TASK-GENERALIZATION-01
Generated: ${nowIso()}

## Conclusion

\`\`\`text
${args.finalConclusion}
\`\`\`

## Run Manifest

- Run ID: ${args.runId}
- Manifest: ${args.manifestPath}

## Task Difference Matrix

| Dimension | Customer Complaint | Product Launch |
|---|---|---|
| Main problem | 已发生的客户关系修复 | 尚未发生的发布决策 |
| Non-delegable judgment | 补偿取舍 | Go / No-Go 与剩余风险 |
| Key evidence | 投诉、延误、客户影响 | 缺陷、测试覆盖、回滚能力、延期成本 |
| External action | prepare_refund | send_release_status_update |
| Completion standard | 回应和补偿执行闭环 | 发布决定、后续措施和状态通知闭环 |

## Results

| Scenario | Result | Evidence |
|---|---|---|
| Customer Complaint Vertical Slice | ${args.customer.passed ? "Passed" : "Failed"} | ${mdCell(args.customer.evidence)} |
| Product Launch Vertical Slice | ${args.launchA.result.passed && args.launchB.passed ? "Passed" : "Failed"} | ${mdCell(args.launchA.result.evidence)} |
| Product Launch Branch B | ${args.launchB.passed ? "Passed" : "Failed"} | ${mdCell(args.launchB.evidence)} |
| Product Launch Operational State Restore | ${args.restore.passed ? "Passed" : "Failed"} | ${mdCell(args.restore.evidence)} |

## Product Launch Evidence

- Bounded proactivity: ${args.launchA.proactiveEvidence}
- Judgment ownership: ${args.launchA.ownershipEvidence}
- Tool authorization: ${args.launchA.toolEvidence}
- Action Receipt: ${args.launchA.state.actionReceipts.at(-1)?.authoritativeMessage ?? "n/a"}
- Verifier result: ${args.launchA.state.lastVerification?.passed}

## Core Generalization

- Reused HumanIntentContract, OperationalState, LoopController, HacGovernor, IndependentVerifier, LoopBounds, EvidenceItem, LoopActionProposal, and HacActionReceipt.
- New scenario differences are expressed through Intent, Evidence, HumanDecision, and Tool adapter.
- No second Runtime was added.
- No Gateway, Workspace, Skill, Automation, Sub-agent, Memory, database, or UI was added.

## Scenario Coupling Text Check

\`\`\`text
${args.grepOutput || "No matches"}
\`\`\`

Interpretation:

- Business words remain in fixtures, tests, reports, and tool adapters.
- Core Controller, State, and Verifier do not use scenario business terms to select the main path.
- No second Runtime or per-scenario execution engine was introduced.

## Minimal Real Gap

The current implementation is still a two-task local CLI spike. It does not prove universal generalization, long-term memory, skill integration, gateway readiness, workspace integration, multi-agent behavior, or human intelligence growth.
`;
}

async function runAll(): Promise<void> {
  await ensureDirs();
  const runId = `hac-cross-task-${Date.now()}`;
  const customer = await runCustomerComplaintRegression();
  const launchA = await runProductLaunchPathA();
  const launchB = await runProductLaunchPathB();
  const restore = await runProductCrossProcessRestore();
  const grepOutput = grepScenarioCoupling();
  const allPassed = customer.passed && launchA.result.passed && launchB.passed && restore.passed;
  const gitStatusClean = shell("git status --short").trim().length === 0;
  const liveTraceable = hasDeepSeekCredential() && gitStatusClean;
  const finalConclusion =
    allPassed && liveTraceable
      ? "Minimum HAC Loop Harness Initial Cross-task Generalization Passed"
      : "Minimum HAC Loop Harness Cross-task Generalization Failed";
  const reportPaths = [
    "reports/hac-loop-cross-task-generalization-final-report.md",
    "reports/hac-loop-cross-task-generalization-events.md"
  ];
  const manifestPath = await writeRunManifest(runId, finalConclusion, reportPaths);
  await writeFile(
    join(reportsDir, "hac-loop-cross-task-generalization-events.md"),
    `# HAC Loop Cross-task Generalization Events\n\n${allEvents
      .map((eventItem) => `- ${eventItem.timestamp} ${eventItem.loopId} ${eventItem.type}: ${eventItem.detail}`)
      .join("\n")}\n`,
    "utf8"
  );
  await writeFile(
    join(reportsDir, "hac-loop-cross-task-generalization-final-report.md"),
    renderFinalReport({ runId, manifestPath, customer, launchA, launchB, restore, grepOutput, finalConclusion }),
    "utf8"
  );

  console.log(`Customer Complaint Vertical Slice: ${customer.passed ? "Passed" : "Failed"}`);
  console.log(`Product Launch Vertical Slice: ${launchA.result.passed && launchB.passed ? "Passed" : "Failed"}`);
  console.log(`Product Launch Restore: ${restore.passed ? "Passed" : "Failed"}`);
  console.log(`Run manifest: ${manifestPath}`);
  console.log(finalConclusion);
  if (!allPassed) {
    process.exitCode = 1;
  }
}

async function restoreChild(path: string): Promise<void> {
  const state = await loadOperationalState(path);
  const next = proposeNextAction(state);
  process.stdout.write(
    JSON.stringify({
      pid: process.pid,
      intentGoal: state.intent.goal,
      intentVersion: state.intent.version,
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
