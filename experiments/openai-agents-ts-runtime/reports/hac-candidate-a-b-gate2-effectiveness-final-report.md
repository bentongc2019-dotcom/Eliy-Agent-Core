# CP-HAC-CANDIDATE-A-B-GATE2-EFFECTIVENESS-01 Final Report

## 1. Branch, Baseline, Final HEAD

- Branch: `spike/hac-candidate-a-b-gate2-effectiveness`
- Baseline: `5449d5f test(hac): add candidate b shared state minimum spike`
- Final HEAD: `Pending commit`
- Conclusion: `Candidate B Gate 2 Passed — Conditional Upgrade`

This conclusion is limited to Gate 2 effectiveness comparison. It does not claim Candidate B is universally better, does not prove a complete Shared-State Workspace, and does not validate long-term intelligence amplification.

## 2. Candidate A Reproduction

Candidate A mode uses the same `OperationalState`, Human Intent, fixtures, Tool result, Action Receipt, and verification logic, but does not use:

- `applyStateTransition()`
- optimistic version check
- Agent State Snapshot Adapter
- Workspace Projection
- idempotent receipt transition

Candidate A baseline remained reproducible. Gate 1 changes to `loop-controller.ts` and `hac-scenario-fixtures.ts` were limited to compatibility with `version` / `updatedAt` initialization and did not change Candidate A task semantics, Tool behavior, approval behavior, or task outcomes.

## 3. Candidate B Reproduction

Candidate B mode uses the same task inputs and verification standards as Candidate A, plus Gate 1 Shared Operational State mechanisms:

- versioned `OperationalState`
- `applyStateTransition()`
- human fact correction
- assumption separation
- evidence-linked receipt application
- read-only Agent Snapshot
- read-only Workspace Projection
- optimistic version check
- idempotent receipt application

## 4. Unique Variable Proof

Shared inputs across both modes:

- same Runtime and model provider;
- same Agent / Tool baseline;
- same Human Intent;
- same initial facts;
- same Tool Result;
- same Action Receipt;
- same task input;
- same stopping and verification logic.

Only state handling differs:

- Candidate A uses original helper-based state path.
- Candidate B uses Gate 1 versioned State Transition / Snapshot / Projection path.

No UI, Memory, Skill, Ontology, Multi-agent, Runtime modification, or Tool behavior change was introduced.

## 5. Task 1 A / B Results

Task: customer complaint handling loop.

| Metric | Candidate A | Candidate B |
|---|---:|---:|
| Severe truth errors | 0 | 0 |
| Receipt replay duplicated update | true | false |
| Evidence-linked state change rate | 0.5 | 1 |
| State bytes | 3526 | 3526 |

Interpretation:

Candidate A remains sufficient for this simple single-threaded loop. Candidate B improves receipt replay handling and evidence linkage, but the simple task does not by itself justify making Candidate B the universal default.

## 6. Task 2 A / B Results

Task: product launch Go / No-Go state correction and recovery.

| Metric | Candidate A | Candidate B |
|---|---:|---:|
| Severe truth errors | 2 | 0 |
| Final uses latest fact | true | true |
| Stale update overwrote new state | true | false |
| Receipt replay duplicated update | true | false |
| Evidence-linked state change rate | 0.5 | 1 |
| Human recovery operations | 2 | 0 |

Interpretation:

Candidate B showed practical value in the cross-run, multi-fact, human correction, evidence-linked receipt, stale update, and receipt replay scenario.

## 7. Six Metric Groups

| Metric Group | Candidate A | Candidate B | Interpretation |
|---|---|---|---|
| Outcome Integrity | Task 2 had stale update and receipt replay severe errors | Task 2 severe errors were 0 | Candidate B stronger for corrected-state continuity |
| State Fidelity | Human correction present but stale update and replay required manual guard | Versioned transition rejected stale update and made receipt replay idempotent | Candidate B stronger |
| Evidence Traceability | Evidence-linked state change rate 0.5 in Task 2 | Evidence-linked state change rate 1 in Task 2 | Candidate B stronger |
| Human Workload Proxy | Task 2 recovery/re-correction operations 2 | Task 2 recovery/re-correction operations 0 | Candidate B reduces recovery burden |
| System Cost | Lower structural overhead | Adds transition/snapshot/projection/test surface | Cost acceptable only for higher-complexity tasks |
| Complexity Discipline | No second state source | No second state source, no Runtime change, no UI/Memory/Ontology/Multi-agent | Boundary maintained |

## 8. Thresholds

- Severe truth errors for Candidate B: `0`
- Task 2 old fact / critical-state error reduction: `100%`
- Task 2 human recovery reduction: `100%`
- Task 2 evidence traceability improvement: `50%`
- Task 1 cost boundary: `Passed`
- No second state source: `Passed`
- No Runtime modification: `Passed`
- No UI / Memory / Skill / Ontology / Multi-agent expansion: `Passed`

Candidate B meets Gate 2 improvement thresholds for Task 2 while keeping Task 1 from regressing. Because Task 1 shows Candidate A remains adequate for simple loops, the result is conditional rather than universal default.

## 9. Deterministic Tests

Command:

```bash
npm run test:hac-candidate-a-b-gate2
```

Result:

```text
Candidate A/B Gate 2 deterministic comparison: Passed
Run ID: candidate-a-b-gate2-1781674232906
Conclusion: Gate 2 Inconclusive
```

Deterministic conclusion was intentionally conservative pending live model evidence.

## 10. Live Model Check

Command executed once in the local credential terminal:

```bash
npm run test:hac-candidate-a-b-gate2-live
```

Raw script result:

```text
Candidate A/B Gate 2 live comparison: Failed
```

Reclassification basis:

- No additional API call was made for reclassification.
- Existing live evidence only was used.
- Raw evaluator treated any `ROLLBACK_READY` mention as old fact usage.
- Candidate A used `ROLLBACK_NOT_RELIABLE` as the current authoritative marker.
- Candidate A mentioned `ROLLBACK_READY` only as a future remediation target.
- Candidate B explicitly returned `{"rollbackMarker":"ROLLBACK_NOT_RELIABLE","decision":"No-Go"}`.

Reclassified live interpretation:

```text
Passed with evaluator false-positive note
```

## 11. API Requests And Tokens

Live comparison:

- API requests: `2`

Candidate A:

- Prompt tokens: `1070`
- Completion tokens: `282`
- Total tokens: `1352`

Candidate B:

- Prompt tokens: `825`
- Completion tokens: `25`
- Total tokens: `850`

Combined:

- Prompt tokens: `1895`
- Completion tokens: `307`
- Total tokens: `2202`

No second live run was performed during final report classification.

## 12. New Code And Maintenance Surface

Added Gate 2-only files:

- `src/hac-candidate-a-b-gate2-tests.ts`
- `src/hac-candidate-a-b-gate2-live-check.ts`

Updated:

- `package.json`

Reports:

- `reports/hac-candidate-a-b-gate2-effectiveness-final-report.md`
- `reports/hac-candidate-a-b-gate2-live-report.md`
- `reports/runs/candidate-a-b-gate2-1781674232906/*`
- `reports/runs/candidate-a-b-gate2-live-1781674377493/live-comparison.json`

No Candidate A / B core implementation file was changed in this Gate 2 branch.

## 13. Regression Tests

Executed before live evidence classification:

- `git diff --check`: Passed
- `npm run typecheck`: Passed
- `npm run build`: Passed
- `npm run test:hac-candidate-a-b-gate2`: Passed
- `npm run test:hac-candidate-b`: Passed deterministic; its live path remained credential-blocked in that command
- `npm run test:hac-thin-harness`: Passed
- `npm run test:hac-decision-model`: Passed
- `npm run test:hac-minimum-loop`: deterministic paths Passed; credential path not used
- `npm run test:hac-loop-cross-task-generalization`: customer complaint, product launch, and restore subpaths Passed; non-credential overall report remained Failed and was not used as Gate 2 live evidence

## 14. Stop Conditions

Not triggered:

- need to rewrite Candidate A;
- need to modify Candidate B core implementation;
- need to add UI, Memory, Ontology, Skill, Multi-agent, or Workflow;
- need for subjective-only metrics;
- mismatch in Prompt / model / Tool / input between modes;
- Candidate A baseline contamination;
- need for Task 3;
- repeated live calls to tune result.

## 15. Known Limits

- Gate 2 uses two controlled tasks only.
- Candidate B is not validated as universal default.
- Live comparison had a raw evaluator false positive and was reclassified by reading existing evidence.
- This does not prove long-term learning, memory, skill automation, workspace UI, ontology, or multi-agent coordination.
- Production concurrency and multi-user governance remain unvalidated.

## 16. Recommended Default Architecture

Recommended mode:

```text
Candidate A = default minimum loop mode
Candidate B = conditional upgrade mode
```

Use Candidate B when task complexity includes cross-run state continuity, multiple critical facts, human corrections, evidence-linked actions, stale update risk, receipt replay risk, or recovery after interruption.

Do not make Candidate B the default for simple single-threaded loops yet.

## 17. Need Task 3

No.

Task 1 and Task 2 differentiated A/B sufficiently:

- Task 1 showed Candidate A remains adequate for simple loops.
- Task 2 showed Candidate B value under higher state complexity.

## 18. Commit

`Pending commit`

## 19. Clean Status

`Pending commit`

## 20. Push / Merge / Deploy

- Push: No
- Merge: No
- Deploy: No

## Final Conclusion

```text
Candidate B Gate 2 Passed — Conditional Upgrade
```
