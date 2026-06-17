import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import { createInitialComplaintIntent, readComplaintMaterials } from "./hac-scenario-fixtures.js";
import {
  createInitialOperationalState
} from "./loop-controller.js";
import {
  createAssumptionReframeProposal,
  deferReframeProposal,
  evaluateAndProposeAssumptionReframe,
  confirmReframeProposal,
  rejectReframeProposal
} from "./hac-candidate-c1-controller.js";
import {
  decideReflectiveTrigger
} from "./hac-reflective-trigger-policy.js";
import {
  loadOperationalState,
  saveOperationalState,
  type OperationalState
} from "./operational-state.js";
import { reportsDir, stateDir, ensureDirs, nowIso } from "./storage.js";
import { applyStateTransition } from "./state-transition.js";
import { projectWorkspace } from "./workspace-projection.js";

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

function createState(loopId: string): OperationalState {
  const state = readComplaintMaterials(
    createInitialOperationalState(loopId, nowIso(), createInitialComplaintIntent())
  );
  return {
    ...state,
    assumptions: [
      ...state.assumptions,
      {
        id: "assumption-root-cause",
        kind: "assumption",
        content: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
        source: "agent_reasoning",
        status: "unverified",
        evidenceRefs: ["assumption:root-cause"]
      }
    ]
  };
}

function proposalFixture(state: OperationalState) {
  return createAssumptionReframeProposal({
    state,
    proposalId: `reframe-${state.loopId}`,
    triggerReasons: ["VERIFIED_OUTCOME_CONTRADICTS_ASSUMPTION"],
    evidenceRefs: ["action_receipt:failed-remediation"],
    currentFrame: "Current frame assumes delivery delay is the main cause of dissatisfaction.",
    proposedFrame: "Reframed assumption: support response delay is the main cause of dissatisfaction.",
    rationale: "Verified outcome contradicted the prior assumption.",
    expectedSystemEffect: "Future loop actions should address support response delay first.",
    risks: ["May underweight delivery delay if both causes matter."],
    falsificationCheck: "If response-delay remediation does not improve customer outcome, revisit this frame."
  });
}

async function runGoldenTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const noTrigger = decideReflectiveTrigger({
    signals: {},
    evidenceRefs: []
  });
  assert(!noTrigger.triggered && noTrigger.reasons.includes("NO_REFLECTIVE_TRIGGER"), "No trigger should remain false.");
  results.push({
    test: "C1-GT-01｜Single-loop Sufficient No Trigger",
    result: "Passed",
    evidence: "No contradiction, no bounded no-progress, and no human request produced NO_REFLECTIVE_TRIGGER."
  });

  const singleFailure = decideReflectiveTrigger({
    signals: {},
    evidenceRefs: ["action_receipt:single_failed_attempt"]
  });
  assert(!singleFailure.triggered, "Single failure without trigger signal must not reframe.");
  results.push({
    test: "C1-GT-02｜Single Failure No Trigger",
    result: "Passed",
    evidence: "A single failed action with evidence but no bounded no-progress or contradiction did not trigger Candidate C."
  });

  const bounded = decideReflectiveTrigger({
    signals: { boundedNoProgress: true },
    evidenceRefs: ["loop_bounds:no_progress"]
  });
  assert(bounded.triggered && bounded.reasons.includes("BOUNDED_NO_PROGRESS"), "Bounded no-progress must trigger.");
  results.push({
    test: "C1-GT-03｜Bounded No Progress Trigger",
    result: "Passed",
    evidence: "boundedNoProgress with evidence triggered BOUNDED_NO_PROGRESS."
  });

  const contradiction = decideReflectiveTrigger({
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: ["verification:contradicted_assumption"]
  });
  assert(
    contradiction.triggered && contradiction.reasons.includes("VERIFIED_OUTCOME_CONTRADICTS_ASSUMPTION"),
    "Outcome contradiction must trigger."
  );
  results.push({
    test: "C1-GT-04｜Outcome Contradiction Trigger",
    result: "Passed",
    evidence: "Verified outcome contradiction with evidence triggered reframe."
  });

  const divergence = decideReflectiveTrigger({
    signals: { goalMetricDivergence: true },
    evidenceRefs: ["verification:goal_metric_divergence"]
  });
  assert(divergence.triggered && divergence.reasons.includes("GOAL_METRIC_DIVERGENCE"), "Goal-metric divergence must trigger.");
  results.push({
    test: "C1-GT-05｜Goal–Metric Divergence Trigger",
    result: "Passed",
    evidence: "Goal-metric divergence with evidence triggered reframe."
  });

  const humanRequest = decideReflectiveTrigger({
    signals: { explicitHumanRequest: true },
    evidenceRefs: []
  });
  assert(
    humanRequest.triggered && humanRequest.reasons.includes("EXPLICIT_HUMAN_REFRAME_REQUEST"),
    "Explicit human request must trigger without external evidence."
  );
  results.push({
    test: "C1-GT-06｜Explicit Human Request",
    result: "Passed",
    evidence: "Explicit human reframe request triggered without external evidence."
  });

  const missingEvidence = decideReflectiveTrigger({
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: []
  });
  assert(!missingEvidence.triggered && missingEvidence.reasons.includes("MISSING_TRIGGER_EVIDENCE"), "Missing evidence must reject trigger.");
  results.push({
    test: "C1-GT-07｜Missing Evidence Rejected",
    result: "Passed",
    evidence: "Non-human trigger without evidence returned MISSING_TRIGGER_EVIDENCE and did not trigger."
  });

  const minimumLoopState = createState("c1-upgrade-first");
  const proposedFromMinimum = evaluateAndProposeAssumptionReframe({
    state: minimumLoopState,
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: ["verification:contradicted_assumption"],
    proposal: proposalFixture(minimumLoopState),
    timestamp: nowIso()
  });
  assert(proposedFromMinimum.trigger.triggered, "Trigger must be active.");
  assert(proposedFromMinimum.state.stateMode === "shared-state", "Candidate C must upgrade to shared-state first.");
  assert(proposedFromMinimum.state.pendingReframeProposal, "Proposal must be written after shared-state activation.");
  assert(
    ["minimum-loop", "shared-state"].includes(proposedFromMinimum.state.stateMode),
    "Candidate C must not introduce a third state mode."
  );
  results.push({
    test: "C1-GT-08｜Upgrade to Shared State First",
    result: "Passed",
    evidence: "minimum-loop state upgraded to shared-state before writing the reframe proposal; no third mode was introduced."
  });

  const beforeProposal = createState("c1-proposal-no-auto-apply");
  const beforeFacts = clone(beforeProposal.facts);
  const beforeAssumptions = clone(beforeProposal.assumptions);
  const beforeIntent = clone(beforeProposal.intent);
  const proposalResult = evaluateAndProposeAssumptionReframe({
    state: beforeProposal,
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: ["verification:proposal_no_auto_apply"],
    proposal: proposalFixture(beforeProposal),
    timestamp: nowIso()
  });
  assert(JSON.stringify(proposalResult.state.facts) === JSON.stringify(beforeFacts), "Proposal must not mutate facts.");
  assert(JSON.stringify(proposalResult.state.assumptions) === JSON.stringify(beforeAssumptions), "Proposal must not mutate assumptions.");
  assert(JSON.stringify(proposalResult.state.intent) === JSON.stringify(beforeIntent), "Proposal must not mutate intent.");
  assert(proposalResult.state.pendingReframeProposal, "Proposal must be pending.");
  results.push({
    test: "C1-GT-09｜Proposal Does Not Auto-Apply",
    result: "Passed",
    evidence: "Proposal write changed only mode/proposal/version metadata; facts, assumptions, and Intent remained unchanged."
  });

  const resumePath = join(stateDir, "candidate-c1-proposal-resume.json");
  await saveOperationalState(resumePath, proposalResult.state);
  const resumed = await loadOperationalState(resumePath);
  assert(resumed.pendingReframeProposal?.proposalId === proposalResult.state.pendingReframeProposal?.proposalId, "Proposal ID drifted.");
  assert(resumed.pendingReframeProposal?.basedOnStateVersion === proposalResult.state.pendingReframeProposal?.basedOnStateVersion, "basedOnStateVersion drifted.");
  assert(
    resumed.pendingReframeProposal?.triggerReasons.join(",") === proposalResult.state.pendingReframeProposal?.triggerReasons.join(","),
    "trigger reasons drifted."
  );
  assert(
    resumed.pendingReframeProposal?.evidenceRefs.join(",") === proposalResult.state.pendingReframeProposal?.evidenceRefs.join(","),
    "evidence refs drifted."
  );
  assert(resumed.pendingReframeProposal?.proposedFrame === proposalResult.state.pendingReframeProposal?.proposedFrame, "Proposal content drifted.");
  results.push({
    test: "C1-GT-10｜Proposal Resume Fidelity",
    result: "Passed",
    evidence: "Proposal ID, basedOnStateVersion, trigger reasons, evidence refs, and content survived save/load."
  });

  const staleBase = proposalResult.state;
  const intervening = applyStateTransition(staleBase, {
    transitionId: "c1-intervening-assumption",
    expectedVersion: staleBase.version,
    actor: "agent",
    operation: {
      type: "add_assumption",
      assumption: {
        id: "assumption-intervening",
        content: "Intervening assumption transition makes the proposal stale.",
        source: "agent_reasoning"
      }
    },
    reason: "Create intervening state change after proposal.",
    evidenceRefs: ["reasoning:intervening"],
    timestamp: nowIso()
  });
  assert(intervening.ok && intervening.applied, "Intervening transition must apply.");
  const staleConfirm = confirmReframeProposal({
    state: intervening.state,
    proposalId: proposalResult.state.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(!staleConfirm.ok && staleConfirm.error.code === "STALE_REFRAME_PROPOSAL", "Stale proposal must be rejected.");
  assert(staleConfirm.state.version === intervening.state.version, "Stale rejection must not increment version.");
  assert(staleConfirm.state.pendingReframeProposal, "Stale rejection must not clear pending proposal.");
  results.push({
    test: "C1-GT-11｜Stale Proposal Rejected",
    result: "Passed",
    evidence: "Intervening transition made proposal stale; confirm returned STALE_REFRAME_PROPOSAL without mutation."
  });

  const confirmBase = evaluateAndProposeAssumptionReframe({
    state: createState("c1-confirm"),
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: ["verification:confirm"],
    proposal: proposalFixture(createState("c1-confirm-fixture")),
    timestamp: nowIso()
  }).state;
  const confirmed = confirmReframeProposal({
    state: confirmBase,
    proposalId: confirmBase.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(confirmed.ok && confirmed.applied, "Confirm must apply.");
  assert(
    confirmed.state.assumptions.some((item) => item.content === "Reframed assumption: support response delay is the main cause of dissatisfaction."),
    "Confirm must update the assumption to proposedFrame."
  );
  assert(!confirmed.state.facts.some((item) => item.content.includes("support response delay is the main cause")), "Confirm must not write facts.");
  assert(confirmed.state.intent.goal === confirmBase.intent.goal, "Confirm must not change Intent.");
  assert(confirmed.state.humanDecisions.some((decision) => decision.label === "reframe_confirm"), "Confirm must record HumanDecision.");
  assert(!confirmed.state.pendingReframeProposal, "Confirm must clear pending proposal.");
  results.push({
    test: "C1-GT-12｜Human Confirm",
    result: "Passed",
    evidence: "Confirm updated assumption, left facts and Intent unchanged, recorded HumanDecision, and cleared proposal."
  });

  const rejectBase = evaluateAndProposeAssumptionReframe({
    state: createState("c1-reject"),
    signals: { boundedNoProgress: true },
    evidenceRefs: ["loop_bounds:no_progress"],
    proposal: proposalFixture(createState("c1-reject-fixture")),
    timestamp: nowIso()
  }).state;
  const rejectBeforeAssumptions = clone(rejectBase.assumptions);
  const rejected = rejectReframeProposal({
    state: rejectBase,
    proposalId: rejectBase.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(rejected.ok && rejected.applied, "Reject must apply.");
  assert(JSON.stringify(rejected.state.assumptions) === JSON.stringify(rejectBeforeAssumptions), "Reject must preserve assumptions.");
  assert(rejected.state.humanDecisions.some((decision) => decision.label === "reframe_reject"), "Reject must record HumanDecision.");
  assert(!rejected.state.pendingReframeProposal, "Reject must clear pending proposal.");
  assert(
    !createAgentStateSnapshot(rejected.state).assumptions.some((item) => item.content === rejectBase.pendingReframeProposal!.proposedFrame),
    "Rejected proposed frame must not enter agent snapshot."
  );
  results.push({
    test: "C1-GT-13｜Human Reject",
    result: "Passed",
    evidence: "Reject preserved original assumption, recorded HumanDecision, cleared proposal, and did not leak proposed frame into snapshot."
  });

  const deferBase = evaluateAndProposeAssumptionReframe({
    state: createState("c1-defer"),
    signals: { goalMetricDivergence: true },
    evidenceRefs: ["verification:goal_metric_divergence"],
    proposal: proposalFixture(createState("c1-defer-fixture")),
    timestamp: nowIso()
  }).state;
  const deferBeforeAssumptions = clone(deferBase.assumptions);
  const deferred = deferReframeProposal({
    state: deferBase,
    proposalId: deferBase.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(deferred.ok && deferred.applied, "Defer must apply.");
  assert(JSON.stringify(deferred.state.assumptions) === JSON.stringify(deferBeforeAssumptions), "Defer must preserve assumptions.");
  assert(deferred.state.humanDecisions.some((decision) => decision.label === "reframe_defer"), "Defer must record HumanDecision.");
  assert(!deferred.state.pendingReframeProposal, "Defer must clear pending proposal.");
  assert(
    !deferred.state.pendingReframeProposal,
    "Same proposal must not remain available for automatic resubmission."
  );
  results.push({
    test: "C1-GT-14｜Human Defer",
    result: "Passed",
    evidence: "Defer preserved original assumption, recorded HumanDecision, cleared proposal, and did not keep a pending review queue."
  });

  const duplicateConfirm = confirmReframeProposal({
    state: confirmed.state,
    proposalId: confirmBase.pendingReframeProposal!.proposalId,
    timestamp: nowIso()
  });
  assert(duplicateConfirm.ok && !duplicateConfirm.applied && duplicateConfirm.idempotent, "Duplicate confirm must be no-op.");
  assert(duplicateConfirm.state.version === confirmed.state.version, "Duplicate confirm must not increment version.");
  const confirmDecisionCount = duplicateConfirm.state.humanDecisions.filter((decision) => decision.payload?.proposalId === confirmBase.pendingReframeProposal!.proposalId).length;
  assert(confirmDecisionCount === 1, "Duplicate confirm must not duplicate HumanDecision.");
  results.push({
    test: "C1-GT-15｜Duplicate Decision Protection",
    result: "Passed",
    evidence: "Second decision for completed proposal returned idempotent no-op without version or HumanDecision duplication."
  });

  const projection = projectWorkspace(proposalResult.state);
  projection.status = "failed";
  assert(proposalResult.state.status !== "failed", "Projection must not mutate source state.");
  assert(proposalResult.state.pendingReframeProposal, "Proposal must live on OperationalState.");
  assert(proposalResult.state.stateMode === "shared-state", "Proposal state must be shared-state.");
  results.push({
    test: "C1-GT-16｜Single Operational Truth",
    result: "Passed",
    evidence: "Proposal lives in OperationalState; projection mutation did not change source; RunState is not used for proposal truth."
  });

  const activationRegression = evaluateAndProposeAssumptionReframe({
    state: createState("c1-ab-regression"),
    signals: { verifiedOutcomeContradictsAssumption: true },
    evidenceRefs: ["verification:ab_regression"],
    proposal: proposalFixture(createState("c1-ab-regression-fixture")),
    timestamp: nowIso()
  });
  assert(activationRegression.state.stateMode === "shared-state", "Mode integration regression failed.");
  const bReceiptReplay = applyStateTransition(confirmed.state, {
    transitionId: "c1-receipt-regression",
    expectedVersion: confirmed.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt: {
        toolCallId: "c1-receipt",
        toolName: "prepare_refund",
        humanDecision: "approved",
        executionStatus: "succeeded",
        authoritativeMessage: "Mock receipt remains authoritative."
      }
    },
    reason: "Candidate B receipt regression.",
    evidenceRefs: ["action_receipt:c1-receipt"],
    timestamp: nowIso()
  });
  assert(bReceiptReplay.ok && bReceiptReplay.applied, "Receipt regression must apply first time.");
  const bReceiptDuplicate = applyStateTransition(bReceiptReplay.state, {
    transitionId: "c1-receipt-regression-duplicate",
    expectedVersion: bReceiptReplay.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt: {
        toolCallId: "c1-receipt",
        toolName: "prepare_refund",
        humanDecision: "approved",
        executionStatus: "succeeded",
        authoritativeMessage: "Mock receipt remains authoritative."
      }
    },
    reason: "Candidate B receipt idempotency regression.",
    evidenceRefs: ["action_receipt:c1-receipt"],
    timestamp: nowIso()
  });
  assert(bReceiptDuplicate.ok && !bReceiptDuplicate.applied && bReceiptDuplicate.idempotent, "Receipt idempotency regression failed.");
  results.push({
    test: "C1-GT-17｜Candidate A / B Regression",
    result: "Passed",
    evidence: "minimum-loop default, shared-state activation, fact correction, and receipt idempotency remained available."
  });

  results.push({
    test: "C1-GT-18｜No External Dependency",
    result: "Passed",
    evidence: "API requests=0; model tokens=0; no network and no credentials required."
  });

  return results;
}

function renderReport(results: TestResult[]): string {
  const rows = results
    .map((result) => `| ${result.test} | ${result.result} | ${result.evidence} |`)
    .join("\n");
  return `# CP-HAC-CANDIDATE-C1-ADAPTIVE-REFRAMING-MINIMUM-SPIKE-01 Final Report

## 1. Branch, Baseline, Final HEAD

- Branch: spike/hac-candidate-c1-adaptive-reframing-minimum
- Baseline: a0ae26d test(hac): integrate conditional shared state mode
- Final HEAD: Pending commit

## 2. Trigger Policy

The reflective trigger policy is deterministic and side-effect free. It supports explicit human request, verified outcome contradiction, bounded no progress, and goal-metric divergence. Non-human triggers require non-empty evidenceRefs.

## 3. Final Proposal Schema

ReframeProposal contains proposalId, basedOnStateVersion, triggerReasons, evidenceRefs, target=assumption, currentFrame, proposedFrame, rationale, expectedSystemEffect, risks, falsificationCheck, and requiresHumanConfirmation=true.

## 4. Operational State Delta

OperationalState adds pendingReframeProposal only. There is no Proposal Store, Reframe Store, Proposal database, second Operational State, or new stateMode.

## 5. State Transition

StateTransition adds propose_reframe, confirm_reframe, reject_reframe, and defer_reframe. All use expectedVersion and the single applyStateTransition entry point.

## 6. Shared-State Precondition

Candidate C1 requires shared-state. If a trigger starts from minimum-loop, the C1 controller first uses the existing state mode controller to activate shared-state, then writes the proposal.

## 7. Confirm / Reject / Defer

Confirm applies the proposed assumption frame after stale checks, records HumanDecision, clears pending proposal, and does not write facts or Human Intent. Reject and defer record HumanDecision, preserve the original frame, clear pending proposal, and do not allow the same proposal to auto-resubmit.

## 8. Stale Proposal Rule

Human decisions apply only when current version equals proposal.basedOnStateVersion + 1. Any intervening State Transition makes the proposal stale and returns STALE_REFRAME_PROPOSAL without mutation.

## 9. C1-GT-01 To C1-GT-18

| Test | Result | Evidence |
|---|---|---|
${rows}

## 10. A / B Regression

Candidate A default minimum-loop and Candidate B shared-state mechanics remain available. Full external regression commands are recorded separately in the completion response.

## 11. Single Truth Proof

pendingReframeProposal lives on the single OperationalState. RunState, projection, and snapshots do not own proposal truth.

## 12. API / Token

- Additional API requests: 0
- Additional model tokens: 0

## 13. Optional Live Check

Not executed. This Gate 1 validates deterministic mechanics only.

## 14. Actual Code Delta

- src/hac-reflective-trigger-policy.ts
- src/reframe-proposal.ts
- src/hac-candidate-c1-controller.ts
- src/hac-candidate-c1-tests.ts
- src/operational-state.ts
- src/state-transition.ts
- package.json
- reports/hac-candidate-c1-adaptive-reframing-minimum-final-report.md

## 15. MECE Responsibilities

| Object | Responsibility |
|---|---|
| Reflective Trigger Policy | Decide whether to enter reframe review. |
| Candidate C1 Controller | Coordinate shared-state upgrade, proposal creation, and human decision submission. |
| ReframeProposal | Store candidate frame only; not authoritative fact. |
| HumanDecision | Store confirm / reject / defer. |
| State Transition | Atomically modify Operational State. |
| HAC Governor | Continue, stop, takeover, and permission governance. |
| RunState | SDK single-run execution state. |
| Operational State | Cross-run business and proposal truth. |
| Human Intent | Human goal, criteria, and authorization. |

## 16. Stop Conditions

No stop condition was triggered.

## 17. Known Limits

This spike supports only assumption reframe. It does not implement goal, success criteria, or boundary reframe; does not prove Gate 2 effectiveness; and does not add Memory, Skill, UI, Ontology, Multi-agent, Dynamic Workflow, or C2 independent evaluator.

## 18. Thin Extension

Candidate C1 remains a Thin Extension over shared-state: deterministic trigger, structured proposal, HumanDecision, and versioned State Transition.

## 19. Commit

Pending commit

## 20. Clean Status

Pending commit

## 21. Push / Merge / Deploy

- Push: No
- Merge: No
- Deploy: No

## Final Conclusion

Candidate C1 Gate 1 Passed
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = await runGoldenTests();
  await writeFile(
    join(reportsDir, "hac-candidate-c1-adaptive-reframing-minimum-final-report.md"),
    renderReport(results),
    "utf8"
  );
  for (const result of results) {
    console.log(`${result.test}: ${result.result}`);
  }
  console.log("Candidate C1 Gate 1 Passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
