# OpenAI Agents TypeScript Runtime Spine Candidate

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Date: 2026-06-15T19:36:59.511Z

## 1. Branch, HEAD, Git Status

Current branch at report generation: spike/openai-agents-ts-runtime
Current HEAD at report generation: c6fe840 test(openai-agents): add runtime spine candidate spike
Git status at report generation: M experiments/openai-agents-ts-runtime/reports/runtime-results.md
 M experiments/openai-agents-ts-runtime/src/agent.ts
 M experiments/openai-agents-ts-runtime/src/serialize-child.ts
 M experiments/openai-agents-ts-runtime/src/tests.ts
Formal baseline: dbb70a1 fix(webchat): prevent stale client context cache
Experiment branch: spike/openai-agents-ts-runtime
Formal Eliy business code modified: No

## 2. Pinned Package Versions

| Package | Exact Version | Scope |
|---|---:|---|
| @openai/agents | 0.11.6 | production |
| zod | 4.4.3 | production |
| typescript | 6.0.3 | dev |
| tsx | 4.22.4 | dev |
| @types/node | 25.9.3 | dev |

## 3. License and Dependency Scan

See reports/commercialization-gate.md and reports/license-inventory.json.

## 4. OpenAI API Key Present

OPENAI_API_KEY: No

## 5. Model

OPENAI_DEFAULT_MODEL present: No
Model used: gpt-5.4-mini

## 6. Test A-D Results

| Test | Result | Evidence |
|---|---|---|
| Test A \| Interruption | Credential Blocked | {"reason":"OPENAI_API_KEY absent; real model path not executed.","staticApi":["tool.needsApproval","RunResult.interruptions","RunResult.state","RunState.getInterruptions"],"toolExecutionCount":0} |
| Test B \| Reject | Credential Blocked | {"reason":"OPENAI_API_KEY absent; native RunState.reject path not executed against real model interruption.","staticApi":["RunState.reject(approvalItem)","run(agent, RunState)"],"toolExecutionCount":0} |
| Test C \| Approve | Credential Blocked | {"reason":"OPENAI_API_KEY absent; native RunState.approve path not executed against real model interruption.","staticApi":["RunState.approve(approvalItem)","run(agent, RunState)"],"toolExecutionCount":0} |
| Test D \| Serialize / Restart / Resume | Credential Blocked | {"reason":"OPENAI_API_KEY absent; no real pending RunState could be serialized.","staticApi":["RunState.toString()","RunState.fromString(agent, serializedState)"],"toolExecutionCount":0} |

## 7. Tool Calls Before Approval

0

## 8. Tool Calls After Reject

0

## 9. Tool Calls After Approve

0

## 10. Serialize / Restart / Resume Evidence

{
  "reason": "OPENAI_API_KEY absent; no real pending RunState could be serialized.",
  "staticApi": [
    "RunState.toString()",
    "RunState.fromString(agent, serializedState)"
  ],
  "toolExecutionCount": 0
}

## 11. Same RunState Continuity Evidence

Static public API evidence:
- RunResult.state is a RunState.
- RunState.getInterruptions() exposes pending approval items.
- RunState.approve() and RunState.reject() mutate the same SDK RunState.
- run(agent, RunState) resumes from SDK state.
- RunState.toString() and RunState.fromString() support local serialize / restore.

Runtime evidence requires OPENAI_API_KEY. Current credential status: No

## 12. Runtime Event Mapping

See reports/runtime-events-map.md.

## 13. Runtime Network Requests

See reports/network-requests.md.

## 14. Tracing

Tracing export disabled: Yes, via setTracingDisabled(true).
Hosted tools, MCP, OpenAI Conversations hosted Session, Web UI, remote DB: Not used.

## 15. OpenAI-specific Type Leakage

Contained to the experiment adapter boundary:
- RunState
- RunToolApprovalItem
- RunResult
- Agent
- tool()

No formal Eliy business code imports these types.

## 16. Modify Observation

See reports/modify-observation.md.

## 17. Custom Code

Custom code is limited to an isolated CLI spike under experiments/openai-agents-ts-runtime/src.
No UI, Gateway, Memory, Skill, MCP, database, queue, or formal Runtime implementation was added.

## 18. Final Conclusion

Credential Blocked
