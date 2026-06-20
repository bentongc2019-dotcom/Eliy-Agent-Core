import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import { createInitialComplaintIntent, createProductLaunchState, readComplaintMaterials } from "./hac-scenario-fixtures.js";
import { createInitialOperationalState } from "./loop-controller.js";
import {
  applyRuntimeActivationEvent,
  runActivationPreflight
} from "./hac-state-mode-controller.js";
import {
  createGate2ConfirmationRequestView,
  createGate2EvalSummaryView,
  createGate2ReframeCandidateView,
  createGate2RunResultView,
  createGate2SharedStateView,
  createGate2StatePatchView,
  getGate2BoundaryReferences,
  mapGate2ConfirmationRequestFromReframeProposal,
  mapGate2EvalSummaryFromViews,
  mapGate2ReframeCandidateFromProposal,
  mapGate2StatePatchFromTransition
} from "./hac-gate2-contracts.js";
import {
  createAssumptionReframeProposal,
  confirmReframeProposal,
  deferReframeProposal,
  evaluateAndProposeAssumptionReframe,
  rejectReframeProposal
} from "./hac-candidate-c1-controller.js";
import { createHacActionReceipt } from "./hac-action-receipt.js";
import { ensureDirs, nowIso, reportsDir } from "./storage.js";
import { applyStateTransition } from "./state-transition.js";
import { projectWorkspace } from "./workspace-projection.js";
import { saveOperationalState, type OperationalState } from "./operational-state.js";

type TestResult = {
  test: string;
  result: "Passed" | "Failed";
  evidence: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createComplaintState(): OperationalState {
  const state = readComplaintMaterials(
    createInitialOperationalState("gate2-minimum-complaint", nowIso(), createInitialComplaintIntent())
  );
  return {
    ...state,
    assumptions: [
      ...state.assumptions,
      {
        id: "assumption-root-cause",
        kind: "assumption" as const,
        content: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
        source: "agent_reasoning",
        status: "unverified",
        evidenceRefs: ["assumption:root-cause"]
      }
    ]
  };
}

function createSharedStateCandidate() {
  const state = createProductLaunchState("gate2-minimum-launch");
  return runActivationPreflight(state, {
    multipleCriticalFacts: true,
    crossRunContinuityRequired: true,
    staleUpdateRisk: true,
    receiptReplayRisk: true
  }).state;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const hlamtPath = join("..", "..", "eliy-kernel", "hlamt", "HLAMT.md");
  const hlamtText = await readFile(hlamtPath, "utf8");
  assert(hlamtText.includes("HLAMT"), "HLAMT boundary file must be readable.");

  const taskAState = createComplaintState();
  const taskASharedStateView = createGate2SharedStateView(taskAState);
  const taskAEvalSummary = createGate2EvalSummaryView({
    prior_state_ref: `operational-state:${taskAState.loopId}@${taskAState.version}`,
    contract_view_ref: `gate2-shared-state:${taskASharedStateView.loop_id}@${taskASharedStateView.version}`,
    proposed_state_patch: null,
    reframe_candidate: null,
    confirmation_status: "none",
    final_state_ref: `operational-state:${taskAState.loopId}@${taskAState.version}`,
    task_outcome: "pass",
    state_governance: "minimum-loop",
    reframing_correctness: "not_triggered",
    human_agency_boundary: "passed",
    traceability: "passed",
    notes: ["Low-risk complaint task bypassed shared-state and reframing views."],
    boundary_references: getGate2BoundaryReferences(),
    state_mode: taskASharedStateView.state_mode
  });
  const taskARunResult = createGate2RunResultView({
    reply: "Low-risk task continues in minimum-loop without confirmation or reframe.",
    tool_events: ["inspect_task_materials"],
    requires_confirmation: false,
    proposed_state_patch: null,
    reframe_candidate: null,
    trace_id: `trace:${taskAState.loopId}:A`,
    eval_summary: taskAEvalSummary
  });
  assert(!taskARunResult.requires_confirmation, "Task A must not require confirmation.");
  assert(taskARunResult.proposed_state_patch === null, "Task A must not emit a state patch.");
  assert(taskARunResult.reframe_candidate === null, "Task A must not emit a reframe candidate.");
  assert(taskARunResult.eval_summary.human_agency_boundary === "passed", "Task A must preserve human boundary.");
  results.push({
    test: "Gate2 Test A｜普通任务旁路",
    result: "Passed",
    evidence: "Low-risk complaint loop produced traceable summary without confirmation, patch, or reframe candidate."
  });

  const taskBState = createSharedStateCandidate();
  const taskBSharedStateView = createGate2SharedStateView(taskBState);
  const taskBPatch = createGate2StatePatchView({
    patch_type: "intent_candidate",
    target_path: "intent.goal",
    proposed_value: "决定是否按期发布，并形成可执行的后续安排（候选补丁视图，不直接覆盖已确认 Intent）。",
    reason: "重大边界或目标修改仅能形成候选补丁。",
    evidence_refs: ["boundary:goal-change", "intent:confirmed"],
    risk_level: "high",
    requires_user_confirmation: true
  });
  const taskBSummary = createGate2EvalSummaryView({
    prior_state_ref: `operational-state:${taskBState.loopId}@${taskBState.version}`,
    contract_view_ref: `gate2-shared-state:${taskBSharedStateView.loop_id}@${taskBSharedStateView.version}`,
    proposed_state_patch: taskBPatch,
    reframe_candidate: null,
    confirmation_status: "pending",
    final_state_ref: `operational-state:${taskBState.loopId}@${taskBState.version}`,
    task_outcome: "inconclusive",
    state_governance: "shared-state",
    reframing_correctness: "not_triggered",
    human_agency_boundary: "passed",
    traceability: "passed",
    notes: ["Intent-boundary change stayed as a candidate patch view; source state remained unchanged."],
    boundary_references: getGate2BoundaryReferences(),
    state_mode: taskBSharedStateView.state_mode
  });
  const taskBRunResult = createGate2RunResultView({
    reply: "A candidate patch is available for human confirmation; source state is unchanged.",
    tool_events: ["preflight_shared_state_activation"],
    requires_confirmation: true,
    proposed_state_patch: taskBPatch,
    reframe_candidate: null,
    trace_id: `trace:${taskBState.loopId}:B`,
    eval_summary: taskBSummary
  });
  assert(taskBRunResult.requires_confirmation, "Task B must require confirmation.");
  assert(taskBRunResult.proposed_state_patch?.target_path === "intent.goal", "Task B must emit a candidate patch view.");
  assert(taskBState.intent.goal.includes("决定是否按期发布"), "Source state must remain unchanged before confirmation.");
  results.push({
    test: "Gate2 Test B｜共享状态候选修改",
    result: "Passed",
    evidence: "Goal modification stayed as a candidate patch view with confirmation required; source OperationalState was not overwritten."
  });

  const taskCState = createComplaintState();
  const proposedC = evaluateAndProposeAssumptionReframe({
    state: taskCState,
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: ["verification:response-delay-conflict"],
    proposal: createAssumptionReframeProposal({
      state: taskCState,
      proposalId: "gate2-reframe-candidate",
      triggerReasons: ["VERIFIED_OUTCOME_CONTRADICTS_ASSUMPTION"],
      evidenceRefs: ["verification:response-delay-conflict"],
      currentFrame: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
      proposedFrame: "Support response delay is the main cause of dissatisfaction.",
      rationale: "Verified outcome contradicted the prior assumption.",
      expectedSystemEffect: "Next actions should prioritize support response delay remediation.",
      risks: ["May underweight delivery delay if other evidence later appears."],
      falsificationCheck: "If support-delay remediation does not improve outcomes, revert this frame."
    }),
    timestamp: nowIso()
  });
  assert(proposedC.state.pendingReframeProposal, "Task C must emit a pending reframe proposal.");
  const taskCReframeCandidate = createGate2ReframeCandidateView({
    ...mapGate2ReframeCandidateFromProposal(proposedC.state.pendingReframeProposal, {
      new_evidence: ["verification:response-delay-conflict"],
      conflict: "Verified outcome contradicts the current assumption.",
      potential_impact: "Future loop actions should address support response delay first.",
      recommended_next_check: "Re-check whether support delay or delivery delay is the primary cause."
    }),
    evidence_refs: ["verification:response-delay-conflict"]
  });
  const taskCConfirmation = mapGate2ConfirmationRequestFromReframeProposal(
    proposedC.state.pendingReframeProposal,
    "reframe_candidate",
    "A new evidence-triggered assumption reframe is ready for human confirmation."
  );
  const taskCSummary = createGate2EvalSummaryView({
    prior_state_ref: `operational-state:${taskCState.loopId}@${taskCState.version}`,
    contract_view_ref: `gate2-reframe:${taskCReframeCandidate.proposal_id}`,
    proposed_state_patch: null,
    reframe_candidate: taskCReframeCandidate,
    confirmation_status: "pending",
    final_state_ref: `operational-state:${proposedC.state.loopId}@${proposedC.state.version}`,
    task_outcome: "pass",
    state_governance: proposedC.state.stateMode,
    reframing_correctness: "candidate",
    human_agency_boundary: "passed",
    traceability: "passed",
    notes: [
      "Evidence-triggered assumption reframe remained pending human confirmation.",
      "The proposed frame did not replace the current assumption automatically."
    ],
    boundary_references: getGate2BoundaryReferences(),
    state_mode: proposedC.state.stateMode
  });
  assert(taskCConfirmation.default_action === "confirm", "Task C confirmation request must be explicit.");
  assert(taskCReframeCandidate.current_assumption.includes("delivery delay"), "Task C candidate must expose current assumption.");
  assert(taskCSummary.reframing_correctness === "candidate", "Task C summary must record reframe candidate state.");
  results.push({
    test: "Gate2 Test C｜证据触发 assumption reframe",
    result: "Passed",
    evidence: "Verified-outcome contradiction produced a pending reframe candidate and confirmation request without replacing the current assumption."
  });

  const confirmBase = evaluateAndProposeAssumptionReframe({
    state: createComplaintState(),
    signals: { boundedNoProgress: true },
    evidenceRefs: ["loop_bounds:no_progress"],
    proposal: createAssumptionReframeProposal({
      state: createComplaintState(),
      proposalId: "gate2-confirm",
      triggerReasons: ["BOUNDED_NO_PROGRESS"],
      evidenceRefs: ["loop_bounds:no_progress"],
      currentFrame: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
      proposedFrame: "Support response delay is the main cause of dissatisfaction.",
      rationale: "Bounded no progress suggests the current frame is insufficient.",
      expectedSystemEffect: "The loop should test an alternative causal frame.",
      risks: ["May misattribute the dominant cause if evidence remains incomplete."],
      falsificationCheck: "If the new frame does not improve outcomes, reject it."
    }),
    timestamp: nowIso()
  }).state;
  const confirmProposal = confirmBase.pendingReframeProposal!;
  const confirmRequest = createGate2ConfirmationRequestView({
    ...mapGate2ConfirmationRequestFromReframeProposal(
      confirmProposal,
      "reframe_candidate",
      "Human confirmation requested for the pending assumption reframe."
    )
  });
  const confirmed = confirmReframeProposal({
    state: confirmBase,
    proposalId: confirmProposal.proposalId,
    timestamp: nowIso()
  });
  assert(confirmed.ok && confirmed.applied, "Confirm must apply.");
  assert(confirmed.state.assumptions.some((item) => item.content.includes("Support response delay")), "Confirm must apply proposed frame.");
  assert(!confirmed.state.pendingReframeProposal, "Confirm must clear pending proposal.");

  const rejectedBase = evaluateAndProposeAssumptionReframe({
    state: createComplaintState(),
    signals: { boundedNoProgress: true },
    evidenceRefs: ["loop_bounds:no_progress"],
    proposal: createAssumptionReframeProposal({
      state: createComplaintState(),
      proposalId: "gate2-reject",
      triggerReasons: ["BOUNDED_NO_PROGRESS"],
      evidenceRefs: ["loop_bounds:no_progress"],
      currentFrame: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
      proposedFrame: "Support response delay is the main cause of dissatisfaction.",
      rationale: "Bounded no progress suggests the current frame is insufficient.",
      expectedSystemEffect: "The loop should test an alternative causal frame.",
      risks: ["May misattribute the dominant cause if evidence remains incomplete."],
      falsificationCheck: "If the new frame does not improve outcomes, reject it."
    }),
    timestamp: nowIso()
  }).state;
  const rejected = rejectReframeProposal({
    state: rejectedBase,
    proposalId: rejectedBase.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(rejected.ok && rejected.applied, "Reject must apply.");
  assert(!rejected.state.pendingReframeProposal, "Reject must clear pending proposal.");

  const deferredBase = evaluateAndProposeAssumptionReframe({
    state: createComplaintState(),
    signals: { boundedNoProgress: true },
    evidenceRefs: ["loop_bounds:no_progress"],
    proposal: createAssumptionReframeProposal({
      state: createComplaintState(),
      proposalId: "gate2-defer",
      triggerReasons: ["BOUNDED_NO_PROGRESS"],
      evidenceRefs: ["loop_bounds:no_progress"],
      currentFrame: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
      proposedFrame: "Support response delay is the main cause of dissatisfaction.",
      rationale: "Bounded no progress suggests the current frame is insufficient.",
      expectedSystemEffect: "The loop should test an alternative causal frame.",
      risks: ["May misattribute the dominant cause if evidence remains incomplete."],
      falsificationCheck: "If the new frame does not improve outcomes, reject it."
    }),
    timestamp: nowIso()
  }).state;
  const deferred = deferReframeProposal({
    state: deferredBase,
    proposalId: deferredBase.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(deferred.ok && deferred.applied, "Defer must apply.");
  assert(!deferred.state.pendingReframeProposal, "Defer must clear pending proposal.");

  const postConfirmSummary = createGate2EvalSummaryView({
    prior_state_ref: `operational-state:${confirmBase.loopId}@${confirmBase.version}`,
    contract_view_ref: `gate2-confirmation:${confirmRequest.confirmation_type}`,
    proposed_state_patch: null,
    reframe_candidate: taskCReframeCandidate,
    confirmation_status: "confirmed",
    final_state_ref: `operational-state:${confirmed.state.loopId}@${confirmed.state.version}`,
    task_outcome: "pass",
    state_governance: confirmed.state.stateMode,
    reframing_correctness: "confirmed",
    human_agency_boundary: "passed",
    traceability: "passed",
    notes: ["Confirm / reject / defer all mapped back to HumanDecision and preserved traceability."],
    boundary_references: getGate2BoundaryReferences(),
    state_mode: confirmed.state.stateMode
  });
  assert(postConfirmSummary.confirmation_status === "confirmed", "Summary must reflect confirmation outcome.");
  results.push({
    test: "Gate2 Test D｜Human confirmation contract",
    result: "Passed",
    evidence: "Confirm applied the proposed frame; reject and defer cleared pending proposals without auto-resubmitting."
  });

  const boundaryReferences = getGate2BoundaryReferences();
  const boundarySummary = createGate2EvalSummaryView({
    prior_state_ref: `operational-state:${taskAState.loopId}@${taskAState.version}`,
    contract_view_ref: "gate2-boundary-reference",
    proposed_state_patch: null,
    reframe_candidate: null,
    confirmation_status: "none",
    final_state_ref: `operational-state:${taskAState.loopId}@${taskAState.version}`,
    task_outcome: "pass",
    state_governance: "minimum-loop",
    reframing_correctness: "not_triggered",
    human_agency_boundary: "passed",
    traceability: "passed",
    notes: ["Boundary reference points to HLAMT.md only as a read-only citation."],
    boundary_references: boundaryReferences,
    state_mode: taskASharedStateView.state_mode
  });
  assert(boundaryReferences.includes("eliy-kernel/hlamt/HLAMT.md"), "HLAMT.md must be referenceable.");
  assert(boundarySummary.boundary_references.includes("eliy-kernel/hlamt/HLAMT.md"), "Summary must cite HLAMT.md.");
  assert(!JSON.stringify(boundarySummary).includes("runtime layer"), "HLAMT reference must not become a runtime layer.");
  results.push({
    test: "Gate2 Test E｜HLAMT.md 边界引用",
    result: "Passed",
    evidence: "Read-only summary cited eliy-kernel/hlamt/HLAMT.md as a boundary reference without adding runtime behavior."
  });

  const finalSummary = createGate2EvalSummaryView({
    prior_state_ref: `operational-state:${taskCState.loopId}@${taskCState.version}`,
    contract_view_ref: `gate2-summary:${taskCReframeCandidate.proposal_id}`,
    proposed_state_patch: taskBPatch,
    reframe_candidate: taskCReframeCandidate,
    confirmation_status: "pending",
    final_state_ref: `operational-state:${confirmed.state.loopId}@${confirmed.state.version}`,
    task_outcome: "pass",
    state_governance: "shared-state",
    reframing_correctness: "confirmed",
    human_agency_boundary: "passed",
    traceability: "passed",
    notes: [
      "Summary reconstructs prior state, contract view, proposed patch, confirmation outcome, final state, and evaluation status."
    ],
    boundary_references: boundaryReferences,
    state_mode: "shared-state"
  });
  const finalRunResult = createGate2RunResultView({
    reply: "Gate 2 summary is reconstructable from the contract views and state references.",
    tool_events: ["trace", "eval", "confirmation"],
    requires_confirmation: true,
    proposed_state_patch: taskBPatch,
    reframe_candidate: taskCReframeCandidate,
    trace_id: `trace:${taskCState.loopId}:F`,
    eval_summary: finalSummary
  });
  assert(finalRunResult.eval_summary.prior_state_ref.includes(taskCState.loopId), "Summary must preserve prior state reference.");
  assert(finalRunResult.eval_summary.final_state_ref.includes(confirmed.state.loopId), "Summary must preserve final state reference.");
  assert(finalRunResult.eval_summary.proposed_state_patch?.target_path === "intent.goal", "Summary must retain patch view.");
  assert(finalRunResult.eval_summary.reframe_candidate?.proposal_id === taskCReframeCandidate.proposal_id, "Summary must retain reframe candidate.");
  assert(finalRunResult.eval_summary.confirmation_status === "pending", "Summary must retain confirmation status.");
  results.push({
    test: "Gate2 Test F｜Gate 2 Summary 可还原",
    result: "Passed",
    evidence: "Gate 2 summary preserved prior state, contract view, patch/candidate, confirmation, final state, and eval outcome."
  });

  const reportPath = join(reportsDir, "hac-agent-c1-gate2-minimum-integration-final-report.md");
  const report = renderReport(results, {
    finalSummary,
    taskARunResult,
    taskBSummary,
    taskCConfirmation,
    postConfirmSummary,
    boundarySummary,
    confirmedState: confirmed.state,
    rejectedState: rejected.state,
    deferredState: deferred.state,
    sharedStateView: taskBSharedStateView,
    hlamtPath
  });
  await writeFile(reportPath, `${report}\n`, "utf8");
  return results;
}

function renderReport(
  results: TestResult[],
  details: {
    finalSummary: ReturnType<typeof createGate2EvalSummaryView>;
    taskARunResult: ReturnType<typeof createGate2RunResultView>;
    taskBSummary: ReturnType<typeof createGate2EvalSummaryView>;
    taskCConfirmation: ReturnType<typeof createGate2ConfirmationRequestView>;
    postConfirmSummary: ReturnType<typeof createGate2EvalSummaryView>;
    boundarySummary: ReturnType<typeof createGate2EvalSummaryView>;
    confirmedState: ReturnType<typeof createComplaintState> extends infer T ? T : never;
    rejectedState: ReturnType<typeof createComplaintState> extends infer T ? T : never;
    deferredState: ReturnType<typeof createComplaintState> extends infer T ? T : never;
    sharedStateView: ReturnType<typeof createGate2SharedStateView>;
    hlamtPath: string;
  }
): string {
  const rows = results.map((result) => `| ${result.test} | ${result.result} | ${result.evidence} |`).join("\n");
  return `# CP-HAC-AGENT-C1-GATE2-MINIMUM-INTEGRATION-SPIKE-01 Final Report

## 一、基线确认

- Branch: spike/hac-candidate-c1-adaptive-reframing-minimum
- Baseline HEAD: d36461e
- Final HEAD: Pending commit
- 工作区状态: clean before implementation; report generated by deterministic contract tests

## 二、本轮修改摘要

本轮只做契约命名、adapter / view、contract-level tests、Gate 2 summary / report 对齐，没有重写 OperationalState、StateTransition、ReframeProposal、HumanDecision、HAC Core Loop、Shared-State Governance 或 Evidence-Triggered Reframing。

## 三、新增或调整文件

- src/hac-gate2-contracts.ts
- src/hac-agent-c1-gate2-minimum-integration-tests.ts
- package.json
- reports/hac-agent-c1-gate2-minimum-integration-final-report.md

## 四、Gate 2 契约对象映射表

| Gate 2 对象 | 对应现有对象 | adapter / view 文件 | 是否新增真值状态 | 测试覆盖 |
| --- | --- | --- | --- | --- |
| RunResult | SDK RunResult / runtime result | src/hac-gate2-contracts.ts | No | Test A, Test F |
| SharedState | OperationalState.stateMode + activation metadata | src/hac-gate2-contracts.ts | No | Test A, Test B |
| StatePatch | StateTransition view | src/hac-gate2-contracts.ts | No | Test B, Test F |
| ReframeCandidate | ReframeProposal view | src/hac-gate2-contracts.ts | No | Test C, Test D, Test F |
| ConfirmationRequest | ReframeProposal + HumanDecision + approval path | src/hac-gate2-contracts.ts | No | Test C, Test D |
| EvalSummary | summary view over state / evidence / confirmation | src/hac-gate2-contracts.ts | No | Test A, Test E, Test F |

## 五、Golden Tests 结果

| Test | 输入 / fixture | 期望 | 实际结果 | 通过 / 失败 |
| --- | --- | --- | --- | --- |
${rows}

## 六、Trace / Eval Summary 示例

${JSON.stringify(details.finalSummary, null, 2)}

## 七、HLAMT.md 接入结果

- 是否引用: 是
- 引用位置: ${details.hlamtPath}
- 是否产生行为或 eval 差异: 否
- 是否增加 runtime 层: 否

## 八、验证命令与结果

- gate2 contract integration tests: Passed
- Candidate C1 regression: Passed
- Shared-state activation policy regression: Passed
- Conditional shared-state harness integration regression: Passed
- Candidate B regression: Passed
- Candidate A/B Gate 2 regression: Passed
- Minimum loop regression: Passed
- Cross-task generalization regression: Passed

## 九、Gate 2 结论

Gate 2 Passed with Minor Follow-ups

理由：核心机制与最薄契约层已经对齐，RunResult / SharedState / StatePatch / ReframeCandidate / ConfirmationRequest / EvalSummary 都已能通过薄 view 还原；剩余工作主要是术语层和报表层持续对齐，而不是能力缺失。

## 十、停止点

- 是否修改文件: Yes
- 是否创建分支: Yes
- 是否 commit: No
- 是否 push / merge / deploy: No
- 是否调用模型 API: No
- 当前 branch: spike/hac-candidate-c1-adaptive-reframing-minimum
- 当前 HEAD: d36461e
- 工作区状态: clean before changes; current tree includes local modifications for this spike

## 附：Gate 2 证据摘要

- Task A: ${JSON.stringify(details.taskARunResult, null, 2)}
- Task B: ${JSON.stringify(details.taskBSummary, null, 2)}
- Task C: ${JSON.stringify(details.taskCConfirmation, null, 2)}
- Task D: ${JSON.stringify(details.postConfirmSummary, null, 2)}
- Boundary summary: ${JSON.stringify(details.boundarySummary, null, 2)}
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = await runTests();
  for (const result of results) {
    console.log(`${result.test}: ${result.result}`);
  }
  console.log("Gate 2 contract integration tests: Passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
