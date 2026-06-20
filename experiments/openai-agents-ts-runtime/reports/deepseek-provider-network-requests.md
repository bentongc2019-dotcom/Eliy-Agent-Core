# DeepSeek Provider Network Requests

Install/setup network and runtime network are separated.

Allowed runtime remote service:
- api.deepseek.com for DeepSeek OpenAI-compatible Model API.

| URL / Domain | Method | Purpose | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
|---|---|---|---|---|---|---|---|
| api.deepseek.com | POST | Configured OpenAI-compatible Model API | Remote | Yes, value not logged | Yes | Allowed | reports/deepseek-provider-runtime-network-records.json |

Forbidden runtime services:
- Assistant Cloud: Not observed.
- Hosted Tools: Not used.
- MCP: Not used.
- OpenAI Conversations hosted Session: Not used.
- Remote database: Not used.
- Other Provider: Not observed.
- Undeclared telemetry: Not observed by fetch instrumentation.

API request count from fetch instrumentation: 1
Token usage: {"raw":[{"source":"connectivity","usage":{"prompt_tokens":315,"completion_tokens":57,"total_tokens":372,"prompt_tokens_details":{"cached_tokens":0},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":315}},{"source":"test-a","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":0}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-b-pending","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-b-resume","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-b-resume","usage":{"requests":1,"inputTokens":492,"outputTokens":26,"totalTokens":518,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-c-pending","usage":{"requests":1,"inputTokens":412,"outputTokens":76,"totalTokens":488,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-c-resume","usage":{"requests":1,"inputTokens":412,"outputTokens":76,"totalTokens":488,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-c-resume","usage":{"requests":1,"inputTokens":523,"outputTokens":59,"totalTokens":582,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-d-pending","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-d-child-resume","usage":{"requests":1,"inputTokens":412,"outputTokens":64,"totalTokens":476,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}},{"source":"test-d-child-resume","usage":{"requests":1,"inputTokens":512,"outputTokens":41,"totalTokens":553,"inputTokensDetails":[{"cached_tokens":384}],"outputTokensDetails":[{"reasoning_tokens":0}]}}],"requestCount":11}
