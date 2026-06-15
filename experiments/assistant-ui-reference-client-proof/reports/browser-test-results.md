# Browser Test Results

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`
Pass: GitHub Actions Browser Evidence Pass
Environment: GitHub Actions Hosted Runner, ubuntu-24.04, Playwright bundled Chromium.

## Run Metadata

| Field | Value |
|---|---|
| Run ID | `27548274912` |
| Run URL | `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27548274912` |
| Job ID | `81427332997` |
| Validation Target Commit | `cb137e47d90fcb49d763a2dc4ef924975bc42e99` |
| Node.js | `v25.9.0` |
| npm | `11.12.1` |
| Playwright | `@playwright/test@1.61.0` |
| Chromium | `HeadlessChrome/149.0.7827.55` |
| Typecheck | Passed |
| Build | Passed |
| Browser proof tests | Failed |
| Artifacts | Uploaded and downloaded to `reports/ci-artifacts/` |

## Eight Path Results

| Test | Result | Main Evidence | Console | Duplicate Submission Check |
|---|---|---|---|---|
| Test A - Chat / Streaming | Failed | Browser rendered chat and stream, but Playwright strict-mode selector resolved to both chat stream and event ledger. | No console error recorded as primary failure. | No human decision submitted. |
| Test B - Tool Request | Passed | Tool name, structured args, and pending status visible. | No error. | No human decision submitted. |
| Test C - Approve | Failed | Approve path executed; screenshot/video/trace saved. | `Resource updated before mount` x2. | Intended once-only/reload check did not complete because Console assertion failed. |
| Test D - Deny | Failed | Deny path executed; screenshot/video/trace saved. | `Resource updated before mount` x2. | Intended once-only/reload check did not complete because Console assertion failed. |
| Test E - Modify | Failed | Structured modify path executed; screenshot/video/trace saved. | `Resource updated before mount` x2. | Intended once-only/reload check did not complete because Console assertion failed. |
| Test F - Interrupt / Resume | Passed | `run_interrupted` and `run_resumed` captured. | No error. | No prior human decision replayed. |
| Test G - Artifact | Passed | Artifact panel and status update captured. | No error. | No human decision submitted. |
| Test H - Failure / Recovery | Passed | `run_failed` and recovery `run_resumed` captured. | No error. | No human decision replayed. |

Summary:

```text
Passed: 4
Failed: 4
Skipped: 0
Overall browser proof: Failed
```

## Failure Evidence

### Test A - Chat / Streaming

Failure:

```text
strict mode violation: getByText(/assistant-ui external-store runtime is active/) resolved to 2 elements
```

Interpretation:

- The browser rendered the stream text.
- The same text also appeared in the mock event ledger.
- The test failed because the locator was ambiguous, not because the page failed to render.
- The test was not changed or rerun after failure.

Artifacts:

- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-a10cc-oof-Test-A---Chat-Streaming/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-a10cc-oof-Test-A---Chat-Streaming/test-failed-1.png`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-a10cc-oof-Test-A---Chat-Streaming/video.webm`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-a10cc-oof-Test-A---Chat-Streaming/error-context.md`

### Test C - Approve

Failure:

```text
Browser console must not contain errors
Received:
Resource updated before mount
Resource updated before mount
```

Artifacts:

- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-bed21-ence-proof-Test-C---Approve/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-bed21-ence-proof-Test-C---Approve/test-failed-1.png`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-bed21-ence-proof-Test-C---Approve/video.webm`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-bed21-ence-proof-Test-C---Approve/error-context.md`

### Test D - Deny

Failure:

```text
Browser console must not contain errors
Received:
Resource updated before mount
Resource updated before mount
```

Artifacts:

- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc3a9-ference-proof-Test-D---Deny/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc3a9-ference-proof-Test-D---Deny/test-failed-1.png`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc3a9-ference-proof-Test-D---Deny/video.webm`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc3a9-ference-proof-Test-D---Deny/error-context.md`

### Test E - Modify

Failure:

```text
Browser console must not contain errors
Received:
Resource updated before mount
Resource updated before mount
```

Artifacts:

- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-adcfa-rence-proof-Test-E---Modify/trace.zip`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-adcfa-rence-proof-Test-E---Modify/test-failed-1.png`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-adcfa-rence-proof-Test-E---Modify/video.webm`
- `reports/ci-artifacts/test-results/assistant-ui-reference-cli-adcfa-rence-proof-Test-E---Modify/error-context.md`

## Passing Path Evidence

- Test B Tool Request:
  `reports/ci-artifacts/test-results/assistant-ui-reference-cli-dc4e2-proof-Test-B---Tool-Request/trace.zip`
- Test F Interrupt / Resume:
  `reports/ci-artifacts/test-results/assistant-ui-reference-cli-1cb97-f-Test-F---Interrupt-Resume/trace.zip`
- Test G Artifact:
  `reports/ci-artifacts/test-results/assistant-ui-reference-cli-75f6b-nce-proof-Test-G---Artifact/trace.zip`
- Test H Failure / Recovery:
  `reports/ci-artifacts/test-results/assistant-ui-reference-cli-11ac1-f-Test-H---Failure-Recovery/trace.zip`

## Conclusion

```text
Reference Client Proof Failed
```

GitHub Actions proved the browser environment is usable. The suite failed with real browser-level evidence, so the result is not `Environment Blocked`.
