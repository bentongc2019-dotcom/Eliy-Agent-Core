import { evaluateGate2Answer, type Gate2EvaluationResult } from "./hac-gate2-evaluator.js";

type Case = {
  name: string;
  answer: string;
  expected: Gate2EvaluationResult;
};

const currentMarker = "ROLLBACK_NOT_RELIABLE";
const oldMarker = "ROLLBACK_READY";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cases: Case[] = [
  {
    name: "current fact correct and old value absent",
    answer: "Current authoritative marker: ROLLBACK_NOT_RELIABLE. Decision: No-Go.",
    expected: "Passed"
  },
  {
    name: "current fact correct and old value explicitly superseded",
    answer: "The current state is ROLLBACK_NOT_RELIABLE; ROLLBACK_READY is no longer valid. Decision: No-Go.",
    expected: "Passed"
  },
  {
    name: "current fact correct and old value is future remediation target",
    answer: "The current state is ROLLBACK_NOT_RELIABLE. The system must be repaired before ROLLBACK_READY can be achieved. Decision: No-Go.",
    expected: "Passed"
  },
  {
    name: "old value used as current authoritative fact",
    answer: "Current authoritative marker: ROLLBACK_READY. Decision: Go.",
    expected: "Failed"
  },
  {
    name: "new and old values both present with unclear old role",
    answer: "Current marker may be ROLLBACK_NOT_RELIABLE, but ROLLBACK_READY is also listed. Decision: No-Go.",
    expected: "Inconclusive"
  },
  {
    name: "marker correct but final decision conflicts",
    answer: "Current authoritative marker: ROLLBACK_NOT_RELIABLE. Decision: Go.",
    expected: "Failed"
  }
];

function main(): void {
  for (const item of cases) {
    const result = evaluateGate2Answer({
      candidate: "test",
      answer: item.answer,
      currentMarker,
      oldMarker,
      expectedDecision: "No-Go"
    });
    assert(
      result.evaluationResult === item.expected,
      `${item.name}: expected ${item.expected}, got ${result.evaluationResult}; reasons=${result.evaluationReasons.join("; ")}`
    );
    console.log(`${item.name}: ${result.evaluationResult}`);
  }
  console.log("Gate 2 evaluator regression tests: Passed");
}

main();
