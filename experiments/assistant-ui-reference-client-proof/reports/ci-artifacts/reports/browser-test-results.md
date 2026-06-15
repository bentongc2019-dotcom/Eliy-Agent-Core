# Browser Test Results

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`

Environment: GitHub Actions Hosted Runner, ubuntu-24.04, Playwright bundled Chromium.

| Test | Result | Duplicate Submission Check | Console Errors | Screenshot |
|---|---|---|---:|---|
| Test F - Interrupt / Resume | Passed | No prior human decision is replayed during interrupt/resume. | 0 | screenshots/test-f-interrupt-resume.png |
| Test G - Artifact | Passed | No human decision submitted in this path. | 0 | screenshots/test-g-artifact.png |
| Test H - Failure / Recovery | Passed | No human decision is replayed during failure/recovery. | 0 | screenshots/test-h-failure-recovery.png |

### Test F - Interrupt / Resume

- Result: Passed
- Duplicate submission check: No prior human decision is replayed during interrupt/resume.
- Screenshot: screenshots/test-f-interrupt-resume.png
- Console errors: 0

Mock Controller events:

- thread_started: assistant-ui external-store runtime mounted.
- message: Seeded user message is visible.
- run_started: Local mock run started without Assistant Cloud.
- tool_requested: request_human_decision awaits explicit human input.
- artifact_proposed: Artifact status is proposed from mock runtime input.
- run_interrupted: Mock runtime pushed run_interrupted.
- run_resumed: Mock runtime pushed run_resumed.
- stream_delta: assistant-ui external-store runtime is active;

Console:

- debug: [vite] connecting...
- debug: [vite] connected.
- info: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

Console errors:

None observed.

Runtime requests:

- GET http://127.0.0.1:4177/ | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@vite/client | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/main.tsx | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@react-refresh | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom_client.js?v=713b1c34 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?v=0547fd7b | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/styles.css | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-BIyNLfqW.js?v=88cec71e | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-runtime.js?v=0913d4ec | Local | No observed credential | Allowed

### Test G - Artifact

- Result: Passed
- Duplicate submission check: No human decision submitted in this path.
- Screenshot: screenshots/test-g-artifact.png
- Console errors: 0

Mock Controller events:

- thread_started: assistant-ui external-store runtime mounted.
- message: Seeded user message is visible.
- run_started: Local mock run started without Assistant Cloud.
- tool_requested: request_human_decision awaits explicit human input.
- artifact_proposed: Artifact status is proposed from mock runtime input.
- artifact_proposed: Artifact status set by mock runtime to pending_user_confirmation.

Console:

- debug: [vite] connecting...
- debug: [vite] connected.
- info: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

Console errors:

None observed.

Runtime requests:

- GET http://127.0.0.1:4177/ | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@vite/client | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/main.tsx | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@react-refresh | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom_client.js?v=713b1c34 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?v=0547fd7b | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/styles.css | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-BIyNLfqW.js?v=88cec71e | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-runtime.js?v=0913d4ec | Local | No observed credential | Allowed

### Test H - Failure / Recovery

- Result: Passed
- Duplicate submission check: No human decision is replayed during failure/recovery.
- Screenshot: screenshots/test-h-failure-recovery.png
- Console errors: 0

Mock Controller events:

- thread_started: assistant-ui external-store runtime mounted.
- message: Seeded user message is visible.
- run_started: Local mock run started without Assistant Cloud.
- tool_requested: request_human_decision awaits explicit human input.
- artifact_proposed: Artifact status is proposed from mock runtime input.
- run_failed: Mock runtime pushed a recoverable failure.
- run_resumed: Mock runtime recovered without replaying decisions.
- stream_delta: assistant-ui external-store runtime is active;

Console:

- debug: [vite] connecting...
- debug: [vite] connected.
- info: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

Console errors:

None observed.

Runtime requests:

- GET http://127.0.0.1:4177/ | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@vite/client | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/main.tsx | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/@react-refresh | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/vite/dist/client/env.mjs | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom_client.js?v=713b1c34 | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/@assistant-ui_react.js?v=0547fd7b | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/src/styles.css | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-BIyNLfqW.js?v=88cec71e | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react-dom.js?v=0913d4ec | Local | No observed credential | Allowed
- GET http://127.0.0.1:4177/node_modules/.vite/deps/react_jsx-runtime.js?v=0913d4ec | Local | No observed credential | Allowed
