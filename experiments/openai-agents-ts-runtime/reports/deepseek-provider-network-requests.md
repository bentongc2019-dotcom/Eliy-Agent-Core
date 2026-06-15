# DeepSeek Provider Network Requests

Install/setup network and runtime network are separated.

Allowed runtime remote service:
- api.deepseek.com for DeepSeek OpenAI-compatible Model API.

| URL / Domain | Method | Purpose | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
|---|---|---|---|---|---|---|---|
| None observed | n/a | Runtime path did not call network | n/a | No | n/a | n/a | reports/deepseek-provider-runtime-network-records.json |

Forbidden runtime services:
- Assistant Cloud: Not observed.
- Hosted Tools: Not used.
- MCP: Not used.
- OpenAI Conversations hosted Session: Not used.
- Remote database: Not used.
- Other Provider: Not observed.
- Undeclared telemetry: Not observed by fetch instrumentation.

API request count from fetch instrumentation: 0
Token usage: SDK result did not provide / no runtime call completed
