# Runtime Network Requests - CI

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`
Pass: GitHub Actions Browser Evidence Pass
Run ID: `27548274912`
Validation Target Commit: `cb137e47d90fcb49d763a2dc4ef924975bc42e99`

## 1. Network Classes

CI Setup Network is separate from Application Runtime Network.

CI Setup Network was allowed for:

- GitHub Actions checkout and artifact services;
- npm registry / npm cache;
- Node.js `25.9.0` download;
- `npx playwright install --with-deps chromium`;
- Ubuntu package mirrors used by Playwright browser dependency installation.

Application Runtime Network was captured from Playwright traces for all eight browser tests.

## 2. Application Runtime Requests

All observed application runtime URLs were local.

| URL / Domain | Method | Purpose | Network Class | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
|---|---|---|---|---|---|---|---|---|
| `http://127.0.0.1:4177/` | GET | Vite proof page | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/@vite/client` | GET | Local Vite dev client | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/@react-refresh` | GET | Local React refresh runtime | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/src/main.tsx` | GET | Local proof source served by Vite | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/src/styles.css` | GET | Local proof styles served by Vite | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?...` | GET | Local Vite bundled assistant-ui dependency | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/node_modules/.vite/deps/react*.js?...` | GET | Local Vite bundled React dependencies | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs` | GET | Local Vite env module | Application Runtime Network | Local | No observed credential | Yes | Allowed | All eight Playwright traces |
| `ws://127.0.0.1:4177/?token=...` | GET / WebSocket upgrade | Local Vite HMR socket | Application Runtime Network | Local | No observed credential for commercial service | Yes in dev server mode | Allowed | All eight Playwright traces |

## 3. Forbidden Runtime Requests

| Forbidden Request Type | Observed | Evidence |
|---|---|---|
| Assistant Cloud | No | No non-local assistant-ui/cloud domain in traces |
| Remote model API | No | No OpenAI/Anthropic/Gemini/other model endpoint in traces |
| Remote Agent Runtime | No | No non-local runtime endpoint in traces |
| Commercial License service | No | No license verification endpoint in traces |
| Real API key endpoint | No | No credentialed remote request in traces |

## 4. Trace Coverage

Trace files:

- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-a10cc-oof-Test-A---Chat-Streaming/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc4e2-proof-Test-B---Tool-Request/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-bed21-ence-proof-Test-C---Approve/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc3a9-ference-proof-Test-D---Deny/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-adcfa-rence-proof-Test-E---Modify/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-1cb97-f-Test-F---Interrupt-Resume/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-75f6b-nce-proof-Test-G---Artifact/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-11ac1-f-Test-H---Failure-Recovery/trace.zip`

Note: the CI-generated `reports/ci-artifacts/reports/runtime-network-requests-ci.md` was overwritten by Playwright worker restarts and only includes the last worker's tests. The trace files above were used for the complete eight-test runtime network summary in this report.

## 5. Network Conclusion

```text
Application Runtime Network Audit: Passed
Forbidden Remote Runtime Requests: None observed
```

The overall Reference Client proof still failed because the browser interaction suite failed.
