# OpenAI Agents TypeScript Runtime Spine Candidate

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Date: 2026-06-15T19:55:22.686Z

## 1. Branch, HEAD, Git Status

Current branch at report generation: spike/openai-agents-ts-runtime
Current HEAD at report generation: 5a86d45 test(openai-agents): run native model runtime acceptance
Git status at report generation: M experiments/openai-agents-ts-runtime/reports/final-report.md
 M experiments/openai-agents-ts-runtime/reports/network-requests.md
 M experiments/openai-agents-ts-runtime/reports/runtime-network-records.json
 M experiments/openai-agents-ts-runtime/reports/runtime-results.md
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

OPENAI_API_KEY: Yes

## 5. Model

OPENAI_DEFAULT_MODEL present: Yes
Model used: gpt-5.4-mini

## 6. Test A-D Results

| Test | Result | Evidence |
|---|---|---|
| Test A \| Interruption | Passed | {"interruption":{"toolName":"prepare_refund","callId":"call_o2C97B1476jcL4VVMiQdI4y4","arguments":"{\"amount\":12.34,\"reason\":\"delayed delivery\"}","rawType":"function_call"},"toolExecutionCount":0,"stateSchemaVersion":"1.12"} |
| Test B \| Reject | Passed | {"toolExecutionCount":0,"finalOutput":"已提交退款准备请求。","interruptionsAfterResume":0,"sameStateResumed":true} |
| Test C \| Approve | Passed | {"beforeApproveCount":0,"toolExecutionCount":1,"approval":{"toolName":"prepare_refund","callId":"call_ZsAzj6IxOeJMY5RU9U2PciL9","arguments":"{\"amount\":12.34,\"reason\":\"delayed delivery\"}","rawType":"function_call"},"finalOutput":"已准备退款：12.34，原因：delayed delivery。","interruptionsAfterResume":0,"sameStateResumed":true} |
| Test D \| Serialize / Restart / Resume | Passed | {"statePath":"/Users/rich1350/Documents/Eliy-Agent-Core/experiments/openai-agents-ts-runtime/state/pending-runstate.json","pendingApproval":{"toolName":"prepare_refund","callId":"call_3RHdNMgVm6UGsjAUmHNxKVLd","arguments":"{\"amount\":12.34,\"reason\":\"delayed delivery\"}","rawType":"function_call"},"childResult":{"decision":"approve","before":1,"after":2,"finalOutput":"已处理。","interruptionsAfterResume":0,"stateSchemaVersion":"1.12"},"sameRunStatePathUsed":true,"originalPromptResubmitted":false} |

## 7. Tool Calls Before Approval

0

## 8. Tool Calls After Reject

0

## 9. Tool Calls After Approve

1

## 10. Serialize / Restart / Resume Evidence

{
  "statePath": "/Users/rich1350/Documents/Eliy-Agent-Core/experiments/openai-agents-ts-runtime/state/pending-runstate.json",
  "pendingApproval": {
    "toolName": "prepare_refund",
    "callId": "call_3RHdNMgVm6UGsjAUmHNxKVLd",
    "arguments": "{\"amount\":12.34,\"reason\":\"delayed delivery\"}",
    "rawType": "function_call"
  },
  "childResult": {
    "decision": "approve",
    "before": 1,
    "after": 2,
    "finalOutput": "已处理。",
    "interruptionsAfterResume": 0,
    "stateSchemaVersion": "1.12"
  },
  "sameRunStatePathUsed": true,
  "originalPromptResubmitted": false
}

## 11. Same RunState Continuity Evidence

Static public API evidence:
- RunResult.state is a RunState.
- RunState.getInterruptions() exposes pending approval items.
- RunState.approve() and RunState.reject() mutate the same SDK RunState.
- run(agent, RunState) resumes from SDK state.
- RunState.toString() and RunState.fromString() support local serialize / restore.

Runtime evidence requires OPENAI_API_KEY. Current credential status: Yes

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

OpenAI Runtime Candidate Passed
