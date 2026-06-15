# assistant-ui Reference Client Proof Final Report

Generated: 2026-06-15T21:30:00+08:00

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`
Scope: assistant-ui Commercialization Gate x Reference Client Prototype Validation
Pass: GitHub Actions Browser Evidence Pass

## 1. Repository State

- Current branch: `spike/assistant-ui-reference-client-proof`
- Base Commit: `dbb70a1 fix(webchat): prevent stale client context cache`
- Functional Proof Commit: `254ee01 test(assistant-ui): add reference client proof`
- Portable Package Commit: `f96613b docs(assistant-ui): prepare portable browser validation package`
- CI Workflow Commit: `cb137e4 ci(assistant-ui): add hosted chromium reference proof`
- Validation Target Commit: `cb137e47d90fcb49d763a2dc4ef924975bc42e99`
- GitHub Actions Run: `27548274912`
- GitHub Actions Run URL: `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27548274912`
- GitHub Actions Job URL: `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27548274912/job/81427332997`
- Evidence Status: `Failed`
- Started from clean baseline branch: `fix/new-chat-context-isolation-l1` at `dbb70a1`
- Formal Eliy business code modified: No
- Push / merge / deploy: Yes, current experiment branch only / No / No

## 2. Fixed Package Versions

| Package | Exact Version | License | Role |
|---|---:|---|---|
| `@assistant-ui/react` | 0.14.21 | MIT | primary assistant-ui React package |
| `@assistant-ui/core` | 0.2.16 | MIT | transitive public core runtime/types |
| `@assistant-ui/store` | 0.2.18 | MIT | transitive state/client package |
| `assistant-cloud` | 0.1.33 | MIT | transitive package, not imported by prototype |
| `assistant-stream` | 0.3.23 | MIT | transitive stream/types package |
| `react` | 19.2.7 | MIT | runtime peer |
| `react-dom` | 19.2.7 | MIT | runtime peer |
| `@playwright/test` | 1.61.0 | Apache-2.0 | dev-only hosted browser evidence harness |

Lockfile: `package-lock.json`

## 3. License and Dependency Scan

- Installed package entries before CI harness: 145
- Production-reachable package entries before CI harness: 98
- Production license distribution before CI harness: MIT=96, BSD-3-Clause=1, 0BSD=1
- Suspicious or UNKNOWN production licenses: 0
- npm audit production vulnerabilities: 0
- Saved LICENSE files: `reports/licenses/`
- CI harness dependency: `@playwright/test@1.61.0`, dev-only, Apache-2.0

License conclusion: Commercialization/license gate remains passed for the assistant-ui prototype. The final proof still fails because browser evidence did not pass.

## 4. Assistant Cloud / LLM / Runtime Boundary

- Assistant Cloud used: No
- Assistant Cloud credential used: No
- Real LLM used: No
- Real API key used: No
- Real Agent Runtime connected: No
- assistant-ui fork or package source patch: No
- assistant-ui package versions changed during CI pass: No

Note: `assistant-cloud` is installed as a transitive dependency of `@assistant-ui/react`, but this prototype does not import `AssistantCloud`, cloud runtime hooks, cloud adapters, or cloud credentials.

## 5. GitHub Actions Environment

| Item | Evidence |
|---|---|
| Runner | GitHub Actions Hosted Runner |
| OS | Ubuntu 24.04.4 LTS |
| Runner image | `ubuntu-24.04`, version `20260607.184.1` |
| Node.js | `v25.9.0` |
| npm | `11.12.1` |
| Playwright | `@playwright/test@1.61.0` |
| Browser | Playwright bundled Chromium, user agent `HeadlessChrome/149.0.7827.55` |
| Typecheck | Passed |
| Build | Passed |
| Browser proof tests | Failed |
| Artifact upload | Passed, artifact ID `7638917900` |

Artifact download URL: `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27548274912/artifacts/7638917900`

Downloaded local artifact directory:

```text
reports/ci-artifacts/
```

## 6. Browser Test Results

| Test | Result | Evidence | Notes |
|---|---|---|---|
| Test A - Chat / Streaming | Failed | `browser-test-results-ci.json`, trace, screenshot | Browser rendered. Failure was Playwright strict-mode selector collision: stream text appeared in chat and ledger. |
| Test B - Tool Request | Passed | trace, screenshot | Tool name/args/status visible; pending before decision. |
| Test C - Approve | Failed | trace, screenshot, video, console error | User action executed, but browser Console had `Resource updated before mount` twice. |
| Test D - Deny | Failed | trace, screenshot, video, console error | User action executed, but browser Console had `Resource updated before mount` twice. |
| Test E - Modify | Failed | trace, screenshot, video, console error | Structured modify path executed, but browser Console had `Resource updated before mount` twice. |
| Test F - Interrupt / Resume | Passed | trace, screenshot | Interrupt/resume path passed; no human decision replay. |
| Test G - Artifact | Passed | trace, screenshot | Artifact display/status path passed. |
| Test H - Failure / Recovery | Passed | trace, screenshot | Failure/recovery path passed; no human decision replay. |

Summary:

```text
Passed: 4
Failed: 4
Skipped: 0
Run status: failure
```

Important distinction:

- Browser environment was usable; Chromium launched and rendered the page.
- This is no longer `Environment Blocked`.
- Because the browser proof tests ran and failed, the final result is `Reference Client Proof Failed`.

## 7. Human Decision Evidence

| Capability | Implementation Source | CI Result | Evidence |
|---|---|---|---|
| Approve | Configured Open-source | Failed | `respondToApproval` path was exercised, but Console error caused Test C failure. |
| Deny | Configured Open-source | Failed | `respondToApproval` path was exercised, but Console error caused Test D failure. |
| Modify | Configured Open-source | Failed | `resume` structured payload path was exercised, but Console error caused Test E failure. |
| Interrupt | Configured Open-source | Passed | Mock controller event `run_interrupted` captured. |
| Resume | Configured Open-source | Passed | Mock controller event `run_resumed` captured; no prior human decision replay. |

Duplicate submission evidence:

- Test C intended check: `human_approved` once and no replay after reload, but test failed on Console error.
- Test D intended check: `human_denied` once and no replay after reload, but test failed on Console error.
- Test E intended check: `human_modified` once and no replay after reload, but test failed on Console error.
- Test F/H passed no-replay checks for non-decision state transitions.

## 8. Runtime Network Audit

CI Setup Network allowed:

- npm registry and package cache;
- GitHub Actions services;
- Playwright Chromium/browser dependency download;
- Ubuntu package mirrors during `npx playwright install --with-deps chromium`.

Application Runtime Network evidence:

- Captured from Playwright traces for all eight tests.
- All observed runtime URLs were local:
  - `http://127.0.0.1:4177/`
  - `http://127.0.0.1:4177/@vite/client`
  - `http://127.0.0.1:4177/@react-refresh`
  - `http://127.0.0.1:4177/src/main.tsx`
  - `http://127.0.0.1:4177/src/styles.css`
  - `http://127.0.0.1:4177/node_modules/...`
  - `ws://127.0.0.1:4177/?token=...` for local Vite HMR
- No Assistant Cloud request observed.
- No remote model API request observed.
- No remote Agent Runtime request observed.
- No commercial License service request observed.
- No real API key endpoint observed.

Network audit conclusion: Passed for application runtime network boundary. The proof still fails due browser interaction/console evidence.

## 9. Artifacts

Saved under:

```text
reports/ci-artifacts/
```

Included evidence:

- `playwright-report/index.html`
- `test-results/**/trace.zip`
- `test-results/**/test-failed-1.png`
- `test-results/**/test-finished-1.png`
- `test-results/**/video.webm` for failed tests with video
- `test-results/**/error-context.md`
- `screenshots/test-a-chat-streaming.png`
- `screenshots/test-b-tool-request.png`
- `screenshots/test-c-approve.png`
- `screenshots/test-d-deny.png`
- `screenshots/test-e-modify.png`
- `screenshots/test-f-interrupt-resume.png`
- `screenshots/test-g-artifact.png`
- `screenshots/test-h-failure-recovery.png`
- `reports/browser-test-results-ci.json`
- `reports/runtime-network-requests-ci.md`

## 10. Open-core Contribution Matrix

| Capability | Implementation Source | Evidence |
|---|---|---|
| Thread / message runtime | Configured Open-source | `useExternalStoreRuntime` and `AssistantRuntimeProvider` from public `@assistant-ui/react` exports. |
| Chat / Streaming display | Configured Open-source | Browser rendered stream; Test A failed due test selector strict-mode collision, not absence of rendering. |
| Tool Request UI | Thin Extension | Public `MessagePrimitive.Parts` custom tool renderer. Test B passed. |
| Approve | Configured Open-source | Public `respondToApproval`; Test C failed due Console error. |
| Deny | Configured Open-source | Public `respondToApproval`; Test D failed due Console error. |
| Modify | Configured Open-source | Public `resume` structured payload; Test E failed due Console error. |
| Interrupt / Resume | Configured Open-source | External-store state; Test F passed. |
| Artifact | Thin Extension | assistant-ui data part renderer with custom artifact UI; Test G passed. |
| Failure / Recovery | Configured Open-source | External-store assistant message status; Test H passed. |
| Custom branding | Thin Extension | HAC-Agent proof branding in local CSS/source. |

Counts: Native Open-source=0, Configured Open-source=7, Thin Extension=3, Custom Replacement=0, Cloud=0, Unsupported=0.

## 11. Forced Pass Items

| # | Item | Result |
|---:|---|---|
| 1 | Commercialization/license Gate passed | Passed |
| 2 | No Assistant Cloud dependency | Passed |
| 3 | Chat / Streaming runnable | Failed in CI due selector collision; browser rendered stream evidence exists |
| 4 | Tool Request display | Passed |
| 5 | Approve reliable submission | Failed, Console error during browser proof |
| 6 | Deny reliable submission | Failed, Console error during browser proof |
| 7 | Modify structured update | Failed, Console error during browser proof |
| 8 | Interrupt / Resume state consistency | Passed |
| 9 | Artifact / Chat separation | Passed |
| 10 | Frontend does not infer Runtime Truth | Partially evidenced; full pass blocked by failed browser suite |
| 11 | No duplicate submission after rerender | Failed to prove for Approve/Deny/Modify because tests failed |
| 12 | External Mock Event Stream compatible | Partially evidenced |
| 13 | HAC-Agent custom branding | Passed |
| 14 | No fork | Passed |
| 15 | No large Custom Replacement | Passed at source/harness level |
| 16 | Core path uses public open-source API | Passed at source/harness level |
| 17 | Reproducible test evidence | Failed overall; CI evidence reproducible but browser suite failed |

## 12. Final Conclusion

```text
Reference Client Proof Failed
```

Reason:

- GitHub Actions hosted Chromium successfully launched and rendered the proof page.
- Typecheck and build passed.
- The browser test suite actually executed.
- Four of eight required browser paths failed:
  - Chat / Streaming failed due a test selector collision after rendered evidence appeared.
  - Approve, Deny, and Modify failed because the browser Console emitted `Resource updated before mount`.
- Under the task rules, a real browser test failure after successful browser launch is not `Environment Blocked`.
- Application runtime network audit did not show forbidden Assistant Cloud, remote model, remote Agent Runtime, or License service requests.

Recommendation to freeze:

```text
HAC-Agent Reference Client = assistant-ui
```

Not recommended. Do not freeze assistant-ui until browser-level evidence passes under the unchanged gate.
