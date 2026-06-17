# CP-HAC-CANDIDATE-A-B-GATE2-EVIDENCE-INTEGRITY-01 Final Report

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

- Source: /Users/rich1350/Documents/Eliy-Agent-Core/experiments/openai-agents-ts-runtime/reports/runs/candidate-a-b-gate2-live-1781674377493/live-comparison.json
- Raw script result: Live comparison failed
- Additional API requests: 0
- Additional model tokens: 0

## 8. Candidate A / B Automatic Classification

Candidate A:

```json
{
  "candidate": "candidate-a",
  "authoritativeFactDetected": "ROLLBACK_NOT_RELIABLE",
  "supersededFactDetected": null,
  "remediationTargetDetected": "ROLLBACK_READY",
  "decisionDetected": "No-Go",
  "usesLatestFact": true,
  "evaluationResult": "Passed",
  "evaluationReasons": [
    "Current authoritative marker detected as ROLLBACK_NOT_RELIABLE.",
    "Old marker ROLLBACK_READY appears as remediation or future target.",
    "Decision detected as No-Go."
  ]
}
```

Candidate B:

```json
{
  "candidate": "candidate-b",
  "authoritativeFactDetected": "ROLLBACK_NOT_RELIABLE",
  "supersededFactDetected": null,
  "remediationTargetDetected": null,
  "decisionDetected": "No-Go",
  "usesLatestFact": true,
  "evaluationResult": "Passed",
  "evaluationReasons": [
    "Current authoritative marker detected as ROLLBACK_NOT_RELIABLE.",
    "Decision detected as No-Go."
  ]
}
```

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

CP-HAC-CANDIDATE-A-B-GATE2-EFFECTIVENESS-01 Candidate B Gate 2 Passed — Conditional Upgrade is confirmed.

## 12. Additional API Requests

0

## 13. Additional Model Tokens

0

## 14. Regression Tests

- Evaluator regression tests: Passed
- Offline replay: Gate 2 Evidence Integrity Passed
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

Gate 2 Evidence Integrity Passed
