# DeepSeek Provider Compatibility Final Report

Task: CP-HAC-OPENAI-AGENTS-TS-DEEPSEEK-COMPATIBILITY-SPIKE-01
Date: 2026-06-15T20:52:16.259Z

## 1. Branch / HEAD / Git Status

Branch: spike/openai-agents-ts-deepseek-provider
Baseline Commit: 92da792 test(openai-agents): record native runtime acceptance pass
Current HEAD at report generation: 88e5d87 test(openai-agents): validate deepseek provider compatibility
Git status at report generation: clean

## 2. SDK and Dependencies

| Package | Version |
|---|---:|
| @openai/agents | 0.11.6 |
| openai | 6.42.0 |
| zod | 4.4.3 |

## 3. Provider

Runtime: OpenAI Agents SDK TypeScript
Provider: DeepSeek OpenAI-compatible Chat Completions
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash
API key present: SET

## 4. API Connectivity

Status: Passed
HTTP Status: Not available
Error Type: None
Request ID: Not available
Tool Calling: Passed

## 5. Test Results

| Test | Result | Evidence |
|---|---|---|
| Test A \| Interruption | Passed | {"interruption":{"toolName":"prepare_refund","callId":"call_00_BF4hwghbDDT6pnai1Qw78908","arguments":"{\"amount\": 12.34, \"reason\": \"delayed delivery\"}","rawType":"function_call"},"toolExecutionCount":0,"stateSchemaVersion":"1.12"} |
| Test B \| Reject | Passed | {"toolExecutionCount":0,"finalOutput":"退款请求已提交，但被拒绝了。系统记录显示金额为 12.34，原因为 \"delayed delivery\"。","interruptionsAfterResume":0,"sameStateResumed":true,"originalPromptResubmitted":false} |
| Test C \| Approve | Passed | {"beforeApproveCount":0,"toolExecutionCount":1,"approval":{"toolName":"prepare_refund","callId":"call_00_aHqqGFvGpebfrZZlJ5VH4139","arguments":"{\"amount\": 12.34, \"reason\": \"delayed delivery\"}","rawType":"function_call"},"finalOutput":"退款已成功准备。以下是处理结果：\n\n- **金额**：12.34\n- **原因**：delayed delivery（交付延误）\n- **状态**：模拟处理完成 ✅\n\n请注意：这是一个模拟操作，仅生成了本地执行日志，并未实际执行真实退款。","interruptionsAfterResume":0,"sameStateResumed":true,"originalPromptResubmitted":false} |
| Test D \| Serialize / Restart / Resume | Passed | {"oldProcessPid":51756,"newProcessPid":51760,"stateFileSha256":"ae896891169822cd6dee16d7b686f31c0d5ed6a22dd02d7641b4d7e0e0aafdf9","stateFileBytes":6800,"pendingApproval":{"toolName":"prepare_refund","callId":"call_00_C3SUCrRPJgdGPUKx5vqf5429","arguments":"{\"amount\": 12.34, \"reason\": \"delayed delivery\"}","rawType":"function_call"},"childResult":{"provider":{"baseURL":"https://api.deepseek.com","model":"deepseek-v4-flash"},"newProcessPid":51760,"stateFileSha256":"ae896891169822cd6dee16d7b686f31c0d5ed6a22dd02d7641b4d7e0e0aafdf9","stateFileBytes":6800,"decision":"approve","before":1,"after":2,"finalOutput":"已成功调用 `prepare_refund` 工具处理退款。退款金额为 **12.34**，原因为 **delayed delivery（交付延误）**。工具返回模拟处理成功的结果。","interruptionsAfterResume":0,"rawResponseCount":2,"usage":[{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]},{"requests":1,"inputTokens":512,"outputTokens":41,"totalTokens":553,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}],"stateSchemaVersion":"1.12"},"sameRunStatePathUsed":true,"originalPromptResubmitted":false} |

## 6. Tool Execution Counts

Before approval: 0
After reject: 0
After approve: 1

## 7. R1-R6

| Capability | Result |
|---|---|
| R1 Tool execution can be intercepted before execution | Passed |
| R2 Unauthorized tool does not execute | Passed |
| R3 Approve / Reject are structured Runtime operations | Passed |
| R4 Same RunState resumes after decision | Passed |
| R5 State serializes and resumes across process | Passed |
| R6 Runtime state/events can be structurally mapped | Passed |

## 8. OpenAI Native Baseline Comparison

| Item | OpenAI native model | DeepSeek V4 Flash |
|---|---|---|
| Tool Call produced | Passed | Passed |
| Interruption | Passed | Passed |
| Reject | Passed | Passed |
| Approve | Passed | Passed |
| Same RunState Resume | Passed | Passed |
| Cross-process Recovery | Passed | Passed |
| Tool execution count correct | Passed | Passed |
| Event Mapping | Passed | Passed |
| Patch / Fork | None | None |
| Provider-specific code | Baseline | 64 lines in src/deepseek-provider.ts |


## 9. Provider Adapter

Implementation: src/deepseek-provider.ts
Provider-specific code lines: 64
Uses public APIs: setDefaultOpenAIClient(), setOpenAIAPI("chat_completions"), setTracingDisabled(true)
Agent / Tool / RunState main logic changed for provider: No
Thin Model Provider Adapter feasible: Yes

## 10. OpenAI-specific Type Leakage

OpenAI Agents SDK types remain contained in the experiment runtime boundary: Agent, RunState, RunToolApprovalItem, RunResult.
No formal Eliy business code imports these types.

## 11. Patch / Fork / Private API

Patch used: No
Fork used: No
Private API used: No
Hosted Session used: No
MCP used: No
Custom Agent Loop used: No
Second RunState used: No

## 12. API Requests and Token Usage

API request count from fetch instrumentation: 1
Token usage: {"raw":[{"source":"connectivity","usage":{"prompt_tokens":315,"completion_tokens":57,"total_tokens":372,"prompt_tokens_details":{"cached_tokens":0},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":315}},{"source":"test-a","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":0}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-b-pending","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-b-resume","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-b-resume","usage":{"requests":1,"inputTokens":492,"outputTokens":26,"totalTokens":518,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-c-pending","usage":{"requests":1,"inputTokens":412,"outputTokens":76,"totalTokens":488,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-c-resume","usage":{"requests":1,"inputTokens":412,"outputTokens":76,"totalTokens":488,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-c-resume","usage":{"requests":1,"inputTokens":523,"outputTokens":59,"totalTokens":582,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-d-pending","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-d-child-resume","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-d-child-resume","usage":{"requests":1,"inputTokens":512,"outputTokens":41,"totalTokens":553,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}}],"requestCount":11}

## 13. Modify Observation

See reports/deepseek-provider-modify-observation.md.

## 14. Conclusion

DeepSeek Provider Compatibility Passed

## 15. Recommendation

Recommend adopting OpenAI Agents SDK TypeScript + DeepSeek V4 Flash as the current Single Runtime Spine main hypothesis.
