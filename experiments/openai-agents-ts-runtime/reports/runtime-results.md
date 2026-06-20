# Runtime Results

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Date: 2026-06-15T19:55:22.636Z
Conclusion: OpenAI Runtime Candidate Passed

| Test | Result | Evidence |
|---|---|---|
| Test A \| Interruption | Passed | {"interruption":{"toolName":"prepare_refund","callId":"call_o2C97B1476jcL4VVMiQdI4y4","arguments":"{\"amount\":12.34,\"reason\":\"delayed delivery\"}","rawType":"function_call"},"toolExecutionCount":0,"stateSchemaVersion":"1.12"} |
| Test B \| Reject | Passed | {"toolExecutionCount":0,"finalOutput":"已提交退款准备请求。","interruptionsAfterResume":0,"sameStateResumed":true} |
| Test C \| Approve | Passed | {"beforeApproveCount":0,"toolExecutionCount":1,"approval":{"toolName":"prepare_refund","callId":"call_ZsAzj6IxOeJMY5RU9U2PciL9","arguments":"{\"amount\":12.34,\"reason\":\"delayed delivery\"}","rawType":"function_call"},"finalOutput":"已准备退款：12.34，原因：delayed delivery。","interruptionsAfterResume":0,"sameStateResumed":true} |
| Test D \| Serialize / Restart / Resume | Passed | {"statePath":"/Users/rich1350/Documents/Eliy-Agent-Core/experiments/openai-agents-ts-runtime/state/pending-runstate.json","pendingApproval":{"toolName":"prepare_refund","callId":"call_3RHdNMgVm6UGsjAUmHNxKVLd","arguments":"{\"amount\":12.34,\"reason\":\"delayed delivery\"}","rawType":"function_call"},"childResult":{"decision":"approve","before":1,"after":2,"finalOutput":"已处理。","interruptionsAfterResume":0,"stateSchemaVersion":"1.12"},"sameRunStatePathUsed":true,"originalPromptResubmitted":false} |

OPENAI_DEFAULT_MODEL present: Yes
Model configured: gpt-5.4-mini
Tracing export disabled: Yes, via setTracingDisabled(true)
Hosted Tools used: No
OpenAI Conversations hosted Session used: No
MCP used: No
