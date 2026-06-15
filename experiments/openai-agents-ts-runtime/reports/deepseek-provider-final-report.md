# DeepSeek Provider Compatibility Final Report

Task: CP-HAC-OPENAI-AGENTS-TS-DEEPSEEK-COMPATIBILITY-SPIKE-01
Date: 2026-06-15T20:43:47.481Z

## 1. Branch / HEAD / Git Status

Branch: spike/openai-agents-ts-deepseek-provider
Baseline Commit: 92da792 test(openai-agents): record native runtime acceptance pass
Current HEAD at report generation: 06ce7f3 test(openai-agents): add deepseek provider compatibility spike
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

Status: Failed
HTTP Status: Not available
Error Type: 400 Thinking mode does not support this tool_choice
Request ID: Not available
Tool Calling: Failed

## 5. Test Results

| Test | Result | Evidence |
|---|---|---|
| Test A-D | Not Run | Credential or service blocked before runtime tests |

## 6. Tool Execution Counts

Before approval: Not run
After reject: Not run
After approve: Not run

## 7. R1-R6

| Capability | Result |
|---|---|
| R1 Tool execution can be intercepted before execution | Failed |
| R2 Unauthorized tool does not execute | Failed |
| R3 Approve / Reject are structured Runtime operations | Failed |
| R4 Same RunState resumes after decision | Failed |
| R5 State serializes and resumes across process | Failed |
| R6 Runtime state/events can be structurally mapped | Failed |

## 8. OpenAI Native Baseline Comparison

| Item | OpenAI native model | DeepSeek V4 Flash |
|---|---|---|
| Tool Call produced | Passed | Not Run |
| Interruption | Passed | Not Run |
| Reject | Passed | Not Run |
| Approve | Passed | Not Run |
| Same RunState Resume | Passed | Not proven |
| Cross-process Recovery | Passed | Not Run |
| Tool execution count correct | Passed | Not proven |
| Event Mapping | Passed | Not proven |
| Patch / Fork | None | None |
| Provider-specific code | Baseline | 44 lines in src/deepseek-provider.ts |


## 9. Provider Adapter

Implementation: src/deepseek-provider.ts
Provider-specific code lines: 44
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
Token usage: SDK result did not provide / no runtime call completed

## 13. Modify Observation

See reports/deepseek-provider-modify-observation.md.

## 14. Conclusion

DeepSeek Provider Compatibility Failed

## 15. Recommendation

Do not adopt OpenAI Agents SDK TypeScript + DeepSeek V4 Flash as the Single Runtime Spine main hypothesis until this blocker is resolved.
