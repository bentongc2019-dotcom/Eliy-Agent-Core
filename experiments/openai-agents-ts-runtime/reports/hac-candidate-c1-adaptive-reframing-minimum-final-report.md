# CP-HAC-CANDIDATE-C1-ADAPTIVE-REFRAMING-MINIMUM-SPIKE-01 Final Report

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
| C1-GT-01｜Single-loop Sufficient No Trigger | Passed | No contradiction, no bounded no-progress, and no human request produced NO_REFLECTIVE_TRIGGER. |
| C1-GT-02｜Single Failure No Trigger | Passed | A single failed action with evidence but no bounded no-progress or contradiction did not trigger Candidate C. |
| C1-GT-03｜Bounded No Progress Trigger | Passed | boundedNoProgress with evidence triggered BOUNDED_NO_PROGRESS. |
| C1-GT-04｜Outcome Contradiction Trigger | Passed | Verified outcome contradiction with evidence triggered reframe. |
| C1-GT-05｜Goal–Metric Divergence Trigger | Passed | Goal-metric divergence with evidence triggered reframe. |
| C1-GT-06｜Explicit Human Request | Passed | Explicit human reframe request triggered without external evidence. |
| C1-GT-07｜Missing Evidence Rejected | Passed | Non-human trigger without evidence returned MISSING_TRIGGER_EVIDENCE and did not trigger. |
| C1-GT-08｜Upgrade to Shared State First | Passed | minimum-loop state upgraded to shared-state before writing the reframe proposal; no third mode was introduced. |
| C1-GT-09｜Proposal Does Not Auto-Apply | Passed | Proposal write changed only mode/proposal/version metadata; facts, assumptions, and Intent remained unchanged. |
| C1-GT-10｜Proposal Resume Fidelity | Passed | Proposal ID, basedOnStateVersion, trigger reasons, evidence refs, and content survived save/load. |
| C1-GT-11｜Stale Proposal Rejected | Passed | Intervening transition made proposal stale; confirm returned STALE_REFRAME_PROPOSAL without mutation. |
| C1-GT-12｜Human Confirm | Passed | Confirm updated assumption, left facts and Intent unchanged, recorded HumanDecision, and cleared proposal. |
| C1-GT-13｜Human Reject | Passed | Reject preserved original assumption, recorded HumanDecision, cleared proposal, and did not leak proposed frame into snapshot. |
| C1-GT-14｜Human Defer | Passed | Defer preserved original assumption, recorded HumanDecision, cleared proposal, and did not keep a pending review queue. |
| C1-GT-15｜Duplicate Decision Protection | Passed | Second decision for completed proposal returned idempotent no-op without version or HumanDecision duplication. |
| C1-GT-16｜Single Operational Truth | Passed | Proposal lives in OperationalState; projection mutation did not change source; RunState is not used for proposal truth. |
| C1-GT-17｜Candidate A / B Regression | Passed | minimum-loop default, shared-state activation, fact correction, and receipt idempotency remained available. |
| C1-GT-18｜No External Dependency | Passed | API requests=0; model tokens=0; no network and no credentials required. |

## 10. A / B Regression

Candidate A default minimum-loop and Candidate B shared-state mechanics remain available.

- npm run test:hac-shared-state-activation-policy: Passed.
- npm run test:hac-conditional-shared-state-harness-integration: Passed.
- npm run test:hac-candidate-b: deterministic Golden Tests Passed; live model check remained Credential Blocked because DEEPSEEK_API_KEY was not set in this shell.
- npm run test:hac-candidate-a-b-gate2: deterministic comparison Passed; script-level architecture conclusion remained Gate 2 Inconclusive as in the existing offline command semantics.
- npm run test:hac-minimum-loop: deterministic Candidate A paths Passed; live model path remained Credential Blocked because DEEPSEEK_API_KEY was not set in this shell.
- npm run test:hac-loop-cross-task-generalization: customer complaint, product launch, and restore deterministic subpaths Passed; existing non-credential overall report remained Failed and was not treated as a live pass.

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
