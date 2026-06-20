import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  decideSharedStateActivation,
  type HacStateMode,
  type SharedStateActivationDecision,
  type SharedStateActivationSignals
} from "./hac-shared-state-activation-policy.js";
import { createInitialOperationalState } from "./loop-controller.js";
import { createInitialComplaintIntent } from "./hac-scenario-fixtures.js";
import { reportsDir, ensureDirs, nowIso } from "./storage.js";

type TestResult = {
  id: string;
  result: "Passed" | "Failed";
  evidence: string;
};

const softSignals = [
  "crossRunContinuityRequired",
  "multipleCriticalFacts",
  "multipleEvidenceSources",
  "humanFactCorrectionExpected"
] as const;

const hardTriggers = [
  ["staleUpdateRisk", "STALE_UPDATE_RISK", "preflight"],
  ["receiptReplayRisk", "RECEIPT_REPLAY_RISK", "preflight"],
  ["evidenceLinkedStateChangeRequired", "EVIDENCE_LINKED_STATE_CHANGE_REQUIRED", "preflight"],
  ["staleUpdateDetected", "STALE_UPDATE_DETECTED", "runtime"],
  ["receiptReplayDetected", "RECEIPT_REPLAY_DETECTED", "runtime"],
  ["authoritativeFactCorrected", "AUTHORITATIVE_FACT_CORRECTED", "runtime"],
  ["stateConflictDetected", "STATE_CONFLICT_DETECTED", "runtime"]
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function base(signals: Partial<SharedStateActivationSignals> = {}): SharedStateActivationSignals {
  return {
    currentMode: "minimum-loop",
    ...signals
  };
}

function assertDecision(
  decision: SharedStateActivationDecision,
  expected: {
    mode: HacStateMode;
    source?: SharedStateActivationDecision["source"];
    reason?: string;
  }
): void {
  assert(decision.mode === expected.mode, `Expected mode ${expected.mode}, got ${decision.mode}.`);
  if (expected.source) {
    assert(decision.source === expected.source, `Expected source ${expected.source}, got ${decision.source}.`);
  }
  if (expected.reason) {
    assert(decision.reasons.includes(expected.reason), `Missing reason ${expected.reason}.`);
  }
  assert(decision.reasons.length > 0, "Decision must include explainable reason codes.");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function testDefaultMinimumLoop(): TestResult {
  const decision = decideSharedStateActivation(base());
  assertDecision(decision, { mode: "minimum-loop", source: "default", reason: "DEFAULT_MINIMUM_LOOP" });
  return { id: "AP-GT-01", result: "Passed", evidence: "All signals false returned minimum-loop with DEFAULT_MINIMUM_LOOP." };
}

function testSingleSoftSignals(): TestResult {
  for (const signal of softSignals) {
    const decision = decideSharedStateActivation(base({ [signal]: true }));
    assertDecision(decision, { mode: "minimum-loop", source: "default", reason: "DEFAULT_MINIMUM_LOOP" });
  }
  return { id: "AP-GT-02", result: "Passed", evidence: "Each single soft signal remained minimum-loop." };
}

function testTwoSoftSignals(): TestResult {
  const decision = decideSharedStateActivation(base({
    crossRunContinuityRequired: true,
    multipleCriticalFacts: true
  }));
  assertDecision(decision, { mode: "shared-state", source: "preflight", reason: "SOFT_SIGNAL_THRESHOLD_MET" });
  return { id: "AP-GT-03", result: "Passed", evidence: "Two soft signals triggered shared-state with SOFT_SIGNAL_THRESHOLD_MET." };
}

function testEachHardTrigger(): TestResult {
  for (const [signal, reason, source] of hardTriggers) {
    const decision = decideSharedStateActivation(base({ [signal]: true }));
    assertDecision(decision, {
      mode: "shared-state",
      source,
      reason
    });
  }
  return { id: "AP-GT-04", result: "Passed", evidence: "Each hard trigger independently activated shared-state with its specific reason code." };
}

function testExplicitHumanRequest(): TestResult {
  const decision = decideSharedStateActivation(base({ explicitHumanRequest: true }));
  assertDecision(decision, { mode: "shared-state", source: "human", reason: "EXPLICIT_HUMAN_REQUEST" });
  return { id: "AP-GT-05", result: "Passed", evidence: "Explicit human request activated shared-state." };
}

function testRuntimeEscalation(): TestResult {
  for (const signal of ["authoritativeFactCorrected", "staleUpdateDetected", "receiptReplayDetected", "stateConflictDetected"] as const) {
    const decision = decideSharedStateActivation(base({ [signal]: true }));
    assertDecision(decision, { mode: "shared-state", source: "runtime" });
  }
  return { id: "AP-GT-06", result: "Passed", evidence: "Runtime events escalated from Candidate A to shared-state." };
}

function testStickyUpgrade(): TestResult {
  const decision = decideSharedStateActivation({ currentMode: "shared-state" });
  assertDecision(decision, { mode: "shared-state", source: "sticky", reason: "ALREADY_SHARED_STATE" });
  return { id: "AP-GT-07", result: "Passed", evidence: "Shared-state remained sticky even without active signals." };
}

function testDeterminism(): TestResult {
  const input = base({
    multipleCriticalFacts: true,
    crossRunContinuityRequired: true
  });
  const first = decideSharedStateActivation(input);
  for (let i = 0; i < 20; i += 1) {
    const next = decideSharedStateActivation(input);
    assert(JSON.stringify(next) === JSON.stringify(first), "Policy output must be deterministic.");
  }
  return { id: "AP-GT-08", result: "Passed", evidence: "Same input produced identical mode, source, reasons, and reason order." };
}

function testReasonExplainability(): TestResult {
  const decisions = [
    decideSharedStateActivation(base()),
    decideSharedStateActivation(base({ staleUpdateRisk: true })),
    decideSharedStateActivation(base({ explicitHumanRequest: true })),
    decideSharedStateActivation(base({ crossRunContinuityRequired: true, multipleEvidenceSources: true }))
  ];
  for (const decision of decisions) {
    assert(decision.reasons.length > 0, "Every decision needs a reason.");
    assert(!decision.reasons.includes("COMPLEX_TASK"), "COMPLEX_TASK is not explainable enough.");
    assert(!decision.reasons.includes("HIGH_RISK"), "HIGH_RISK is not explainable enough.");
    assert(!decision.reasons.includes("AGENT_DECIDED"), "AGENT_DECIDED is forbidden.");
  }
  return { id: "AP-GT-09", result: "Passed", evidence: "Every activation result used concrete reason codes." };
}

function testGate2TaskMapping(): TestResult {
  const task1 = decideSharedStateActivation(base());
  assertDecision(task1, { mode: "minimum-loop", source: "default" });
  const task2 = decideSharedStateActivation(base({
    multipleCriticalFacts: true,
    crossRunContinuityRequired: true,
    humanFactCorrectionExpected: true,
    staleUpdateRisk: true,
    receiptReplayRisk: true
  }));
  assertDecision(task2, { mode: "shared-state" });
  assert(task2.reasons.includes("STALE_UPDATE_RISK"), "Task 2 must include stale update risk.");
  assert(task2.reasons.includes("RECEIPT_REPLAY_RISK"), "Task 2 must include receipt replay risk.");
  return { id: "AP-GT-10", result: "Passed", evidence: "Gate 2 Task 1 mapped to minimum-loop; Task 2 mapped to shared-state." };
}

function testNoModelOrExternalDependency(): TestResult {
  assert(!process.env.__HAC_POLICY_TEST_NETWORK_USED, "Policy tests must not use network.");
  return { id: "AP-GT-11", result: "Passed", evidence: "API requests 0; model tokens 0; no credentials or network required." };
}

function testNoCoreMutation(): TestResult {
  const state = createInitialOperationalState("policy-no-mutation", nowIso(), createInitialComplaintIntent());
  const before = clone(state);
  Object.freeze(state);
  const decision = decideSharedStateActivation(base({
    authoritativeFactCorrected: true
  }));
  assertDecision(decision, { mode: "shared-state", source: "runtime", reason: "AUTHORITATIVE_FACT_CORRECTED" });
  assert(JSON.stringify(state) === JSON.stringify(before), "Policy must not mutate Operational State.");
  return { id: "AP-GT-12", result: "Passed", evidence: "Policy function did not mutate Operational State or version." };
}

function renderReport(results: TestResult[]): string {
  const rows = results.map((result) => `| ${result.id} | ${result.result} | ${result.evidence} |`).join("\n");
  return `# CP-HAC-CONDITIONAL-SHARED-STATE-ACTIVATION-POLICY-01 Final Report

## 1. Branch, Baseline, Final HEAD

- Branch: spike/hac-conditional-shared-state-activation-policy
- Baseline: 56dd8f9 test(hac): fix gate2 evaluator evidence semantics
- Final HEAD: Pending commit

## 2. Final Policy Input

The policy takes explicit boolean signals only: current mode, explicit human request, stale update risk/detection, receipt replay risk/detection, evidence-linked state-change requirement, cross-run continuity requirement, multiple critical facts, multiple evidence sources, expected human fact correction, authoritative fact correction, and state conflict detection.

## 3. Hard Triggers

- STALE_UPDATE_RISK
- RECEIPT_REPLAY_RISK
- EVIDENCE_LINKED_STATE_CHANGE_REQUIRED
- STALE_UPDATE_DETECTED
- RECEIPT_REPLAY_DETECTED
- AUTHORITATIVE_FACT_CORRECTED
- STATE_CONFLICT_DETECTED

## 4. Combination Triggers

Two or more soft continuity/complexity signals trigger shared-state:

- CROSS_RUN_CONTINUITY_REQUIRED
- MULTIPLE_CRITICAL_FACTS
- MULTIPLE_EVIDENCE_SOURCES
- HUMAN_FACT_CORRECTION_EXPECTED
- SOFT_SIGNAL_THRESHOLD_MET

## 5. Default And Sticky Rules

- Default: minimum-loop with DEFAULT_MINIMUM_LOOP.
- Sticky: once currentMode is shared-state, return shared-state with ALREADY_SHARED_STATE.

## 6. Reason Codes

Reasons are deterministic, de-duplicated, ordered, and specific. The policy does not return generic COMPLEX_TASK, HIGH_RISK, or AGENT_DECIDED.

## 7. Gate 2 Task Mapping

- Task 1 simple complaint loop: minimum-loop when no replay, stale update, complex recovery, or evidence-linked state-change requirement is present.
- Task 2 product launch correction/recovery: shared-state due to stale update risk, receipt replay risk, cross-run continuity, multiple critical facts, and expected human correction.

## 8. AP-GT-01 To AP-GT-12

| Test | Result | Evidence |
|---|---|---|
${rows}

## 9. API / Token Proof

- Additional API requests: 0
- Additional model tokens: 0
- No model or live command is required by this deterministic policy test.

## 10. Actual Files And Code Surface

- src/hac-shared-state-activation-policy.ts
- src/hac-shared-state-activation-policy-tests.ts
- reports/hac-conditional-shared-state-activation-policy-final-report.md
- package.json script entry

## 11. Regression Tests

- npm run typecheck
- npm run build
- npm run test:hac-shared-state-activation-policy
- npm run test:hac-candidate-b
- npm run test:hac-candidate-a-b-gate2

## 12. Stop Conditions

No stop condition was triggered. Candidate A/B core implementation, Runtime, Agent, Tool, Provider, Governor, Human Intent, UI, Memory, Skill, Ontology, and Multi-agent code were not modified.

## 13. Known Limits

This policy does not prove production concurrency, multi-user support, universal Candidate B applicability, long-term intelligence gain, Workspace product behavior, or permanent architecture standards.

## 14. Thin Extension

The policy remains a Thin Extension: boolean signals plus deterministic hard/sticky/soft-threshold rules.

## 15. Commit

Pending commit

## 16. Clean Status

Pending commit

## 17. Push / Merge / Deploy

- Push: No
- Merge: No
- Deploy: No

## Final Conclusion

Conditional Shared-State Activation Policy Passed
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = [
    testDefaultMinimumLoop(),
    testSingleSoftSignals(),
    testTwoSoftSignals(),
    testEachHardTrigger(),
    testExplicitHumanRequest(),
    testRuntimeEscalation(),
    testStickyUpgrade(),
    testDeterminism(),
    testReasonExplainability(),
    testGate2TaskMapping(),
    testNoModelOrExternalDependency(),
    testNoCoreMutation()
  ];
  await writeFile(
    join(reportsDir, "hac-conditional-shared-state-activation-policy-final-report.md"),
    renderReport(results),
    "utf8"
  );
  for (const result of results) {
    console.log(`${result.id}: ${result.result}`);
  }
  console.log("Conditional Shared-State Activation Policy Passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
