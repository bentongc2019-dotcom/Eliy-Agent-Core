# Runtime Network Requests - Final

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-DEFECT-ISOLATION-01`
Environment: GitHub Actions Hosted Runner, `ubuntu-24.04`, Playwright bundled Chromium
Run ID: `27551332487`
Validation Target Commit: `84de9e4d7716d78418a6ba3386d10569ee560989`

## 1. Network Classes

CI Setup Network is separate from Application Runtime Network.

CI Setup Network was allowed for:

- GitHub Actions checkout and artifact services;
- npm registry / npm cache;
- Node.js `25.9.0` setup;
- `npx playwright install --with-deps chromium`;
- Ubuntu package mirrors used by Playwright browser dependency installation.

Application Runtime Network was captured during the rendered browser tests. Runtime requests are only allowed to localhost, 127.0.0.1, local static resources, local Vite WebSocket, and local mock event stream.

## 2. Application Runtime Requests

| URL / Domain | Method | Purpose | Network Class | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
|---|---|---|---|---|---|---|---|---|
| `http://127.0.0.1:4177/` | GET | Vite proof page | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/@vite/client` | GET | Local Vite dev client | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/@react-refresh` | GET | Local React refresh runtime | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/src/main.tsx` | GET | Local proof source served by Vite | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/src/styles.css` | GET | Local proof styles served by Vite | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?...` | GET | Local Vite bundled assistant-ui dependency | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/node_modules/.vite/deps/react*.js?...` | GET | Local Vite bundled React dependencies | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs` | GET | Local Vite env module | Application Runtime Network | Local | No observed credential | Yes | Allowed | Final Playwright request log / traces |
| `ws://127.0.0.1:4177/?token=...` | GET / WebSocket upgrade | Local Vite HMR socket | Application Runtime Network | Local | No observed commercial credential | Yes in dev server mode | Allowed | Final Playwright traces |

## 3. Forbidden Runtime Requests

| Forbidden Request Type | Observed | Evidence |
|---|---|---|
| Assistant Cloud | No | No non-local assistant-ui/cloud domain in final traces or request log |
| Remote model API | No | No OpenAI/Anthropic/Gemini/other model endpoint in final traces or request log |
| Remote Agent Runtime | No | No non-local runtime endpoint in final traces or request log |
| Commercial License service | No | No license verification endpoint in final traces or request log |
| Real API key endpoint | No | No credentialed remote request in final traces or request log |

## 4. Network Conclusion

```text
Application Runtime Network Audit: Passed
Forbidden Remote Runtime Requests: None observed
```

The overall Reference Client proof still failed because all eight browser interaction tests failed at `proof-ready` readiness.
