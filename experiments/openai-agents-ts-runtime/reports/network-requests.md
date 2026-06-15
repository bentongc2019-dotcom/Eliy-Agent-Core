# Network Requests

Install/setup network and runtime network are separated.

## Install / Setup Network

Allowed and observed during setup:
- npm registry for package metadata and dependency installation.

## Application Runtime Network

Instrumentation method: global fetch wrapper installed before runtime test execution.

| URL / Domain | Method | Purpose | Runtime allowed | Credential present | Evidence |
|---|---|---|---|---|---|
| api.openai.com | POST | OpenAI Model API | Yes | API key present but value not logged | reports/runtime-network-records.json |
| api.openai.com | POST | OpenAI Model API | Yes | API key present but value not logged | reports/runtime-network-records.json |
| api.openai.com | POST | OpenAI Model API | Yes | API key present but value not logged | reports/runtime-network-records.json |
| api.openai.com | POST | OpenAI Model API | Yes | API key present but value not logged | reports/runtime-network-records.json |
| api.openai.com | POST | OpenAI Model API | Yes | API key present but value not logged | reports/runtime-network-records.json |

Runtime allowlist:
- api.openai.com for OpenAI Model API only.

Forbidden runtime services:
- Assistant Cloud: Not observed.
- Hosted Tools: Not used.
- MCP: Not used.
- OpenAI Conversations hosted Session: Not used.
- Remote database: Not used.
- Other providers: Not used.
- Undeclared telemetry: Not observed by fetch instrumentation.

Limitations:
- This logger captures global fetch calls. If a dependency uses lower-level socket APIs, those would require separate OS-level capture.
