# assistant-ui Reference Client Proof Final Report

Generated: 2026-06-15T22:10:00+08:00

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-DEFECT-ISOLATION-01`
Scope: Browser Failure Root-cause x Final Remediation Pass
Final conclusion: `Reference Client Proof Failed`

## 1. Repository State

- Current branch: `spike/assistant-ui-reference-client-proof`
- Base Commit: `dbb70a1 fix(webchat): prevent stale client context cache`
- Functional Proof Commit: `254ee01 test(assistant-ui): add reference client proof`
- Portable Package Commit: `f96613b docs(assistant-ui): prepare portable browser validation package`
- CI Workflow Commit: `cb137e4 ci(assistant-ui): add hosted chromium reference proof`
- Prior Evidence Commit: `a37dfee test(assistant-ui): record hosted chromium browser evidence`
- Root-cause Commit: `e9773f2 test(assistant-ui): isolate browser proof defects`
- Remediation Commit / Validation Target Commit: `84de9e4d7716d78418a6ba3386d10569ee560989`
- Final GitHub Actions Run: `27551332487`
- Final Run URL: `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27551332487`
- Final Job URL: `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27551332487/job/81438138521`
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

Package versions were not changed in this defect isolation pass.

## 3. License and Commercial Boundary

- Commercialization/license Gate remains passed based on the existing inventory.
- Production license UNKNOWN count remains `0`.
- npm audit production vulnerabilities: `0`.
- Assistant Cloud used: No.
- Assistant Cloud credential used: No.
- Real LLM used: No.
- Real API key used: No.
- Real Agent Runtime connected: No.
- assistant-ui fork or package source patch: No.
- assistant-ui private internal API used: No.

Note: `assistant-cloud` remains a transitive dependency of `@assistant-ui/react`, but the proof prototype does not import `AssistantCloud`, cloud runtime hooks, cloud adapters, or cloud credentials.

## 4. Root-cause Isolation

Root-cause report: `reports/defect-root-cause.md`

| Defect | Root-cause Category | Responsible Layer | Remediation Attempt |
|---|---|---|---|
| Selector collision | A. Test Harness 时序错误 | Playwright selector scope | Scoped Test A selectors to Chat / Thread containers and preserved Event Ledger. |
| `Resource updated before mount` | A. Test Harness 时序错误 | Browser test harness and thin assistant-ui integration timing | Added proof-ready waiting, initial `human_confirmation_requested`, stable external-store adapter object, cleanup guards, and Mock Controller decision persistence. |

The remediation was committed in `84de9e4` and stayed within test-only / thin integration boundaries.

## 5. Final GitHub Actions Environment

| Item | Evidence |
|---|---|
| Runner | GitHub Actions Hosted Runner |
| OS | `ubuntu-24.04` |
| Node.js | `v25.9.0` |
| npm | `11.12.1` |
| Playwright | `@playwright/test@1.61.0` |
| Browser | Playwright bundled Chromium |
| Typecheck | Passed |
| Build | Passed |
| Browser proof tests | Failed |
| Artifact upload | Passed |

Final artifact directory:

```text
reports/ci-artifacts-final/
```

## 6. Final Browser Test Results

| Test | Result | Failure Evidence | Notes |
|---|---|---|---|
| Test A - Chat / Streaming | Failed | `proof-ready` stayed `warming`; expected `ready`. | Selector collision was no longer the observed failure, but the path did not pass. |
| Test B - Tool Request | Failed | `proof-ready` stayed `warming`; expected `ready`. | Test did not reach Tool Request assertions. |
| Test C - Approve | Failed | `proof-ready` stayed `warming`; expected `ready`. | Approve once-only was not proven in the final run. |
| Test D - Deny | Failed | `proof-ready` stayed `warming`; expected `ready`. | Deny once-only was not proven in the final run. |
| Test E - Modify | Failed | `proof-ready` stayed `warming`; expected `ready`. | Structured Modify once-only was not proven in the final run. |
| Test F - Interrupt / Resume | Failed | `proof-ready` stayed `warming`; expected `ready`. | Interrupt / Resume regression occurred before action assertions. |
| Test G - Artifact | Failed | `proof-ready` stayed `warming`; expected `ready`. | Artifact path did not pass. |
| Test H - Failure / Recovery | Failed | `proof-ready` stayed `warming`; expected `ready`. | Failure / recovery path did not pass. |

Summary:

```text
Passed: 0
Failed: 8
Skipped: 0
Browser environment: usable
Overall browser proof: Failed
```

The final run did not show `Resource updated before mount`, but that is not pass evidence because the suite failed earlier at readiness and did not execute the Human Decision actions.

## 7. Human Decision Evidence

| Capability | Implementation Source | Final CI Result | Evidence |
|---|---|---|---|
| Approve | Configured Open-source / Thin Integration | Failed | Test C did not reach click/assertion stage because `proof-ready` stayed `warming`. |
| Deny | Configured Open-source / Thin Integration | Failed | Test D did not reach click/assertion stage because `proof-ready` stayed `warming`. |
| Modify | Configured Open-source / Thin Integration | Failed | Test E did not reach structured Modify assertion stage because `proof-ready` stayed `warming`. |
| Interrupt | Configured Open-source / Thin Integration | Failed | Test F did not reach action assertion stage. |
| Resume | Configured Open-source / Thin Integration | Failed | Test F did not reach action assertion stage. |

Required proof not established:

- Approve once-only: Not proven.
- Deny once-only: Not proven.
- Modify once-only: Not proven.
- Reload no-replay: Not proven.
- `Resource updated before mount` disappearance in actual decision paths: Not proven.

## 8. Runtime Network Audit

Final network report: `reports/runtime-network-requests-final.md`

Observed application runtime requests were local only:

- `http://127.0.0.1:4177/`
- `http://127.0.0.1:4177/@vite/client`
- `http://127.0.0.1:4177/@react-refresh`
- `http://127.0.0.1:4177/src/main.tsx`
- `http://127.0.0.1:4177/src/styles.css`
- `http://127.0.0.1:4177/node_modules/...`

No forbidden runtime request was observed:

- Assistant Cloud: No.
- Remote model API: No.
- Remote Agent Runtime: No.
- Commercial License service: No.
- Real API key endpoint: No.

Network boundary result: Passed, but the overall proof failed due browser interaction failures.

## 9. Artifacts

Saved under:

```text
reports/ci-artifacts-final/
```

Included:

- Playwright HTML report.
- Eight test screenshots.
- Eight trace archives.
- Eight videos.
- Eight `error-context.md` files.
- Browser console records in Playwright report / generated markdown.
- Mock Controller event log in generated markdown.
- Runtime network report.

## 10. Actual Modified Files in Defect Pass

Root-cause commit:

- `reports/defect-root-cause.md`

Remediation commit:

- `.github/workflows/assistant-ui-reference-client-proof.yml`
- `experiments/assistant-ui-reference-client-proof/src/main.tsx`
- `experiments/assistant-ui-reference-client-proof/tests/assistant-ui-reference-client.spec.ts`

Final evidence commit will add/update:

- `reports/browser-test-results-final.md`
- `reports/runtime-network-requests-final.md`
- `reports/final-report.md`
- `reports/ci-artifacts-final/`

Custom code delta in remediation commit:

```text
3 files changed, 230 insertions(+), 69 deletions(-)
```

## 11. SDK / Cloud / Runtime Boundary

- SDK patch: No.
- Private API: No.
- Fork: No.
- Assistant Cloud: No.
- Real LLM: No.
- Real Agent Runtime: No.
- Real API Key: No.
- Console error suppression: No.
- Test assertion weakening: No.
- Event Ledger deletion: No.
- Merge / deploy: No.

## 12. Final Conclusion

```text
Reference Client Proof Failed
assistant-ui Eliminated
```

Reason:

- GitHub Actions hosted Chromium launched and rendered the page, so the result is not `Environment Blocked`.
- Typecheck and build passed.
- The final full browser suite ran and failed all eight required paths.
- The final failure was a proof readiness regression: `proof-ready` remained `warming`.
- Approve / Deny / Modify once-only and reload no-replay were not proven.
- The task explicitly allows no further infinite remediation after this final run.

Freeze recommendation:

```text
HAC-Agent Reference Client = assistant-ui
```

Not recommended. Do not freeze assistant-ui as the HAC-Agent Reference Client.
