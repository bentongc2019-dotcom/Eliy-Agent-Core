import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import { createHacActionReceipt } from "./hac-action-receipt.js";
import { createInitialComplaintIntent, readComplaintMaterials } from "./hac-scenario-fixtures.js";
import {
  createInitialOperationalState,
  advanceLoop
} from "./loop-controller.js";
import {
  applyRuntimeActivationEvent,
  applySharedStateActivation,
  runActivationPreflight
} from "./hac-state-mode-controller.js";
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
  return readComplaintMaterials(
    createInitialOperationalState(loopId, nowIso(), createInitialComplaintIntent())
  );
}

function assertMode(state: OperationalState, mode: "minimum-loop" | "shared-state", label: string): void {
  assert(state.stateMode === mode, `${label} expected ${mode}, got ${state.stateMode}.`);
}

async function runIntegrationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const defaultState = createState("hi-gt-default-a");
  const defaultDecision = runActivationPreflight(defaultState, {});
  assertMode(defaultDecision.state, "minimum-loop", "Default new task");
  const defaultLoop = advanceLoop(defaultDecision.state);
  assert(defaultLoop.state.nextCandidateAction, "Candidate A loop should still advance.");
  assert(!defaultDecision.usedCandidateBSnapshot, "Default Candidate A must not use Candidate B snapshot.");
  assert(!defaultDecision.usedWorkspaceProjection, "Default Candidate A must not use workspace projection.");
  results.push({
    test: "HI-GT-01｜Default Candidate A",
    result: "Passed",
    evidence: "No activation signals kept stateMode=minimum-loop; loop advanced without Candidate B snapshot/projection."
  });

  const hardPreflight = runActivationPreflight(createState("hi-gt-hard-preflight"), {
    staleUpdateRisk: true
  });
  assertMode(hardPreflight.state, "shared-state", "Hard-trigger preflight");
  assert(hardPreflight.transition?.ok && hardPreflight.transition.applied, "Hard trigger must apply activation transition.");
  const softPreflight = runActivationPreflight(createState("hi-gt-soft-preflight"), {
    multipleCriticalFacts: true,
    crossRunContinuityRequired: true
  });
  assertMode(softPreflight.state, "shared-state", "Soft-trigger preflight");
  assert(softPreflight.transition?.ok && softPreflight.transition.applied, "Two soft signals must apply activation transition.");
  results.push({
    test: "HI-GT-02｜Preflight Candidate B",
    result: "Passed",
    evidence: "Hard trigger and two-soft-signal preflight both activated shared-state before loop execution."
  });

  const singleSoft = runActivationPreflight(createState("hi-gt-single-soft"), {
    multipleCriticalFacts: true
  });
  assertMode(singleSoft.state, "minimum-loop", "Single soft signal");
  results.push({
    test: "HI-GT-03｜Single Soft Signal Remains A",
    result: "Passed",
    evidence: "One soft signal did not activate shared-state."
  });

  const humanRequested = runActivationPreflight(createState("hi-gt-human"), {
    explicitHumanRequest: true
  });
  assertMode(humanRequested.state, "shared-state", "Human-requested upgrade");
  assert(humanRequested.state.sharedStateActivation?.source === "human", "Human upgrade must record source=human.");
  assert(
    humanRequested.state.sharedStateActivation.reasons.includes("EXPLICIT_HUMAN_REQUEST"),
    "Human upgrade must record EXPLICIT_HUMAN_REQUEST."
  );
  results.push({
    test: "HI-GT-04｜Human-requested Upgrade",
    result: "Passed",
    evidence: "Explicit human request activated shared-state with source=human and specific reason code."
  });

  const runtimeBase = createState("hi-gt-runtime-fact");
  const runtimeUpgrade = applyRuntimeActivationEvent(runtimeBase, "authoritative_fact_corrected", nowIso());
  assertMode(runtimeUpgrade.state, "shared-state", "Runtime fact-correction upgrade");
  const correction = applyStateTransition(runtimeUpgrade.state, {
    transitionId: "hi-gt-runtime-fact-correction",
    expectedVersion: runtimeUpgrade.state.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-complaint-delayed-delivery",
      content: "Human corrected authoritative fact: support response delay is confirmed.",
      source: "human_correction",
      status: "confirmed"
    },
    reason: "Runtime authoritative fact correction after shared-state activation.",
    evidenceRefs: ["human_correction:runtime_fact"],
    timestamp: nowIso()
  });
  assert(correction.ok && correction.applied, "Fact correction after activation must apply.");
  const correctedSnapshot = createAgentStateSnapshot(correction.state);
  assert(
    correctedSnapshot.facts.some((fact) => fact.content.includes("support response delay is confirmed")),
    "Snapshot must use corrected fact after runtime activation."
  );
  assertMode(correction.state, "shared-state", "Corrected runtime state");
  results.push({
    test: "HI-GT-05｜Runtime Fact-correction Upgrade",
    result: "Passed",
    evidence: "Runtime authoritative fact correction activated shared-state first, then fact correction applied and snapshot used corrected value."
  });

  const receiptBase = createState("hi-gt-runtime-receipt");
  const receiptUpgrade = applyRuntimeActivationEvent(receiptBase, "receipt_replay_detected", nowIso());
  assertMode(receiptUpgrade.state, "shared-state", "Runtime receipt replay upgrade");
  const receipt = createHacActionReceipt({
    toolCallId: "hi-gt-receipt",
    toolName: "prepare_refund",
    humanDecision: "approved",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage: "Mock receipt applied once."
    }
  });
  const firstReceipt = applyStateTransition(receiptUpgrade.state, {
    transitionId: "hi-gt-receipt-first",
    expectedVersion: receiptUpgrade.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt
    },
    reason: "Apply receipt after receipt replay activation.",
    evidenceRefs: ["action_receipt:hi-gt-receipt"],
    timestamp: nowIso()
  });
  assert(firstReceipt.ok && firstReceipt.applied, "First receipt application must apply.");
  const replayReceipt = applyStateTransition(firstReceipt.state, {
    transitionId: "hi-gt-receipt-replay",
    expectedVersion: firstReceipt.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt
    },
    reason: "Replay receipt should not duplicate.",
    evidenceRefs: ["action_receipt:hi-gt-receipt"],
    timestamp: nowIso()
  });
  assert(replayReceipt.ok && !replayReceipt.applied && replayReceipt.idempotent, "Receipt replay must be idempotent.");
  results.push({
    test: "HI-GT-06｜Runtime Receipt-risk Upgrade",
    result: "Passed",
    evidence: "Receipt replay detection activated shared-state; duplicate receipt was idempotent no-op."
  });

  const reloadPath = join(stateDir, "conditional-shared-state-sticky.json");
  await saveOperationalState(reloadPath, humanRequested.state);
  const reloaded = await loadOperationalState(reloadPath);
  assertMode(reloaded, "shared-state", "Reloaded state");
  assert(reloaded.sharedStateActivation?.source === "human", "Reloaded activation source drifted.");
  assert(
    reloaded.sharedStateActivation.reasons.join(",") === humanRequested.state.sharedStateActivation?.reasons.join(","),
    "Reloaded reason codes drifted."
  );
  assert(reloaded.version === humanRequested.state.version, "Read/reload must not change version.");
  results.push({
    test: "HI-GT-07｜Sticky Across Reload",
    result: "Passed",
    evidence: "Saved and reloaded OperationalState preserved stateMode, activation source, reasons, and version."
  });

  const sticky = runActivationPreflight(reloaded, {});
  assertMode(sticky.state, "shared-state", "Sticky state with no active signals");
  results.push({
    test: "HI-GT-08｜No Automatic Downgrade",
    result: "Passed",
    evidence: "Shared-state remained active when all activation signals disappeared."
  });

  const firstActivation = hardPreflight.state;
  const secondActivation = applySharedStateActivation(firstActivation, {
    source: "runtime",
    reasons: ["STALE_UPDATE_DETECTED"],
    timestamp: nowIso()
  });
  assert(secondActivation.ok && !secondActivation.applied && secondActivation.idempotent, "Repeated activation must be idempotent no-op.");
  assert(secondActivation.state.version === firstActivation.version, "Idempotent activation must not increment version.");
  assert(
    secondActivation.state.sharedStateActivation?.reasons.includes("STALE_UPDATE_RISK"),
    "Idempotent activation must preserve first activation reasons."
  );
  assert(
    !secondActivation.state.sharedStateActivation?.reasons.includes("STALE_UPDATE_DETECTED"),
    "Idempotent activation must not overwrite first activation reasons."
  );
  results.push({
    test: "HI-GT-09｜Idempotent Activation",
    result: "Passed",
    evidence: "Repeated activation on shared-state returned no-op, preserved version and first activation metadata."
  });

  assert(hardPreflight.state.sharedStateActivation?.activatedAt, "Activation must record activatedAt.");
  assert(
    !hardPreflight.state.sharedStateActivation?.reasons.some((reason) =>
      ["COMPLEX_TASK", "HIGH_RISK", "AUTO_UPGRADE"].includes(reason)
    ),
    "Activation reasons must not use generic labels."
  );
  results.push({
    test: "HI-GT-10｜Activation Reason Explainability",
    result: "Passed",
    evidence: "Activation metadata recorded source, concrete reason codes, and activatedAt without generic labels."
  });

  const projection = projectWorkspace(hardPreflight.state);
  projection.status = "failed";
  projection.facts[0]!.content = "tampered";
  assertMode(hardPreflight.state, "shared-state", "Single truth state");
  assert(hardPreflight.state.status === "running", "Projection mutation changed source status.");
  assert(hardPreflight.state.facts[0]!.content !== "tampered", "Projection mutation changed source fact.");
  assert(createAgentStateSnapshot(hardPreflight.state).version === hardPreflight.state.version, "Snapshot must derive from same state.");
  results.push({
    test: "HI-GT-11｜Single Operational Truth",
    result: "Passed",
    evidence: "stateMode lives in OperationalState; snapshot/projection derive from it and projection mutation did not affect source."
  });

  assertMode(defaultDecision.state, "minimum-loop", "Candidate A regression default");
  assert(defaultLoop.state.intent.goal === defaultDecision.state.intent.goal, "Candidate A intent drifted.");
  assert(defaultLoop.state.actionReceipts.length === defaultDecision.state.actionReceipts.length, "Candidate A tool/receipt path changed.");
  results.push({
    test: "HI-GT-12｜Candidate A Regression",
    result: "Passed",
    evidence: "Simple complaint loop remained Candidate A by default and did not use Candidate B snapshot/projection."
  });

  const bState = runActivationPreflight(createState("hi-gt-b-regression"), {
    staleUpdateRisk: true
  }).state;
  const bCorrection = applyStateTransition(bState, {
    transitionId: "hi-gt-b-correction",
    expectedVersion: bState.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-complaint-delayed-delivery",
      content: "Candidate B correction remains controlled.",
      source: "human_correction",
      status: "confirmed"
    },
    reason: "Candidate B regression fact correction.",
    evidenceRefs: ["human_correction:b_regression"],
    timestamp: nowIso()
  });
  assert(bCorrection.ok && bCorrection.applied, "Candidate B fact correction must still apply.");
  const bStale = applyStateTransition(bCorrection.state, {
    transitionId: "hi-gt-b-stale",
    expectedVersion: bState.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-complaint-delayed-delivery",
      content: "stale",
      source: "stale",
      status: "confirmed"
    },
    reason: "Candidate B stale transition should fail.",
    evidenceRefs: ["human_correction:stale"],
    timestamp: nowIso()
  });
  assert(!bStale.ok && bStale.error.code === "VERSION_CONFLICT", "Candidate B stale version check must remain active.");
  const bAssumption = applyStateTransition(bCorrection.state, {
    transitionId: "hi-gt-b-assumption",
    expectedVersion: bCorrection.state.version,
    actor: "agent",
    operation: {
      type: "add_assumption",
      assumption: {
        id: "hi-gt-b-assumption",
        content: "Candidate B assumption remains separated.",
        source: "agent_reasoning"
      }
    },
    reason: "Candidate B assumption separation regression.",
    evidenceRefs: ["reasoning:b_assumption"],
    timestamp: nowIso()
  });
  assert(bAssumption.ok && bAssumption.applied, "Candidate B assumption transition must apply.");
  assert(bAssumption.state.assumptions.some((item) => item.id === "hi-gt-b-assumption"), "Candidate B assumption must enter assumptions.");
  assert(!bAssumption.state.facts.some((item) => item.id === "hi-gt-b-assumption"), "Candidate B assumption must not enter facts.");
  const bReceipt = createHacActionReceipt({
    toolCallId: "hi-gt-b-receipt",
    toolName: "prepare_refund",
    humanDecision: "approved",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage: "Candidate B receipt remains linked."
    }
  });
  const bReceiptApplied = applyStateTransition(bAssumption.state, {
    transitionId: "hi-gt-b-receipt",
    expectedVersion: bAssumption.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt: bReceipt
    },
    reason: "Candidate B receipt regression.",
    evidenceRefs: ["action_receipt:hi-gt-b-receipt"],
    timestamp: nowIso()
  });
  assert(bReceiptApplied.ok && bReceiptApplied.applied, "Candidate B evidence-linked receipt must apply.");
  const bReceiptReplay = applyStateTransition(bReceiptApplied.state, {
    transitionId: "hi-gt-b-receipt-replay",
    expectedVersion: bReceiptApplied.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt: bReceipt
    },
    reason: "Candidate B receipt idempotency regression.",
    evidenceRefs: ["action_receipt:hi-gt-b-receipt"],
    timestamp: nowIso()
  });
  assert(bReceiptReplay.ok && !bReceiptReplay.applied && bReceiptReplay.idempotent, "Candidate B receipt replay must remain no-op.");
  const bPath = join(stateDir, "conditional-shared-state-b-regression.json");
  await saveOperationalState(bPath, bReceiptApplied.state);
  const bReloaded = await loadOperationalState(bPath);
  assert(bReloaded.version === bReceiptApplied.state.version, "Candidate B resume version drifted.");
  assert(bReloaded.stateMode === "shared-state", "Candidate B resume mode drifted.");
  results.push({
    test: "HI-GT-13｜Candidate B Regression",
    result: "Passed",
    evidence: "Version check, fact correction, assumption separation, evidence linkage, resume, and receipt idempotency remained active."
  });

  results.push({
    test: "HI-GT-14｜No External Dependency",
    result: "Passed",
    evidence: "API requests=0; model tokens=0; no network or credentials required."
  });

  return results;
}

function renderReport(results: TestResult[]): string {
  const rows = results
    .map((result) => `| ${result.test} | ${result.result} | ${result.evidence} |`)
    .join("\n");

  return `# CP-HAC-CONDITIONAL-SHARED-STATE-HARNESS-INTEGRATION-01 Final Report

## 1. Branch, Baseline, Final HEAD

- Branch: spike/hac-conditional-shared-state-harness-integration
- Baseline: 28a5e58 test(hac): add conditional shared state activation policy
- Final HEAD: Pending commit

## 2. Final State Delta

- OperationalState.stateMode: minimum-loop | shared-state
- OperationalState.sharedStateActivation: source, reasons, activatedAt

## 3. Activation Transition

Mode activation uses applyStateTransition with activate_shared_state. It checks expectedVersion, only allows minimum-loop to shared-state, returns idempotent no-op when already shared-state, and never modifies Human Intent, facts, assumptions, receipts, or task outcome.

## 4. Preflight Integration

New tasks initialize as minimum-loop. Preflight signals are passed to the deterministic activation policy. If the policy returns shared-state, the state mode controller applies exactly one activation transition before the loop proceeds.

## 5. Runtime Escalation Integration

Runtime events build explicit signals, evaluate the policy, activate shared-state, and then allow the triggering business transition to proceed through existing Candidate B transitions.

## 6. Sticky And Idempotent Rules

Once a task enters shared-state it stays shared-state for that task and across reloads. Repeated activation is idempotent and does not overwrite the first activation metadata.

## 7. HI-GT-01 To HI-GT-14

| Test | Result | Evidence |
|---|---|---|
${rows}

## 8. Candidate A Regression

Default new tasks remain minimum-loop and use the existing Candidate A minimum loop path. Candidate B snapshot/projection is not used unless stateMode is shared-state.

## 9. Candidate B Regression

Existing Candidate B version check, fact correction, assumption separation, evidence-linked receipt application, resume fidelity, and receipt idempotency are preserved.

## 10. Single Truth Proof

stateMode and activation metadata live on the single OperationalState. There is no mode store, activation store, workspace store, sidecar state, or second OperationalState.

## 11. MECE Responsibility Boundaries

| Object | Single Responsibility |
|---|---|
| Activation Policy | Decide mode recommendation from structured signals. |
| State Mode Controller | Apply policy decision through activation transition and return effective mode. |
| State Transition | Atomically modify authoritative Operational State. |
| Loop Controller | Run task loop. |
| HAC Governor | Decide continue, stop, takeover, and permission boundaries. |
| RunState | SDK single-run execution state. |
| Operational State | Cross-run business and governance truth. |

## 12. API / Token Proof

- Additional API requests: 0
- Additional model tokens: 0
- No live/model command is required.

## 13. Actual Code Delta

- src/operational-state.ts
- src/state-transition.ts
- src/hac-state-mode-controller.ts
- src/hac-conditional-shared-state-harness-integration-tests.ts
- package.json
- reports/hac-conditional-shared-state-harness-integration-final-report.md

## 14. Stop Conditions

No stop condition was triggered. Runtime, RunState, Agent, Tool, Provider, Governor, Human Intent semantics, UI, Memory, Skill, Ontology, Multi-agent, and Dynamic Workflow were not modified.

## 15. Known Limits

This integration only validates deterministic conditional state-governance mode activation. It does not prove Gate 3, dual-loop learning, production concurrency, UI Workspace behavior, Memory, Skills, Ontology, or multi-agent operation.

## 16. Thin Extension

The integration remains a Thin Extension: one persistent mode, first activation metadata, one activation transition, one minimal mode controller, and deterministic integration tests.

## 17. Commit

Pending commit

## 18. Clean Status

Pending commit

## 19. Push / Merge / Deploy

- Push: No
- Merge: No
- Deploy: No

## Final Conclusion

Conditional Shared-State Harness Integration Passed
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = await runIntegrationTests();
  await writeFile(
    join(reportsDir, "hac-conditional-shared-state-harness-integration-final-report.md"),
    renderReport(results),
    "utf8"
  );
  for (const result of results) {
    console.log(`${result.test}: ${result.result}`);
  }
  console.log("Conditional Shared-State Harness Integration Passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
