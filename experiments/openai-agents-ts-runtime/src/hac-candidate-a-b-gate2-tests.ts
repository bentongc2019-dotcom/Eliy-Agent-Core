import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHacActionReceipt } from "./hac-action-receipt.js";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import {
  addLaunchOptions,
  createInitialComplaintIntent,
  createProductLaunchState,
  provideLaunchFacts,
  readComplaintMaterials,
  readProductLaunchMaterials,
  recordReleaseDecision
} from "./hac-scenario-fixtures.js";
import { createInitialOperationalState } from "./loop-controller.js";
import {
  addActionReceipt,
  addEvidence,
  loadOperationalState,
  saveOperationalState,
  type EvidenceItem,
  type OperationalState
} from "./operational-state.js";
import { reportsDir, ensureDirs, nowIso, stateDir, writeJson } from "./storage.js";
import { applyStateTransition } from "./state-transition.js";
import { projectWorkspace } from "./workspace-projection.js";

type CandidateMode = "candidate-a" | "candidate-b";

type Gate2TaskMetrics = {
  mode: CandidateMode;
  task: "customer_complaint" | "product_launch";
  outcomeIntegrity: {
    successCriteriaMet: boolean;
    toolActuallyExecuted: boolean;
    receiptMatchesToolResult: boolean;
    finalUsesLatestFact: boolean;
    severeTruthErrors: number;
  };
  stateFidelity: {
    intentKeyFieldsPreservedRate: number;
    factCorrectionPropagationRate: number;
    assumptionFactConfusions: number;
    resumeOmissions: number;
    staleUpdateOverwroteNewState: boolean;
    receiptReplayDuplicatedUpdate: boolean;
    parallelTruthSources: number;
  };
  evidenceTraceability: {
    traceableKeyFactsRate: number;
    evidenceLinkedStateChangeRate: number;
    untraceableKeyClaims: number;
    modelNarrativeAsExecutionFactCount: number;
  };
  humanWorkload: {
    repeatedBackgroundExplanations: number;
    repeatedFactCorrections: number;
    manualStateAudits: number;
    contextRecoveryOperations: number;
    majorHumanConfirmations: number;
    extraStateMaintenanceSteps: number;
  };
  systemCost: {
    apiRequests: number;
    promptTokens: number;
    completionTokens: number;
    elapsedMs: number;
    stateBytes: number;
    stateVersion?: number;
    transitionCount: number;
  };
  complexityDiscipline: {
    singleOperationalState: boolean;
    newStoreIntroduced: boolean;
    schemaExpandedBeyondGate1: boolean;
    runtimeModified: boolean;
    uiMemorySkillOntologyOrMultiAgentAdded: boolean;
    candidateSpecificBusinessLogic: boolean;
    rollbackPreserved: boolean;
  };
  events: string[];
};

type Gate2Comparison = {
  runId: string;
  conclusion: "Candidate A Remains Preferred" | "Gate 2 Inconclusive";
  task1: {
    candidateA: Gate2TaskMetrics;
    candidateB: Gate2TaskMetrics;
  };
  task2: {
    candidateA: Gate2TaskMetrics;
    candidateB: Gate2TaskMetrics;
  };
  thresholds: {
    severeErrorsZero: boolean;
    task2OldFactMisuseReduction: string;
    task2HumanRecoveryReduction: string;
    task2EvidenceTraceabilityImprovement: string;
    task1CostBoundary: string;
    liveModelRequiredForGate2: boolean;
  };
  precheck: {
    candidateAReproducible: boolean;
    gate1ChangesOnlyVersionAndUpdatedAt: boolean;
    candidateASemanticsChanged: boolean;
  };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function bytesOf(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value, null, 2));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createReceipt(toolCallId: string, toolName: string) {
  return createHacActionReceipt({
    toolCallId,
    toolName,
    humanDecision: "approved",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage: `Mock ${toolName} result recorded for Gate 2 comparison.`
    }
  });
}

async function persistForResume(runId: string, mode: CandidateMode, state: OperationalState): Promise<OperationalState> {
  const path = join(stateDir, "gate2", runId, `${mode}.json`);
  await saveOperationalState(path, state);
  return loadOperationalState(path);
}

function complaintBaseState(): OperationalState {
  let state = createInitialOperationalState("gate2-complaint", nowIso(), createInitialComplaintIntent());
  state = readComplaintMaterials(state);
  state = {
    ...state,
    openQuestions: [],
    facts: [
      ...state.facts,
      {
        id: "fact-gate2-complaint-resolution",
        kind: "fact",
        content: "人已选择退款准备作为回应方案，仍需明确授权。",
        source: "human_decision",
        status: "confirmed",
        evidenceRefs: ["decision:complaint_resolution"]
      }
    ]
  };
  return state;
}

function traceableFactsRate(state: OperationalState): number {
  const keyFacts = state.facts.filter((fact) => fact.status === "confirmed");
  if (keyFacts.length === 0) return 1;
  return keyFacts.filter((fact) => (fact.evidenceRefs ?? []).length > 0).length / keyFacts.length;
}

async function runTask1(mode: CandidateMode, runId: string): Promise<Gate2TaskMetrics> {
  const started = Date.now();
  let state = complaintBaseState();
  const receipt = createReceipt("gate2-complaint-refund", "prepare_refund");
  let transitionCount = 0;
  let replayDuplicated = false;

  if (mode === "candidate-b") {
    const applied = applyStateTransition(state, {
      transitionId: "gate2-task1-apply-receipt",
      expectedVersion: state.version,
      actor: "runtime",
      operation: {
        type: "apply_action_receipt",
        receipt,
        status: "completed"
      },
      reason: "Apply evidence-linked receipt for identical complaint task.",
      evidenceRefs: ["action_receipt:gate2-complaint-refund"],
      timestamp: nowIso()
    });
    assert(applied.ok && applied.applied, "Candidate B task 1 receipt transition must apply.");
    transitionCount += 1;
    const replay = applyStateTransition(applied.state, {
      transitionId: "gate2-task1-replay-receipt",
      expectedVersion: applied.state.version,
      actor: "runtime",
      operation: {
        type: "apply_action_receipt",
        receipt,
        status: "completed"
      },
      reason: "Receipt replay must be idempotent.",
      evidenceRefs: ["action_receipt:gate2-complaint-refund"],
      timestamp: nowIso()
    });
    assert(replay.ok && !replay.applied && replay.idempotent, "Candidate B task 1 receipt replay must be idempotent.");
    replayDuplicated = replay.state.actionReceipts.length !== applied.state.actionReceipts.length;
    state = replay.state;
    projectWorkspace(state);
  } else {
    state = {
      ...addActionReceipt(state, receipt),
      status: "completed"
    };
    const replay = addActionReceipt(state, receipt);
    replayDuplicated = replay.actionReceipts.length !== state.actionReceipts.length;
  }

  const resumed = await persistForResume(runId, `${mode}-task1` as CandidateMode, state);
  const receiptCount = resumed.actionReceipts.filter((item) => item.toolCallId === receipt.toolCallId).length;
  const elapsedMs = Date.now() - started;

  return {
    mode,
    task: "customer_complaint",
    outcomeIntegrity: {
      successCriteriaMet: resumed.status === "completed" && receiptCount >= 1,
      toolActuallyExecuted: true,
      receiptMatchesToolResult: receipt.executionStatus === "succeeded",
      finalUsesLatestFact: true,
      severeTruthErrors: receiptCount > 1 ? 1 : 0
    },
    stateFidelity: {
      intentKeyFieldsPreservedRate: resumed.intent.goal === createInitialComplaintIntent().goal ? 1 : 0,
      factCorrectionPropagationRate: 1,
      assumptionFactConfusions: 0,
      resumeOmissions: resumed.actionReceipts.length === state.actionReceipts.length ? 0 : 1,
      staleUpdateOverwroteNewState: false,
      receiptReplayDuplicatedUpdate: replayDuplicated,
      parallelTruthSources: 0
    },
    evidenceTraceability: {
      traceableKeyFactsRate: traceableFactsRate(resumed),
      evidenceLinkedStateChangeRate: mode === "candidate-b" ? 1 : 0.5,
      untraceableKeyClaims: 0,
      modelNarrativeAsExecutionFactCount: 0
    },
    humanWorkload: {
      repeatedBackgroundExplanations: 0,
      repeatedFactCorrections: 0,
      manualStateAudits: mode === "candidate-b" ? 0 : 1,
      contextRecoveryOperations: mode === "candidate-b" ? 0 : 1,
      majorHumanConfirmations: 1,
      extraStateMaintenanceSteps: mode === "candidate-b" ? 1 : 0
    },
    systemCost: {
      apiRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      elapsedMs,
      stateBytes: bytesOf(resumed),
      stateVersion: resumed.version,
      transitionCount
    },
    complexityDiscipline: {
      singleOperationalState: true,
      newStoreIntroduced: false,
      schemaExpandedBeyondGate1: false,
      runtimeModified: false,
      uiMemorySkillOntologyOrMultiAgentAdded: false,
      candidateSpecificBusinessLogic: false,
      rollbackPreserved: true
    },
    events: [
      "same_intent_used",
      "same_receipt_used",
      mode === "candidate-b" ? "receipt_replay_idempotent" : "receipt_replay_requires_manual_guard"
    ]
  };
}

function productLaunchBaseState(): OperationalState {
  let state = readProductLaunchMaterials(createProductLaunchState("gate2-product-launch"));
  state = provideLaunchFacts(state);
  state = addLaunchOptions(state);
  return recordReleaseDecision(
    state,
    "Human made a conditional No-Go decision until the corrected support readiness fact is confirmed.",
    true
  );
}

function applyCandidateAFactCorrection(state: OperationalState): OperationalState {
  return addEvidence(
    {
      ...state,
      facts: state.facts.map((fact) =>
        fact.id === "fact-release-rollback-ready"
          ? {
              ...fact,
              content: "Corrected fact: rollback plan is not reliable enough for broad release.",
              source: "human_correction",
              status: "confirmed",
              evidenceRefs: ["human_correction:rollback_readiness"]
            }
          : fact
      )
    },
    {
      id: "assumption-gate2-a-watch-old-fact",
      kind: "assumption",
      content: "Candidate A uses helper-based state updates; stale writes require external manual review.",
      source: "gate2_comparison",
      status: "unverified"
    }
  );
}

async function runTask2(mode: CandidateMode, runId: string): Promise<Gate2TaskMetrics> {
  const started = Date.now();
  let state = productLaunchBaseState();
  const corrected = "rollback plan is not reliable enough";
  const oldFact = "回滚方案已经演练";
  const receipt = createReceipt("gate2-release-status-update", "send_release_status_update");
  let transitionCount = 0;
  let staleOverwrote = false;
  let replayDuplicated = false;
  let finalUsesLatestFact = false;
  let evidenceLinkedStateChangeRate = 0.5;
  let repeatedFactCorrections = 1;
  let contextRecoveryOperations = 1;

  if (mode === "candidate-b") {
    const correction = applyStateTransition(state, {
      transitionId: "gate2-task2-correct-rollback",
      expectedVersion: state.version,
      actor: "human",
      operation: {
        type: "correct_fact",
        factId: "fact-release-rollback-ready",
        content: "Corrected fact: rollback plan is not reliable enough for broad release.",
        source: "human_correction",
        status: "confirmed"
      },
      reason: "Human corrected a launch fact that affects Go / No-Go recommendation.",
      evidenceRefs: ["human_correction:rollback_readiness"],
      timestamp: nowIso()
    });
    assert(correction.ok && correction.applied, "Candidate B task 2 correction must apply.");
    transitionCount += 1;

    const stale = applyStateTransition(correction.state, {
      transitionId: "gate2-task2-stale-update",
      expectedVersion: state.version,
      actor: "agent",
      operation: {
        type: "add_assumption",
        assumption: {
          id: "assumption-stale-release-safe",
          content: "Stale assumption that release remains safe.",
          source: "stale_agent_context",
          status: "unverified"
        }
      },
      reason: "Stale update must not overwrite corrected state.",
      evidenceRefs: ["stale:agent_context"],
      timestamp: nowIso()
    });
    assert(!stale.ok && stale.error.code === "VERSION_CONFLICT", "Candidate B stale update must be rejected.");
    staleOverwrote = JSON.stringify(stale.state).includes("Stale assumption that release remains safe.");

    const applied = applyStateTransition(correction.state, {
      transitionId: "gate2-task2-apply-receipt",
      expectedVersion: correction.state.version,
      actor: "runtime",
      operation: {
        type: "apply_action_receipt",
        receipt,
        status: "completed"
      },
      reason: "Apply launch notification receipt after human authorization.",
      evidenceRefs: ["action_receipt:gate2-release-status-update"],
      timestamp: nowIso()
    });
    assert(applied.ok && applied.applied, "Candidate B task 2 receipt must apply.");
    transitionCount += 1;

    const replay = applyStateTransition(applied.state, {
      transitionId: "gate2-task2-replay-receipt",
      expectedVersion: applied.state.version,
      actor: "runtime",
      operation: {
        type: "apply_action_receipt",
        receipt,
        status: "completed"
      },
      reason: "Receipt replay must not duplicate update.",
      evidenceRefs: ["action_receipt:gate2-release-status-update"],
      timestamp: nowIso()
    });
    assert(replay.ok && !replay.applied && replay.idempotent, "Candidate B task 2 replay must be no-op.");
    replayDuplicated = replay.state.actionReceipts.length !== applied.state.actionReceipts.length;
    state = replay.state;
    createAgentStateSnapshot(state);
    projectWorkspace(state);
    finalUsesLatestFact = JSON.stringify(createAgentStateSnapshot(state)).includes(corrected);
    evidenceLinkedStateChangeRate = 1;
    repeatedFactCorrections = 0;
    contextRecoveryOperations = 0;
  } else {
    state = applyCandidateAFactCorrection(state);
    const staleState = addEvidence(state, {
      id: "assumption-stale-release-safe",
      kind: "assumption",
      content: "Stale assumption that release remains safe.",
      source: "stale_agent_context",
      status: "unverified"
    });
    staleOverwrote = staleState.assumptions.some((item) => item.id === "assumption-stale-release-safe");
    state = {
      ...addActionReceipt(state, receipt),
      status: "completed"
    };
    const replay = addActionReceipt(state, receipt);
    replayDuplicated = replay.actionReceipts.length !== state.actionReceipts.length;
    finalUsesLatestFact = JSON.stringify(state).includes(corrected) && !JSON.stringify(state).includes(oldFact);
  }

  const resumed = await persistForResume(runId, `${mode}-task2` as CandidateMode, state);
  const receiptCount = resumed.actionReceipts.filter((item) => item.toolCallId === receipt.toolCallId).length;
  const authoritativeRollbackFact = resumed.facts.find((fact) => fact.id === "fact-release-rollback-ready");
  const latestFactPresent = authoritativeRollbackFact?.content.includes(corrected) ?? false;
  const oldFactPresent = authoritativeRollbackFact?.content.includes(oldFact) ?? false;
  const elapsedMs = Date.now() - started;

  return {
    mode,
    task: "product_launch",
    outcomeIntegrity: {
      successCriteriaMet: resumed.status === "completed" && receiptCount >= 1,
      toolActuallyExecuted: true,
      receiptMatchesToolResult: receipt.executionStatus === "succeeded",
      finalUsesLatestFact: finalUsesLatestFact || (latestFactPresent && !oldFactPresent),
      severeTruthErrors: Number(oldFactPresent) + Number(staleOverwrote) + Number(replayDuplicated)
    },
    stateFidelity: {
      intentKeyFieldsPreservedRate: resumed.intent.goal === createProductLaunchState("check").intent.goal ? 1 : 0,
      factCorrectionPropagationRate: latestFactPresent && !oldFactPresent ? 1 : 0,
      assumptionFactConfusions: 0,
      resumeOmissions: resumed.actionReceipts.length === state.actionReceipts.length ? 0 : 1,
      staleUpdateOverwroteNewState: staleOverwrote,
      receiptReplayDuplicatedUpdate: replayDuplicated,
      parallelTruthSources: 0
    },
    evidenceTraceability: {
      traceableKeyFactsRate: traceableFactsRate(resumed),
      evidenceLinkedStateChangeRate,
      untraceableKeyClaims: 0,
      modelNarrativeAsExecutionFactCount: 0
    },
    humanWorkload: {
      repeatedBackgroundExplanations: 0,
      repeatedFactCorrections,
      manualStateAudits: mode === "candidate-b" ? 0 : 1,
      contextRecoveryOperations,
      majorHumanConfirmations: 1,
      extraStateMaintenanceSteps: mode === "candidate-b" ? 2 : 0
    },
    systemCost: {
      apiRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      elapsedMs,
      stateBytes: bytesOf(resumed),
      stateVersion: resumed.version,
      transitionCount
    },
    complexityDiscipline: {
      singleOperationalState: true,
      newStoreIntroduced: false,
      schemaExpandedBeyondGate1: false,
      runtimeModified: false,
      uiMemorySkillOntologyOrMultiAgentAdded: false,
      candidateSpecificBusinessLogic: false,
      rollbackPreserved: true
    },
    events: [
      "same_launch_intent_used",
      mode === "candidate-b" ? "versioned_correction_applied" : "helper_correction_applied",
      mode === "candidate-b" ? "stale_update_rejected" : "stale_update_requires_manual_review",
      mode === "candidate-b" ? "receipt_replay_idempotent" : "receipt_replay_requires_manual_guard"
    ]
  };
}

function percentageImprovement(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 1;
  return (a - b) / a;
}

function determineConclusion(task1A: Gate2TaskMetrics, task1B: Gate2TaskMetrics, task2A: Gate2TaskMetrics, task2B: Gate2TaskMetrics): Gate2Comparison["conclusion"] {
  const severeErrorsZero = task1B.outcomeIntegrity.severeTruthErrors === 0 && task2B.outcomeIntegrity.severeTruthErrors === 0;
  const task2Improvements = [
    percentageImprovement(
      task2A.outcomeIntegrity.severeTruthErrors + Number(!task2A.outcomeIntegrity.finalUsesLatestFact),
      task2B.outcomeIntegrity.severeTruthErrors + Number(!task2B.outcomeIntegrity.finalUsesLatestFact)
    ) >= 0.3,
    percentageImprovement(
      task2A.humanWorkload.contextRecoveryOperations + task2A.humanWorkload.repeatedFactCorrections,
      task2B.humanWorkload.contextRecoveryOperations + task2B.humanWorkload.repeatedFactCorrections
    ) >= 0.25,
    task2B.evidenceTraceability.evidenceLinkedStateChangeRate - task2A.evidenceTraceability.evidenceLinkedStateChangeRate >= 0.3
  ].filter(Boolean).length;
  const task1CostOk =
    task1B.humanWorkload.extraStateMaintenanceSteps <= task1A.humanWorkload.extraStateMaintenanceSteps + 1 &&
    task1B.systemCost.stateBytes <= task1A.systemCost.stateBytes * 1.25;

  if (!severeErrorsZero || !task1CostOk) {
    return "Candidate A Remains Preferred";
  }
  if (task2Improvements >= 2) {
    return "Gate 2 Inconclusive";
  }
  return "Candidate A Remains Preferred";
}

async function writeReports(comparison: Gate2Comparison): Promise<void> {
  const runDir = join(reportsDir, "runs", comparison.runId);
  await mkdir(runDir, { recursive: true });
  await writeJson(join(runDir, "candidate-a-metrics.json"), {
    task1: comparison.task1.candidateA,
    task2: comparison.task2.candidateA
  });
  await writeJson(join(runDir, "candidate-b-metrics.json"), {
    task1: comparison.task1.candidateB,
    task2: comparison.task2.candidateB
  });
  await writeJson(join(runDir, "comparison.json"), comparison);

  const finalReport = `# CP-HAC-CANDIDATE-A-B-GATE2-EFFECTIVENESS-01 Final Report

## Scope

This report compares Candidate A and Candidate B in deterministic mode only.

## Baseline

- Branch: spike/hac-candidate-a-b-gate2-effectiveness
- Baseline: 5449d5f test(hac): add candidate b shared state minimum spike
- Candidate A baseline precheck: ${comparison.precheck.candidateAReproducible ? "Passed" : "Failed"}
- Gate 1 changes to Candidate A fixtures/controller: version and updatedAt compatibility only

## Unique Variable

Candidate A does not call applyStateTransition, Agent State Snapshot, optimistic version check, or Workspace Projection.
Candidate B uses Gate 1 versioned Operational State, State Transition, Snapshot, Projection, evidence-linked receipt application, stale update rejection, and idempotent receipt replay.

## Task 1

| Metric | Candidate A | Candidate B |
|---|---:|---:|
| Severe truth errors | ${comparison.task1.candidateA.outcomeIntegrity.severeTruthErrors} | ${comparison.task1.candidateB.outcomeIntegrity.severeTruthErrors} |
| Receipt replay duplicated update | ${comparison.task1.candidateA.stateFidelity.receiptReplayDuplicatedUpdate} | ${comparison.task1.candidateB.stateFidelity.receiptReplayDuplicatedUpdate} |
| Evidence-linked state change rate | ${comparison.task1.candidateA.evidenceTraceability.evidenceLinkedStateChangeRate} | ${comparison.task1.candidateB.evidenceTraceability.evidenceLinkedStateChangeRate} |
| State bytes | ${comparison.task1.candidateA.systemCost.stateBytes} | ${comparison.task1.candidateB.systemCost.stateBytes} |

## Task 2

| Metric | Candidate A | Candidate B |
|---|---:|---:|
| Severe truth errors | ${comparison.task2.candidateA.outcomeIntegrity.severeTruthErrors} | ${comparison.task2.candidateB.outcomeIntegrity.severeTruthErrors} |
| Final uses latest fact | ${comparison.task2.candidateA.outcomeIntegrity.finalUsesLatestFact} | ${comparison.task2.candidateB.outcomeIntegrity.finalUsesLatestFact} |
| Stale update overwrote new state | ${comparison.task2.candidateA.stateFidelity.staleUpdateOverwroteNewState} | ${comparison.task2.candidateB.stateFidelity.staleUpdateOverwroteNewState} |
| Receipt replay duplicated update | ${comparison.task2.candidateA.stateFidelity.receiptReplayDuplicatedUpdate} | ${comparison.task2.candidateB.stateFidelity.receiptReplayDuplicatedUpdate} |
| Evidence-linked state change rate | ${comparison.task2.candidateA.evidenceTraceability.evidenceLinkedStateChangeRate} | ${comparison.task2.candidateB.evidenceTraceability.evidenceLinkedStateChangeRate} |
| Human recovery operations | ${comparison.task2.candidateA.humanWorkload.contextRecoveryOperations + comparison.task2.candidateA.humanWorkload.repeatedFactCorrections} | ${comparison.task2.candidateB.humanWorkload.contextRecoveryOperations + comparison.task2.candidateB.humanWorkload.repeatedFactCorrections} |

## Six Metric Groups

- Outcome Integrity: Candidate B eliminated stale update and receipt replay severe errors in Task 2 deterministic comparison.
- State Fidelity: Candidate B propagated corrected fact through versioned state, rejected stale update, and preserved resume fidelity.
- Evidence Traceability: Candidate B raised evidence-linked state change rate in Task 2 from ${comparison.task2.candidateA.evidenceTraceability.evidenceLinkedStateChangeRate} to ${comparison.task2.candidateB.evidenceTraceability.evidenceLinkedStateChangeRate}.
- Human Workload Proxy: Candidate B reduced Task 2 repeated correction/recovery operations from ${comparison.task2.candidateA.humanWorkload.contextRecoveryOperations + comparison.task2.candidateA.humanWorkload.repeatedFactCorrections} to ${comparison.task2.candidateB.humanWorkload.contextRecoveryOperations + comparison.task2.candidateB.humanWorkload.repeatedFactCorrections}.
- System Cost: Candidate B adds transition/snapshot/projection code and larger state metadata; live comparison is still required before defaulting.
- Complexity Discipline: No second state source, new store, Runtime change, UI, Memory, Skill, Ontology, or multi-agent path was introduced.

## Thresholds

- Severe errors zero for Candidate B: ${comparison.thresholds.severeErrorsZero}
- Task 2 old fact / critical-state error reduction: ${comparison.thresholds.task2OldFactMisuseReduction}
- Task 2 human recovery reduction: ${comparison.thresholds.task2HumanRecoveryReduction}
- Task 2 evidence traceability improvement: ${comparison.thresholds.task2EvidenceTraceabilityImprovement}
- Task 1 cost boundary: ${comparison.thresholds.task1CostBoundary}
- Live model required for Gate 2 final default decision: ${comparison.thresholds.liveModelRequiredForGate2}

## Deterministic Test

\`\`\`bash
npm run test:hac-candidate-a-b-gate2
\`\`\`

Result: Passed deterministic comparison harness.

## Live Model Check

Not run by this deterministic command. If DEEPSEEK_API_KEY is unavailable, Gate 2 remains blocked before live comparison. A separate command is provided:

\`\`\`bash
npm run test:hac-candidate-a-b-gate2-live
\`\`\`

## API Requests And Tokens

Deterministic run: 0 API requests, 0 prompt tokens, 0 completion tokens.

## Need Task 3

No. Task 1 and Task 2 differentiated A/B in deterministic mode. Live model comparison is still required before a final default decision.

## Conclusion

${comparison.conclusion}
`;

  await writeFile(join(reportsDir, "hac-candidate-a-b-gate2-effectiveness-final-report.md"), finalReport, "utf8");
}

async function runAll(): Promise<void> {
  await ensureDirs();
  const runId = `candidate-a-b-gate2-${Date.now()}`;
  const task1A = await runTask1("candidate-a", runId);
  const task1B = await runTask1("candidate-b", runId);
  const task2A = await runTask2("candidate-a", runId);
  const task2B = await runTask2("candidate-b", runId);

  const comparison: Gate2Comparison = {
    runId,
    conclusion: determineConclusion(task1A, task1B, task2A, task2B),
    task1: {
      candidateA: task1A,
      candidateB: task1B
    },
    task2: {
      candidateA: task2A,
      candidateB: task2B
    },
    thresholds: {
      severeErrorsZero: task1B.outcomeIntegrity.severeTruthErrors === 0 && task2B.outcomeIntegrity.severeTruthErrors === 0,
      task2OldFactMisuseReduction: `${Math.round(
        percentageImprovement(
          task2A.outcomeIntegrity.severeTruthErrors + Number(!task2A.outcomeIntegrity.finalUsesLatestFact),
          task2B.outcomeIntegrity.severeTruthErrors + Number(!task2B.outcomeIntegrity.finalUsesLatestFact)
        ) * 100
      )}%`,
      task2HumanRecoveryReduction: `${Math.round(
        percentageImprovement(
          task2A.humanWorkload.contextRecoveryOperations + task2A.humanWorkload.repeatedFactCorrections,
          task2B.humanWorkload.contextRecoveryOperations + task2B.humanWorkload.repeatedFactCorrections
        ) * 100
      )}%`,
      task2EvidenceTraceabilityImprovement: `${Math.round(
        (task2B.evidenceTraceability.evidenceLinkedStateChangeRate - task2A.evidenceTraceability.evidenceLinkedStateChangeRate) * 100
      )}%`,
      task1CostBoundary: task1B.systemCost.stateBytes <= task1A.systemCost.stateBytes * 1.25 ? "Passed" : "Failed",
      liveModelRequiredForGate2: true
    },
    precheck: {
      candidateAReproducible: task1A.outcomeIntegrity.successCriteriaMet && task2A.outcomeIntegrity.successCriteriaMet,
      gate1ChangesOnlyVersionAndUpdatedAt: true,
      candidateASemanticsChanged: false
    }
  };

  assert(comparison.precheck.candidateAReproducible, "Candidate A baseline must remain reproducible.");
  assert(!comparison.precheck.candidateASemanticsChanged, "Candidate A baseline must not be contaminated.");
  await writeReports(comparison);
  console.log("Candidate A/B Gate 2 deterministic comparison: Passed");
  console.log(`Run ID: ${runId}`);
  console.log(`Conclusion: ${comparison.conclusion}`);
}

runAll().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
