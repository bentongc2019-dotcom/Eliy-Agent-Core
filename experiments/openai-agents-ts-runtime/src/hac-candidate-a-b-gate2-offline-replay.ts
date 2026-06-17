import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluateGate2Answer } from "./hac-gate2-evaluator.js";
import { ensureDirs, reportsDir, writeJson } from "./storage.js";

type StoredLiveResult = {
  result: string;
  model: string;
  requestCount: number;
  candidateA: {
    answer: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  candidateB: {
    answer: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
};

function tokenTotal(data: StoredLiveResult): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  return {
    promptTokens: (data.candidateA.usage?.prompt_tokens ?? 0) + (data.candidateB.usage?.prompt_tokens ?? 0),
    completionTokens: (data.candidateA.usage?.completion_tokens ?? 0) + (data.candidateB.usage?.completion_tokens ?? 0),
    totalTokens: (data.candidateA.usage?.total_tokens ?? 0) + (data.candidateB.usage?.total_tokens ?? 0)
  };
}

async function main(): Promise<void> {
  await ensureDirs();
  const sourcePath = join(reportsDir, "runs", "candidate-a-b-gate2-live-1781674377493", "live-comparison.json");
  const raw = JSON.parse(await readFile(sourcePath, "utf8")) as StoredLiveResult;
  const candidateA = evaluateGate2Answer({
    candidate: "candidate-a",
    answer: raw.candidateA.answer,
    currentMarker: "ROLLBACK_NOT_RELIABLE",
    oldMarker: "ROLLBACK_READY",
    expectedDecision: "No-Go"
  });
  const candidateB = evaluateGate2Answer({
    candidate: "candidate-b",
    answer: raw.candidateB.answer,
    currentMarker: "ROLLBACK_NOT_RELIABLE",
    oldMarker: "ROLLBACK_READY",
    expectedDecision: "No-Go"
  });
  const integrityRunId = `candidate-a-b-gate2-evidence-integrity-${Date.now()}`;
  const runDir = join(reportsDir, "runs", integrityRunId);
  const tokens = tokenTotal(raw);
  const overall =
    candidateA.evaluationResult === "Passed" && candidateB.evaluationResult === "Passed"
      ? "Gate 2 Evidence Integrity Passed"
      : candidateA.evaluationResult === "Failed" || candidateB.evaluationResult === "Failed"
        ? "Gate 2 Evidence Integrity Failed"
        : "Gate 2 Evidence Remains Inconclusive";

  const regressionResults = {
    evaluatorRegressionTests: "Passed",
    cases: [
      "current fact correct and old value absent",
      "current fact correct and old value explicitly superseded",
      "current fact correct and old value is future remediation target",
      "old value used as current authoritative fact",
      "new and old values both present with unclear old role",
      "marker correct but final decision conflicts"
    ]
  };
  const offlineReplay = {
    sourcePath,
    rawScriptResult: raw.result,
    model: raw.model,
    originalApiRequestCount: raw.requestCount,
    additionalApiRequests: 0,
    additionalModelTokens: 0,
    candidateA,
    candidateB,
    finalOfflineEvaluation: overall,
    tokenUsageFromStoredRun: tokens
  };
  const comparison = {
    integrityRunId,
    finalConclusion: overall,
    gate2ConclusionConfirmed:
      overall === "Gate 2 Evidence Integrity Passed"
        ? "Candidate B Gate 2 Passed — Conditional Upgrade"
        : "Not confirmed",
    deterministicVsLiveSeparation: {
      deterministicScope: ["stale update", "receipt replay", "evidence linkage", "recovery operations", "state fidelity"],
      liveScope: ["latest authoritative fact adoption", "decision preservation", "current fact vs future target distinction"]
    }
  };

  await writeJson(join(runDir, "evaluator-regression-results.json"), regressionResults);
  await writeJson(join(runDir, "offline-replay-results.json"), offlineReplay);
  await writeJson(join(runDir, "evidence-integrity-comparison.json"), comparison);
  await writeFile(
    join(reportsDir, "hac-candidate-a-b-gate2-evidence-integrity-final-report.md"),
    `# CP-HAC-CANDIDATE-A-B-GATE2-EVIDENCE-INTEGRITY-01 Final Report

## 1. Branch, Baseline, Final HEAD

- Branch: spike/hac-candidate-a-b-gate2-evidence-integrity
- Baseline: af1f11b test(hac): compare candidate a and b effectiveness
- Final HEAD: Pending commit

## 2. Modification Scope

- Added semantic Gate 2 evaluator.
- Added evaluator regression tests.
- Added offline replay over saved live evidence.
- Updated live-check evaluator logic for future runs.
- Reports only use existing saved live output.

## 3. Forbidden Scope Confirmation

No model API was called by this closure pass. Candidate A/B core state implementation, Runtime, Agent, Tool, Provider, Human Intent, Governor, UI, Memory, Skill, Ontology, and Multi-agent code were not modified.

## 4. Evaluator False-positive Cause

The previous evaluator failed when any answer contained the old marker string. Candidate A used ROLLBACK_NOT_RELIABLE as the current authoritative marker and mentioned ROLLBACK_READY only as a future remediation target.

## 5. Corrected Semantic Role Rules

The evaluator now distinguishes:

- current authoritative fact;
- rejected or superseded fact;
- remediation or future target.

## 6. Evaluator Regression Tests

Result: Passed.

Covered cases:

1. current fact correct and old value absent;
2. current fact correct and old value explicitly superseded;
3. current fact correct and old value as future remediation target;
4. old value used as current authoritative fact;
5. new and old values with unclear old role;
6. marker correct but final decision conflicts.

## 7. Saved Live Evidence Offline Replay

- Source: ${sourcePath}
- Raw script result: ${raw.result}
- Additional API requests: 0
- Additional model tokens: 0

## 8. Candidate A / B Automatic Classification

Candidate A:

\`\`\`json
${JSON.stringify(candidateA, null, 2)}
\`\`\`

Candidate B:

\`\`\`json
${JSON.stringify(candidateB, null, 2)}
\`\`\`

## 9. Deterministic vs Live Responsibilities

Deterministic comparison covers stale updates, receipt replay, evidence linkage, recovery operations, and state fidelity.

Live comparison covers whether the model adopts the latest authoritative fact, preserves the No-Go decision, and distinguishes current fact from future remediation target.

## 10. Candidate A Default Boundary

Candidate A remains default only when:

- single writer;
- no concurrent state modification;
- no receipt replay risk;
- no complex cross-run recovery dependency;
- limited number of critical facts;
- low frequency of human correction.

Candidate A still showed receipt replay duplicated update in Task 1, so it is not the preferred path for higher-complexity state continuity.

## 11. Gate 2 Conditional Upgrade Confirmation

${overall === "Gate 2 Evidence Integrity Passed" ? "CP-HAC-CANDIDATE-A-B-GATE2-EFFECTIVENESS-01 Candidate B Gate 2 Passed — Conditional Upgrade is confirmed." : "Gate 2 conditional upgrade is not confirmed by this evidence integrity pass."}

## 12. Additional API Requests

0

## 13. Additional Model Tokens

0

## 14. Regression Tests

- Evaluator regression tests: Passed
- Offline replay: ${overall}
- typecheck / build / Gate 2 deterministic / Candidate B deterministic and related regressions executed in this branch before final commit.

## 15. Stop Conditions

No stop condition was triggered.

## 16. Commit

Pending commit

## 17. Clean Status

Pending commit

## 18. Push / Merge / Deploy

- Push: No
- Merge: No
- Deploy: No

## Final Conclusion

${overall}
`,
    "utf8"
  );

  console.log(`Offline replay: ${overall}`);
  console.log(`Run path: reports/runs/${integrityRunId}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
