# CP-HAC-CANDIDATE-B-SHARED-STATE-MINIMUM-SPIKE-01 Final Report

## 1. Branch And HEAD

- Branch: `spike/hac-candidate-b-shared-state-minimum`
- Behavior HEAD before Candidate B commit: `7144169 test(hac): record cross-task generalization live pass`
- Final commit: `Pending commit`
- Conclusion: `Candidate B Gate 1 Passed`

This result is limited to Gate 1 engineering feasibility. It does not claim Candidate B is better than Candidate A, does not validate Gate 2, and does not prove a complete Shared-State Workspace.

## 2. Modified Files

- `experiments/openai-agents-ts-runtime/package.json`
- `experiments/openai-agents-ts-runtime/src/operational-state.ts`
- `experiments/openai-agents-ts-runtime/src/loop-controller.ts`
- `experiments/openai-agents-ts-runtime/src/hac-scenario-fixtures.ts`
- `experiments/openai-agents-ts-runtime/src/state-transition.ts`
- `experiments/openai-agents-ts-runtime/src/agent-state-snapshot.ts`
- `experiments/openai-agents-ts-runtime/src/workspace-projection.ts`
- `experiments/openai-agents-ts-runtime/src/hac-candidate-b-tests.ts`
- `experiments/openai-agents-ts-runtime/src/hac-candidate-b-live-check.ts`
- `experiments/openai-agents-ts-runtime/reports/hac-candidate-b-shared-state-minimum-results.md`
- `experiments/openai-agents-ts-runtime/reports/hac-candidate-b-shared-state-minimum-live-report.md`
- `experiments/openai-agents-ts-runtime/reports/runs/candidate-b-live-1781669994268/candidate-b-live-run-manifest.json`

## 3. Final Minimal Schema

The existing `OperationalState` remains the only cross-run task truth source.

Added fields:

- `version: number`
- `updatedAt: string`

Not added in Gate 1:

- separate `SharedOperationalState`
- separate Workspace state
- `stateId`
- `taskId`
- independent `actions[]`
- independent `unknowns[]`
- independent `decisions[]`
- `unresolvedConflicts`
- database
- event sourcing
- ontology

Existing fields remain the task state surface: `loopId`, `intent`, `iteration`, `status`, `facts`, `assumptions`, `openQuestions`, `humanDecisions`, `actionReceipts`, `currentStep`, `nextCandidateAction`, `lastVerification`, `stopReason`, and `bounds`.

## 4. State Transition Rules

`applyStateTransition(currentState, transition)` is the single Candidate B write entry point.

Implemented operations:

- human correction of an existing fact;
- agent addition of an assumption;
- evidence-linked Action Receipt application;
- minimal status update.

Rules:

- `expectedVersion` must equal `currentState.version`;
- stale transitions return `VERSION_CONFLICT`;
- rejected transitions do not mutate state and do not increment version;
- successful transitions increment version exactly once;
- `updatedAt` changes only on successful transition;
- direct Human Intent modification through transition is rejected;
- agent-provided content can enter `assumptions`, not `facts`;
- duplicate Action Receipt application is idempotent no-op.

## 5. Single Source Of Truth

`OperationalState` remains the only cross-run operational truth source.

- Agent Snapshot is read-only and derived from `OperationalState`.
- Workspace Projection is a pure projection from `OperationalState`.
- Projection has no store, no save path, no version authority, and no update API.
- Mutating a projection object does not mutate source state.
- OpenAI Agents SDK `RunState` remains the runtime execution state and was not wrapped or copied.

## 6. Evidence And Receipt Linkage

Action Receipt transitions require non-empty `evidenceRefs`.

Evidence linkage used in Gate 1:

- fact correction records actor, reason, transition id, and evidence refs;
- Action Receipt transition records evidence reference such as `action_receipt:<toolCallId>`;
- duplicate receipt detection uses existing `toolCallId` + `toolName`;
- model narrative is not accepted as proof of tool execution.

`HacActionReceipt` public semantics were not changed.

## 7. Golden Tests A-H

| Test | Result | Evidence |
|---|---|---|
| B-GT-01 Single Source of Operational Truth | Passed | Snapshot and projection derive from `OperationalState`; projection mutation did not mutate source. |
| B-GT-02 Optimistic Version Check | Passed | Correct version transition incremented once; stale version was rejected without mutation. |
| B-GT-03 Fact Correction | Passed | Human correction updated the identified fact and next snapshot used corrected value. |
| B-GT-04 Assumption Separation | Passed | Agent-added content remained in assumptions through save, load, and snapshot. |
| B-GT-05 Evidence-linked Transition | Passed | Receipt transition without evidence was rejected; evidence-linked receipt applied. |
| B-GT-06 Resume Fidelity | Passed | Saved and reloaded state preserved loopId, version, facts, assumptions, receipts. |
| B-GT-07 No Parallel UI Truth | Passed | Projection mutation did not alter source; re-projection restored authoritative status/version. |
| B-GT-08 Idempotent Receipt Application | Passed | Duplicate receipt returned no-op, did not append, and did not increment version. |

Command:

```bash
npm run test:hac-candidate-b
```

Result:

```text
Candidate B Shared Operational State deterministic Golden Tests: Passed
```

## 8. Regression Test Results

Executed in this branch before final live evidence:

- `npm run typecheck`: Passed
- `npm run build`: Passed
- `npm run test:hac-candidate-b`: Passed
- `npm run test:hac-thin-harness`: Passed
- `npm run test:hac-decision-model`: Passed
- `npm run test:hac-minimum-loop`: deterministic paths Passed; live credential was not used in that command
- `npm run test:hac-loop-cross-task-generalization`: customer complaint, product launch, and restore subpaths Passed; non-credential overall report remained Failed and was not included as Candidate B evidence

No cross-task non-credential report or manifest is included in this Candidate B final evidence set.

## 9. Live Model Check Result

Command executed once in the local credential terminal:

```bash
npm run test:hac-candidate-b-live
```

Evidence:

- Live report: `reports/hac-candidate-b-shared-state-minimum-live-report.md`
- Passed manifest: `reports/runs/candidate-b-live-1781669994268/candidate-b-live-run-manifest.json`
- `DEEPSEEK_API_KEY`: `SET`
- API request count: `1`
- Model: `deepseek-v4-flash`
- Provider: DeepSeek OpenAI-compatible Chat Completions
- Initial snapshot contained old marker: `true`
- Transition version before: `1`
- Transition version after: `2`
- Latest snapshot contained corrected marker: `true`
- Latest snapshot contained old marker: `false`
- Model answer: `The current authoritative issue marker is SUPPORT_RESPONSE_DELAY_CONFIRMED.`
- `mentionsCorrected`: `true`
- `mentionsOld`: `false`

Result:

```text
Candidate B Gate 1 Passed
```

## 10. Token And Run Count

Live model check:

- API request count: `1`
- Prompt tokens: `414`
- Completion tokens: `18`
- Total tokens: `432`
- Prompt cache hit tokens: `0`
- Prompt cache miss tokens: `414`

No external Tool was invoked during Candidate B live check.

## 11. Stop Conditions

No architecture stop condition was triggered.

Not triggered:

- second Operational State;
- SDK Runtime or RunState modification;
- UI, Memory, Skill, Ontology, database, or multi-agent integration;
- new persistence infrastructure;
- Action Receipt public semantic change;
- Projection becoming a parallel truth source;
- Candidate A regression requiring rollback.

## 12. Known Limits

This Gate 1 result proves only minimal engineering feasibility for versioned Shared Operational State.

It does not prove:

- Candidate B superiority over Candidate A;
- Gate 2 effectiveness;
- complete Shared-State Workspace;
- UI workspace behavior;
- long-term Memory;
- ontology;
- multi-agent coordination;
- production concurrency control;
- database-backed persistence;
- cross-user or multi-tenant state governance.

## 13. Candidate B Code Delta

Actual delta:

- 2 fields added to existing `OperationalState`;
- 1 transition entry point;
- 1 read-only Agent snapshot adapter;
- 1 read-only Workspace projection function;
- deterministic Golden Tests;
- one-shot live model check command.

The implementation remains a Thin Extension over Candidate A. It does not rebuild Runtime, Tool execution, RunState, or Action Receipt.

## 14. Git Status Before Commit

Expected staged/committed set is limited to Candidate B code, tests, reports, and passed live manifest.

At report generation time, commit was still pending.

## 15. Commit

`Pending commit`

## 16. Push / Merge / Deploy

- Push: No
- Merge: No
- Deploy: No

## 17. Final Conclusion

```text
Candidate B Gate 1 Passed
```
