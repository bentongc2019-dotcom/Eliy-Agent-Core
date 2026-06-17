import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createHacActionReceipt } from "./hac-action-receipt.js";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import { createInitialComplaintIntent, readComplaintMaterials } from "./hac-scenario-fixtures.js";
import { createInitialOperationalState } from "./loop-controller.js";
import {
  loadOperationalState,
  saveOperationalState,
  type OperationalState
} from "./operational-state.js";
import { reportsDir, ensureDirs, nowIso, stateDir } from "./storage.js";
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

function createCandidateState(): OperationalState {
  return readComplaintMaterials(
    createInitialOperationalState("candidate-b-loop", nowIso(), createInitialComplaintIntent())
  );
}

function assertUnchanged(before: OperationalState, after: OperationalState, label: string): void {
  assert(JSON.stringify(before) === JSON.stringify(after), `${label} changed state unexpectedly.`);
}

async function runGoldenTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const base = createCandidateState();
  assert(base.version === 1, "Initial Operational State version must be 1.");
  assert(typeof base.updatedAt === "string" && base.updatedAt.length > 0, "Initial updatedAt is required.");

  const snapshot = createAgentStateSnapshot(base);
  const projection = projectWorkspace(base);
  projection.status = "failed";
  projection.facts[0]!.content = "tampered projection fact";
  assert(base.status === "running", "Projection mutated source status.");
  assert(base.facts[0]!.content !== "tampered projection fact", "Projection mutated source fact.");
  assert(snapshot.version === base.version, "Snapshot version must come from Operational State.");
  results.push({
    test: "B-GT-01｜Single Source of Operational Truth",
    result: "Passed",
    evidence: "Agent snapshot and workspace projection both derive from OperationalState; mutating projection did not mutate source."
  });

  const correctFact = applyStateTransition(base, {
    transitionId: "transition-correct-fact",
    expectedVersion: base.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-complaint-delayed-delivery",
      content: "客户投诉事实已由人纠正：实际问题是客服响应慢，不是交付延误。",
      source: "human_correction",
      status: "confirmed"
    },
    reason: "Human corrected the authoritative task fact.",
    evidenceRefs: ["human_correction:complaint_fact"],
    timestamp: nowIso()
  });
  assert(correctFact.ok && correctFact.applied, "Correct-version fact correction must apply.");
  assert(correctFact.state.version === base.version + 1, "Successful transition must increment version once.");
  const staleBefore = clone(correctFact.state);
  const stale = applyStateTransition(correctFact.state, {
    transitionId: "transition-stale",
    expectedVersion: base.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-complaint-delayed-delivery",
      content: "stale write",
      source: "stale",
      status: "confirmed"
    },
    reason: "Stale transition should be rejected.",
    evidenceRefs: ["human_correction:stale"],
    timestamp: nowIso()
  });
  assert(!stale.ok && stale.error.code === "VERSION_CONFLICT", "Stale transition must return version conflict.");
  assertUnchanged(staleBefore, stale.state, "Stale transition");
  results.push({
    test: "B-GT-02｜Optimistic Version Check",
    result: "Passed",
    evidence: "Correct expectedVersion incremented version by one; stale expectedVersion was rejected without mutation."
  });

  const correctedFact = correctFact.state.facts.find((fact) => fact.id === "fact-complaint-delayed-delivery");
  assert(correctedFact?.content.includes("客服响应慢"), "Corrected fact content was not authoritative.");
  assert(correctFact.transition.actor === "human", "Transition metadata must record actor.");
  assert(correctFact.transition.reason.includes("corrected"), "Transition metadata must record reason.");
  const correctedSnapshot = createAgentStateSnapshot(correctFact.state);
  assert(
    correctedSnapshot.facts.some((fact) => fact.content.includes("客服响应慢")),
    "Agent snapshot did not adopt corrected fact."
  );
  assert(
    !correctedSnapshot.facts.some((fact) => fact.id === "fact-complaint-delayed-delivery" && fact.content.includes("存在交付延误")),
    "Old fact remained authoritative after correction."
  );
  results.push({
    test: "B-GT-03｜Fact Correction",
    result: "Passed",
    evidence: "Human correction updated the identified fact, recorded transition metadata, and next snapshot used corrected value."
  });

  const assumptionResult = applyStateTransition(correctFact.state, {
    transitionId: "transition-agent-assumption",
    expectedVersion: correctFact.state.version,
    actor: "agent",
    operation: {
      type: "add_assumption",
      assumption: {
        id: "assumption-response-delay-impact",
        content: "客服响应慢可能已经扩大客户不满。",
        source: "agent_reasoning",
        status: "unverified",
        evidenceRefs: ["reasoning:agent_assumption"]
      }
    },
    reason: "Agent may add unverified reasoning only as an assumption.",
    evidenceRefs: ["reasoning:agent_assumption"],
    timestamp: nowIso()
  });
  assert(assumptionResult.ok && assumptionResult.applied, "Agent assumption transition must apply.");
  assert(
    assumptionResult.state.assumptions.some((item) => item.id === "assumption-response-delay-impact"),
    "Agent content must enter assumptions."
  );
  assert(
    !assumptionResult.state.facts.some((item) => item.id === "assumption-response-delay-impact"),
    "Agent assumption must not enter facts."
  );
  const assumptionStatePath = join(stateDir, "candidate-b-assumption-separation.json");
  await saveOperationalState(assumptionStatePath, assumptionResult.state);
  const reloadedAssumptionState = await loadOperationalState(assumptionStatePath);
  const reloadedSnapshot = createAgentStateSnapshot(reloadedAssumptionState);
  assert(
    reloadedSnapshot.assumptions.some((item) => item.id === "assumption-response-delay-impact"),
    "Reloaded snapshot must preserve assumption separation."
  );
  results.push({
    test: "B-GT-04｜Assumption Separation",
    result: "Passed",
    evidence: "Agent-added content remained in assumptions through save, load, and snapshot generation."
  });

  const receipt = createHacActionReceipt({
    toolCallId: "tool-call-candidate-b",
    toolName: "prepare_refund",
    humanDecision: "approved",
    runtimeOutcome: {
      status: "succeeded",
      resultMessage: "Mock execution result recorded for Candidate B state transition."
    }
  });
  const missingEvidence = applyStateTransition(assumptionResult.state, {
    transitionId: "transition-receipt-no-evidence",
    expectedVersion: assumptionResult.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt
    },
    reason: "Tool result transition without evidence must be rejected.",
    evidenceRefs: [],
    timestamp: nowIso()
  });
  assert(!missingEvidence.ok && missingEvidence.error.code === "EVIDENCE_REQUIRED", "Receipt transition without evidence must be rejected.");
  assertUnchanged(assumptionResult.state, missingEvidence.state, "Missing-evidence receipt transition");

  const receiptApplied = applyStateTransition(assumptionResult.state, {
    transitionId: "transition-receipt-applied",
    expectedVersion: assumptionResult.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt,
      status: "completed"
    },
    reason: "Apply authoritative Action Receipt to Operational State.",
    evidenceRefs: ["action_receipt:tool-call-candidate-b"],
    timestamp: nowIso()
  });
  assert(receiptApplied.ok && receiptApplied.applied, "Evidence-linked receipt transition must apply.");
  assert(receiptApplied.state.actionReceipts.length === assumptionResult.state.actionReceipts.length + 1, "Receipt must be appended once.");
  results.push({
    test: "B-GT-05｜Evidence-linked Transition",
    result: "Passed",
    evidence: "Tool-result transition without evidence was rejected; evidence-linked Action Receipt applied and remained traceable."
  });

  const resumePath = join(stateDir, "candidate-b-resume-fidelity.json");
  await saveOperationalState(resumePath, receiptApplied.state);
  const resumed = await loadOperationalState(resumePath);
  assert(resumed.loopId === receiptApplied.state.loopId, "Reloaded loopId drifted.");
  assert(resumed.version === receiptApplied.state.version, "Reloaded version drifted.");
  assert(JSON.stringify(resumed.facts) === JSON.stringify(receiptApplied.state.facts), "Reloaded facts drifted.");
  assert(JSON.stringify(resumed.assumptions) === JSON.stringify(receiptApplied.state.assumptions), "Reloaded assumptions drifted.");
  assert(JSON.stringify(resumed.actionReceipts) === JSON.stringify(receiptApplied.state.actionReceipts), "Reloaded receipts drifted.");
  assert(createAgentStateSnapshot(resumed).version === receiptApplied.state.version, "Snapshot must come from reloaded authoritative State.");
  results.push({
    test: "B-GT-06｜Resume Fidelity",
    result: "Passed",
    evidence: "Saved and reloaded Operational State preserved loopId, version, facts, assumptions, receipts, and snapshot version."
  });

  const projectionBefore = projectWorkspace(receiptApplied.state);
  projectionBefore.status = "failed";
  projectionBefore.version = 999;
  assert(receiptApplied.state.status === "completed", "Projection status mutation changed source State.");
  assert(receiptApplied.state.version !== 999, "Projection version mutation changed source State.");
  const projectionAfter = projectWorkspace(receiptApplied.state);
  assert(projectionAfter.status === "completed", "Re-projection must return authoritative source status.");
  assert(projectionAfter.version === receiptApplied.state.version, "Re-projection must return authoritative source version.");
  results.push({
    test: "B-GT-07｜No Parallel UI Truth",
    result: "Passed",
    evidence: "Workspace projection has no save path; projection mutation did not alter source and re-projection restored authoritative status/version."
  });

  const idempotent = applyStateTransition(receiptApplied.state, {
    transitionId: "transition-receipt-idempotent",
    expectedVersion: receiptApplied.state.version,
    actor: "runtime",
    operation: {
      type: "apply_action_receipt",
      receipt,
      status: "completed"
    },
    reason: "Same receipt should not be applied twice.",
    evidenceRefs: ["action_receipt:tool-call-candidate-b"],
    timestamp: nowIso()
  });
  assert(idempotent.ok && !idempotent.applied && idempotent.idempotent, "Duplicate receipt must return idempotent no-op.");
  assert(idempotent.state.version === receiptApplied.state.version, "Idempotent no-op must not increment version.");
  assert(idempotent.state.actionReceipts.length === receiptApplied.state.actionReceipts.length, "Idempotent no-op must not duplicate receipt.");
  results.push({
    test: "B-GT-08｜Idempotent Receipt Application",
    result: "Passed",
    evidence: "Duplicate receipt returned no-op, did not append, and did not increment version."
  });

  return results;
}

function renderReport(results: TestResult[]): string {
  const credentialStatus = process.env.DEEPSEEK_API_KEY ? "SET" : "NOT_SET";
  const conclusion =
    credentialStatus === "SET"
      ? "Candidate B Gate 1 Failed"
      : "Candidate B Spike Stopped by Boundary";
  return `# CP-HAC-CANDIDATE-B-SHARED-STATE-MINIMUM-SPIKE-01 Final Report

## Scope

This report covers deterministic Candidate B Shared Operational State Golden Tests only.

## Runtime Boundary

- OpenAI Agents SDK Runtime was not modified.
- SDK RunState / Runner / interruption / approve / reject / resume paths were not wrapped or copied.
- Workspace projection is read-only and has no store.
- Long-term Memory, UI, database, ontology, and multi-agent paths were not introduced.

## Deterministic Golden Tests

| Test | Result | Evidence |
|---|---|---|
${results.map((result) => `| ${result.test} | ${result.result} | ${result.evidence} |`).join("\n")}

## Live Model Check

- DEEPSEEK_API_KEY: ${credentialStatus}
- Live model check: ${credentialStatus === "SET" ? "Not run by deterministic test command" : "Credential Blocked before live model check"}

## Conclusion

${conclusion}
`;
}

async function runAll(): Promise<void> {
  await ensureDirs();
  const results = await runGoldenTests();
  const resultPath = join(reportsDir, "hac-candidate-b-shared-state-minimum-results.md");
  const finalPath = join(reportsDir, "hac-candidate-b-shared-state-minimum-final-report.md");
  const rows = results.map((result) => `- ${result.test}: ${result.result} — ${result.evidence}`).join("\n");
  await writeFile(resultPath, `# Candidate B Shared State Minimum Results\n\n${rows}\n`, "utf8");
  await writeFile(finalPath, renderReport(results), "utf8");

  console.log("Candidate B Shared Operational State deterministic Golden Tests: Passed");
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log("Credential Blocked before live model check");
  }
}

runAll().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
