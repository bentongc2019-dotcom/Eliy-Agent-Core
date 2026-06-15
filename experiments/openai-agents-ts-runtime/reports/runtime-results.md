# Runtime Results

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Date: 2026-06-15T19:36:59.481Z
Conclusion: Credential Blocked

| Test | Result | Evidence |
|---|---|---|
| Test A \| Interruption | Credential Blocked | {"reason":"OPENAI_API_KEY absent; real model path not executed.","staticApi":["tool.needsApproval","RunResult.interruptions","RunResult.state","RunState.getInterruptions"],"toolExecutionCount":0} |
| Test B \| Reject | Credential Blocked | {"reason":"OPENAI_API_KEY absent; native RunState.reject path not executed against real model interruption.","staticApi":["RunState.reject(approvalItem)","run(agent, RunState)"],"toolExecutionCount":0} |
| Test C \| Approve | Credential Blocked | {"reason":"OPENAI_API_KEY absent; native RunState.approve path not executed against real model interruption.","staticApi":["RunState.approve(approvalItem)","run(agent, RunState)"],"toolExecutionCount":0} |
| Test D \| Serialize / Restart / Resume | Credential Blocked | {"reason":"OPENAI_API_KEY absent; no real pending RunState could be serialized.","staticApi":["RunState.toString()","RunState.fromString(agent, serializedState)"],"toolExecutionCount":0} |

OPENAI_DEFAULT_MODEL present: No
Model configured: gpt-5.4-mini
Tracing export disabled: Yes, via setTracingDisabled(true)
Hosted Tools used: No
OpenAI Conversations hosted Session used: No
MCP used: No
