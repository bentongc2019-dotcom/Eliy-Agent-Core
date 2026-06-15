# Browser Test Results - Final

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-DEFECT-ISOLATION-01`
Environment: GitHub Actions Hosted Runner, `ubuntu-24.04`, Playwright bundled Chromium
Run ID: `27551332487`
Run URL: `https://github.com/bentongc2019-dotcom/Eliy-Agent-Core/actions/runs/27551332487`
Validation Target Commit: `84de9e4d7716d78418a6ba3386d10569ee560989`

## Run Result

| Step | Result |
|---|---|
| Install dependencies | Passed |
| Install Playwright Chromium | Passed |
| Typecheck | Passed |
| Build | Passed |
| Browser proof tests | Failed |
| Artifact upload | Passed |

## Eight Path Results

| Test | Result | Browser Rendered | User Action Triggered | Mock Controller Once-only | Reload No-replay | Console | Network |
|---|---|---|---|---|---|---|---|
| Test A - Chat / Streaming | Failed | Yes | Not applicable | Not applicable | Not applicable | No console error recorded as primary failure | Local only |
| Test B - Tool Request | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |
| Test C - Approve | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |
| Test D - Deny | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |
| Test E - Modify | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |
| Test F - Interrupt / Resume | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |
| Test G - Artifact | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |
| Test H - Failure / Recovery | Failed | Yes | Not reached | Not proven | Not proven | No console error recorded as primary failure | Local only |

## Common Failure

All eight tests failed at the same readiness assertion:

```text
Locator: getByTestId('proof-ready')
Expected: "ready"
Received: "warming"
Timeout: 8000ms
```

The final run therefore did not prove:

- Chat / Streaming completion;
- Tool Request readiness;
- Approve once-only;
- Deny once-only;
- structured Modify once-only;
- reload no-replay;
- Interrupt / Resume;
- Artifact;
- Failure / Recovery.

The prior `Resource updated before mount` console error was not observed in the final failure evidence, but the Human Decision click paths were not reached. That absence is therefore not valid pass evidence.

## Artifact Pointers

Final artifact root:

```text
reports/ci-artifacts-final/assistant-ui-reference-client-proof-artifacts/
```

Included:

- `playwright-report/index.html`
- `test-results/**/trace.zip`
- `test-results/**/test-failed-1.png`
- `test-results/**/video.webm`
- `test-results/**/error-context.md`
- `screenshots/test-a-chat-streaming.png`
- `screenshots/test-b-tool-request.png`
- `screenshots/test-c-approve.png`
- `screenshots/test-d-deny.png`
- `screenshots/test-e-modify.png`
- `screenshots/test-f-interrupt-resume.png`
- `screenshots/test-g-artifact.png`
- `screenshots/test-h-failure-recovery.png`

## Conclusion

```text
Reference Client Proof Failed
```

GitHub Actions Chromium was usable. The proof failed on browser-level interaction evidence, not environment availability.
