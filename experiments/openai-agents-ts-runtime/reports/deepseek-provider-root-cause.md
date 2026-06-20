# DeepSeek Provider Root Cause

Task: CP-HAC-OPENAI-AGENTS-TS-DEEPSEEK-COMPATIBILITY-SPIKE-01
Remediation pass: Thinking mode disablement at provider adapter boundary

## Observed Failure

The DeepSeek API request reached the OpenAI-compatible Chat Completions endpoint, but the provider rejected the tool-calling connectivity check:

```text
400 Thinking mode does not support this tool_choice
```

Observed evidence before remediation:

- `DEEPSEEK_API_KEY=SET` in the user-run terminal;
- runtime request domain: `api.deepseek.com`;
- API request count: 1;
- Tool Calling: Failed;
- Test A-D: Not Run.

## Root-cause Category

Provider Protocol Compatibility Issue.

DeepSeek V4 Flash defaulted to a thinking mode that rejects the current OpenAI-compatible `tool_choice` request shape. The OpenAI Agents SDK Runtime did not reach the Tool Interruption path, so this is not yet evidence of an Agents SDK RunState failure.

## Applied Remediation

File: `src/deepseek-provider.ts`

The provider adapter now supplies a public `fetch` option to the `openai` client and injects the following body field only for `/chat/completions` requests:

```json
{
  "thinking": {
    "type": "disabled"
  }
}
```

This keeps the change inside the provider adapter boundary:

- `setDefaultOpenAIClient(...)` remains in use;
- `setOpenAIAPI("chat_completions")` remains in use;
- `setTracingDisabled(true)` remains in use;
- Agent, Tool, Test A-D, and RunState logic are unchanged;
- no SDK patch, fork, private API, custom Agent loop, or second RunState was introduced.

## Validation Status

Current Codex shell does not contain `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, or `DEEPSEEK_MODEL`, so the real remediation rerun could not be executed from this shell without asking for a key in chat.

Required local rerun in the same terminal where DeepSeek credentials are exported:

```bash
cd /Users/rich1350/Documents/Eliy-Agent-Core/experiments/openai-agents-ts-runtime
npm run test:deepseek
```

If the same 400 error remains after this remediation, classify the result as Provider Protocol Compatibility Issue and `DeepSeek Provider Compatibility Failed`.
