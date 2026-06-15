# Browser Test Results

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`

Environment: GitHub Actions Hosted Runner, ubuntu-24.04, Playwright bundled Chromium.

| Test | Result | Duplicate Submission Check | Console Errors | Screenshot |
|---|---|---|---:|---|
| Test H - Failure / Recovery | Failed | No human decision is replayed during failure/recovery. | 0 | screenshots/test-h-failure-recovery.png |

### Test H - Failure / Recovery

- Result: Failed
- Duplicate submission check: No human decision is replayed during failure/recovery.
- Screenshot: screenshots/test-h-failure-recovery.png
- Console errors: 0

Mock Controller events:

- thread_started: assistant-ui external-store runtime mounted.
- message: Seeded user message is visible.
- run_started: Local mock run started without Assistant Cloud.
- tool_requested: request_human_decision awaits explicit human input.
- human_confirmation_requested: Tool args v1 pending.
- artifact_proposed: Artifact status is proposed from mock runtime input.

Console:

- debug: [vite] connecting...
- debug: [vite] connected.
- info: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
- debug: [vite] connecting...
- info: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
- debug: [vite] connected.

Console errors:

None observed.

Runtime requests:

- GET http://127.0.0.1:4177/ | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@vite/client | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/main.tsx | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@react-refresh | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom_client.js?v=113362fd | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?v=24c28d02 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/styles.css | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-BIyNLfqW.js?v=f30b0f64 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-runtime.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/ | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@vite/client | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/main.tsx | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@react-refresh | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom_client.js?v=113362fd | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?v=24c28d02 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/styles.css | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-BIyNLfqW.js?v=f30b0f64 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom.js?v=4def8122 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-runtime.js?v=4def8122 | Local | No observed credential | Allowed

