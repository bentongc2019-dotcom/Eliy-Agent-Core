# Defect Root Cause

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-DEFECT-ISOLATION-01`

Evidence source:

- GitHub Actions Run ID: `27548274912`
- Validation Target Commit: `cb137e47d90fcb49d763a2dc4ef924975bc42e99`
- Artifact directory: `reports/ci-artifacts/`

## Root-cause Matrix

| Defect | Root-cause Category | Evidence | Responsible Layer | Proposed Fix |
|---|---|---|---|---|
| Selector collision | A. Test Harness 时序错误 | `reports/ci-artifacts/reports/browser-test-results-ci.json` reports Playwright strict-mode failure for `getByText(/assistant-ui external-store runtime is active/)`. The page snapshot shows the same streaming text in the Chat message paragraph and the Event Ledger `<code>` entry. The Chat stream itself rendered, and the Event Ledger remained visible as a separate evidence area. | Playwright test selector scope | Keep the Event Ledger. Scope Test A assertions to the Chat / Thread message container with stable `data-testid` locators, and assert the Event Ledger separately. |
| Resource updated before mount | A. Test Harness 时序错误 | Test C / D / E error contexts show the decision click occurred while only the first stream chunk had rendered and before the mock decision chain was explicitly ready. The browser console captured `Resource updated before mount`. Local dependency source maps identify this string in `@assistant-ui/tap/src/react-hooks/useReducer.ts`, where assistant-ui resource updates before mount are rejected. The prototype adapter was being recreated on each render while the test clicked during initial streaming churn. | Browser test harness and thin assistant-ui integration timing | Add an explicit proof-ready marker after the prototype has mounted and the initial mock stream / human-confirmation event is observable. Wait for that marker before decision clicks. Stabilize the external-store adapter passed to `useExternalStoreRuntime`, preserve cleanup for timers/subscribers, and persist Mock Controller decision evidence so reload checks prove no replay instead of resetting evidence. |

## Selector Collision Detail

The failed Test A assertion used a page-global text locator:

```ts
page.getByText(/assistant-ui external-store runtime is active/)
```

The rendered page correctly contained two matching texts:

- Chat area: `Local mock stream: assistant-ui external-store runtime is active;`
- Event Ledger: `stream_delta: assistant-ui external-store runtime is active;`

This is a Playwright strict-mode collision, not evidence that Chat / Streaming failed to render. The Event Ledger is a required debug evidence region and must remain in the page.

The fix is test-only: constrain the streaming assertion to `data-testid="thread-root"` / `data-testid="thread-message"` and keep a separate assertion that `data-testid="event-ledger"` records `stream_delta`.

## Resource Updated Before Mount Detail

The failing decision tests clicked `Approve`, `Deny`, or `Modify` immediately after the basic page containers became visible. The captured snapshots show:

- `Decision: pending`
- `Renders: 4`
- only the first `stream_delta` was visible
- the human decision request had not been used as the readiness condition

The console error string comes from assistant-ui's open-source dependency code:

```text
@assistant-ui/tap/src/react-hooks/useReducer.ts
throw new Error("Resource updated before mount");
```

The failure therefore points to the proof harness triggering an assistant-ui resource update before the mounted Thread / Tool resource chain had reached a stable, observable ready state. It does not currently prove an assistant-ui Cloud, license, or commercial-service dependency.

The remediation must remain narrow:

- no SDK patch;
- no private assistant-ui API;
- no Console error suppression;
- no weakened assertions;
- no deletion of Event Ledger;
- no free-text replacement for structured Modify.

## Remediation Plan

1. Add stable scoped locators for Chat / Thread, Event Ledger, Tool Panel, and proof readiness.
2. Emit / expose `human_confirmation_requested` before Human Decision tests interact.
3. Wait for proof readiness and the human-confirmation event before Approve / Deny / Modify.
4. Stabilize `useExternalStoreRuntime` integration by avoiding a freshly recreated adapter object as the action surface for every render.
5. Persist Mock Controller decision evidence across reload within the local proof session, and assert decision counts remain `1` after reload.
6. Re-run all eight browser paths in GitHub Actions hosted Chromium.

## Expected Remediation Classification

| Fix Area | Classification |
|---|---|
| Scoped Playwright locators | Test-only Fix |
| Proof-ready wait condition | Test-only Fix |
| Mock event readiness ordering | Thin Integration Fix |
| Stable external-store adapter object | Configured Open-source / Thin Integration Fix |
| Decision idempotency evidence across reload | Thin Integration Fix |

