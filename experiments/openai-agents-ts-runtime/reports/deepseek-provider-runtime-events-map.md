# DeepSeek Provider Runtime Events Map

| HAC semantic | SDK actual object / event | Test evidence | Thin adapter isolatable |
|---|---|---|---|
| tool_requested | SDK Result/State object: RunResult.interruptions[] / RunToolApprovalItem.rawItem | Not Run | Yes |
| run_interrupted | SDK Result/State object: RunResult.interruptions.length > 0 / RunState.getInterruptions() | Not Run | Yes |
| human_approved | SDK Runtime operation: RunState.approve(approvalItem) | Not Run | Yes |
| human_rejected | SDK Runtime operation: RunState.reject(approvalItem, { message }) | Not Run | Yes |
| tool_started | Experiment local log at tool execute callback start | Not Run | Yes |
| tool_result | SDK result item plus experiment local tool execution output | Not Run | Yes |
| run_completed | SDK Result object: RunResult.finalOutput and zero pending interruptions | Passed | Yes |

SDK-native objects are RunResult, RunState, and RunToolApprovalItem. Tool execution count and network records are experiment logs.
