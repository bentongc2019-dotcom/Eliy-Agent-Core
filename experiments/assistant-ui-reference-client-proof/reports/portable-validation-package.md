# Portable Browser Validation Package

Generated: 2026-06-15

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`  
Scope: assistant-ui Commercialization Gate × Reference Client Prototype Validation  
Current conclusion: `Environment Blocked`

This package is for moving the assistant-ui proof to another local or CI environment with a working Chromium / Chrome browser. It does not change the proof standard and does not authorize product development.

## Required Commits

Recommended checkout commit:

```text
22b5b73 docs(assistant-ui): fix reference proof report status
```

Functional proof commit:

```text
254ee01 test(assistant-ui): add reference client proof
```

Base commit:

```text
dbb70a1 fix(webchat): prevent stale client context cache
```

If this portable package is consumed from a later docs-only commit, the verification environment may checkout that later commit to obtain this file. The functional verification object remains the assistant-ui proof prototype and fixed lockfile introduced by `254ee01`; do not modify the proof functionality or test standard.

## Runtime Versions

This environment used:

```text
Node.js: v25.9.0
npm: 11.16.0
```

`package.json` does not define an `engines` field. Do not modify `package.json` only to add engines for this validation pass.

## Fixed Package Versions

The proof uses `package-lock.json`; run `npm ci` in the experiment directory.

Key pinned packages:

| Package | Version |
|---|---:|
| `@assistant-ui/react` | 0.14.21 |
| `@assistant-ui/core` | 0.2.16 |
| `@assistant-ui/store` | 0.2.18 |
| `assistant-cloud` | 0.1.33 transitive, not used |
| `assistant-stream` | 0.3.23 |
| `react` | 19.2.7 |
| `react-dom` | 19.2.7 |

## Allowed Verification Environments

Allowed:

- another local computer;
- clean Linux VM;
- CI runner with Chromium / Chrome;
- isolated container with a usable browser.

Not allowed:

- Assistant Cloud;
- real LLM;
- real Agent Runtime;
- real API key;
- remote commercial browser service;
- changes to business logic, package versions, or test standards.

## Suggested Commands

```bash
git checkout spike/assistant-ui-reference-client-proof
git log --oneline -5
cd experiments/assistant-ui-reference-client-proof
npm ci
npm run typecheck
npm run build
npm run dev -- --host 127.0.0.1 --port 4177
```

If a browser test command exists in the target environment, use it only to execute the test standard below. If no browser test command exists, use Playwright, Chrome DevTools Protocol, or the environment's local browser automation to perform the same browser validation without changing the prototype code.

## Mock Event Stream

The prototype is a local mock proof:

- assistant-ui external-store runtime owns thread/message/run-visible state;
- local mock event state drives message text, tool request, approval state, interrupt/resume, failure/recovery, and artifact state;
- no Assistant Cloud, real model, real Agent Runtime, or API key is required;
- the mock controller is part of the proof harness and must not be replaced with real domain logic.

## Browser Tests

Run all eight paths in a real rendered browser:

| Test | Required Evidence |
|---|---|
| Test A - Chat / Streaming | Page renders; user message visible; mock assistant streaming text visible; thread state stable; no Cloud dependency. |
| Test B - Tool Request | Tool name and structured parameters visible; pending tool is not shown as executed; state comes from mock runtime input. |
| Test C - Approve | User clicks Approve; Mock Controller receives exactly one approval; rerender does not resubmit; UI state updates correctly. |
| Test D - Deny | User clicks Deny; tool is not shown as successfully executed; Mock Controller receives exactly one denial. |
| Test E - Modify | User edits structured tool parameters; original args become historical/non-executable; new args become pending; not implemented as free-text chat. |
| Test F - Interrupt / Resume | Interrupted state visible; Resume restores consistent state; old decisions are not resent. |
| Test G - Artifact | Artifact renders separately from chat; frontend does not infer accepted/frozen; state comes from mock runtime input. |
| Test H - Failure / Recovery | Mock failure is visible; recovery does not replay human decisions or side-effect requests. |

For each test record:

1. Passed / Failed;
2. whether the page rendered;
3. whether the user action triggered;
4. whether the Mock Controller received exactly one decision where applicable;
5. whether rerender repeated a decision;
6. whether UI state was correct;
7. whether browser Console had errors;
8. whether Network stayed within allowed local requests.

## Network Audit Rules

Allowed during runtime:

```text
localhost
127.0.0.1
local static resources
local Mock Event Stream
```

Not allowed during runtime:

```text
Assistant Cloud
remote model API
remote Agent Runtime
commercial License service
real API Key
```

If any Assistant Cloud, remote model, remote Agent Runtime, or license service request appears, mark the proof Failed or blocked as appropriate. Do not claim compliance by patching SDK code, modifying tests, blocking requests, intercepting with fake responses, or hiding network errors.

## Evidence to Save

Save all evidence under:

```text
experiments/assistant-ui-reference-client-proof/reports/
```

Required browser artifacts:

- screenshots for rendered page and each tested state;
- trace or equivalent browser automation log;
- browser Console output;
- full Network request list with URL, method, domain, local/remote, credential presence, and purpose;
- Mock Controller event ledger after each decision path;
- rerender/reload duplicate-submission check.

## Final Allowed Conclusions

Only one of the following conclusions is allowed:

```text
Reference Client Proof Passed
Reference Client Proof Failed
Environment Blocked
```

Rules:

- `Reference Client Proof Passed`: all eight browser paths pass, network audit passes, no Assistant Cloud / LLM / real Runtime / API key dependency appears, and no business logic or test standard was modified.
- `Reference Client Proof Failed`: browser runs, but assistant-ui cannot satisfy one or more required paths, duplicate-submission checks, runtime truth boundaries, or network rules.
- `Environment Blocked`: the new environment still cannot start a usable browser or cannot produce valid browser evidence.

Do not mark assistant-ui Failed solely because the verification environment cannot launch a browser.

## Freeze Guidance

Do not freeze:

```text
HAC-Agent Reference Client = assistant-ui
```

until browser evidence is complete and the final conclusion is `Reference Client Proof Passed`.
