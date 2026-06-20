# Runtime Events Map

| HAC needed semantic | SDK actual object / event | Obtainable | Notes |
|---|---|---|---|
| tool_requested | RunResult.interruptions[] / RunToolApprovalItem.rawItem | Yes, with credential | Function tool approval interruption exposes tool name, callId, and arguments. |
| run_interrupted | RunResult.interruptions.length > 0 and RunState.getInterruptions() | Yes, with credential | The SDK returns pending approval items and resumable RunState. |
| human_approved | RunState.approve(approvalItem) | Yes, with credential | Public SDK API records approval on the same RunState before resume. |
| human_rejected | RunState.reject(approvalItem, { message }) | Yes, with credential | Public SDK API records rejection and optional model-visible message. |
| tool_started | Local tool execute callback start | Yes, with credential | Evidence from local execution log; SDK callback is the public tool boundary. |
| tool_result | RunToolCallOutputItem / local tool execute callback output | Yes, with credential | Evidence from RunResult.newItems and local execution log. |
| run_completed | RunResult.finalOutput and no pending interruptions | Yes, with credential | Normal completion after resume. |

Public intervention points:
- Before execution: FunctionTool.needsApproval.
- Human decision: RunState.approve() / RunState.reject().
- Resume: run(agent, existingRunState).
- Serialization: RunState.toString() and RunState.fromString().

OpenAI-specific objects can be isolated behind a thin adapter around RunState, RunToolApprovalItem, RunResult, and local tool execution logs.
