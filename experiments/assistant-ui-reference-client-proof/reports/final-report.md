# assistant-ui Reference Client Proof Final Report

Generated: 2026-06-15T11:16:49.204Z

Task: `CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01`  
Scope: assistant-ui Commercialization Gate × Reference Client Prototype Validation

## 1. Repository State

- Current branch: `spike/assistant-ui-reference-client-proof`
- Base Commit: `dbb70a1 fix(webchat): prevent stale client context cache`
- Functional Proof Commit: `254ee01 test(assistant-ui): add reference client proof`
- Current HEAD before portable package prep: `22b5b73 docs(assistant-ui): fix reference proof report status`
- Git status before portable package prep: `clean`
- Started from clean baseline branch: `fix/new-chat-context-isolation-l1` at `dbb70a1 fix(webchat): prevent stale client context cache`
- CopilotKit spike retained separately: `spike/copilotkit-open-core-boundary-proof`
- CopilotKit status: Gate B Failed for CopilotKit 1.59.5
- Formal Eliy business code modified: No
- Push / merge / deploy: No / No / No
- Backup of untracked CopilotKit experiment copy before cleanup: `/tmp/eliy-untracked-experiments-before-assistant-ui-20260615-190216`

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

Lockfile: `package-lock.json`

## 3. License and Dependency Scan

- Installed package entries: 145
- Production-reachable package entries: 98
- Production license distribution: MIT=96, BSD-3-Clause=1, 0BSD=1
- Suspicious or UNKNOWN production licenses: 0
- npm audit production vulnerabilities: 0
- Saved LICENSE files: `reports/licenses/`

License conclusion: Passed for non-browser evidence.

## 4. Assistant Cloud / LLM / Runtime Boundary

- Assistant Cloud used: No
- Assistant Cloud credential used: No
- Real LLM used: No
- Real API key used: No
- Real Agent Runtime connected: No
- assistant-ui fork or package source patch: No

Note: `assistant-cloud` is installed as a transitive dependency of `@assistant-ui/react`, but this prototype does not import `AssistantCloud`, cloud runtime hooks, cloud adapters, or cloud credentials.

## 5. Browser Test Results

Conclusion: `Environment Blocked`

| Test | Browser Execution | Result | Evidence |
|---|---|---|---|
| Test A - Chat / Streaming | Not executed in browser | Environment Blocked | HTTP page available only; browser did not render. Type/build passed. |
| Test B - Tool Request | Not executed in browser | Environment Blocked | Source uses assistant-ui tool-call part renderer and approval metadata. Browser did not render. |
| Test C - Approve | Not executed in browser | Environment Blocked | Source uses ToolCallMessagePartProps.respondToApproval -> external-store onRespondToToolApproval. Browser did not render. |
| Test D - Deny | Not executed in browser | Environment Blocked | Same public approval path. Browser did not render. |
| Test E - Modify | Not executed in browser | Environment Blocked | Source uses ToolCallMessagePartProps.resume -> external-store onResumeToolCall with structured payload. Browser did not render. |
| Test F - Interrupt / Resume | Not executed in browser | Environment Blocked | Source drives external-store run/message status. Browser did not render. |
| Test G - Artifact | Not executed in browser | Environment Blocked | Source renders assistant-ui data part separately as artifact. Browser did not render. |
| Test H - Failure / Recovery | Not executed in browser | Environment Blocked | Source can set incomplete/error and recover state. Browser did not render. |

Browser environment details:

- In-app Browser: unavailable (`Browser is not available: iab`)
- Project-local Playwright: unavailable (module not installed)
- Playwright bundled Chromium: executable missing
- System Chrome: SIGABRT / EPERM before page render
- System Edge / Chromium: not found locally

No browser screenshot, trace, console log, interaction ledger, or browser request capture could be produced.

## 6. Open-core Contribution Matrix

| Capability | Implementation Source | Evidence |
|---|---|---|
| Thread / message runtime | Configured Open-source | useExternalStoreRuntime and AssistantRuntimeProvider from public @assistant-ui/react exports. |
| Chat / Streaming display | Configured Open-source | assistant-ui Thread/Message primitives render external-store messages; mock stream updates message text. Browser proof blocked. |
| Tool Request UI | Thin Extension | MessagePrimitive.Parts tools.by_name public renderer for tool-call part. |
| Approve | Configured Open-source | ToolCallMessagePartProps.respondToApproval -> external-store onRespondToToolApproval. Browser proof blocked. |
| Deny | Configured Open-source | Same public approval path with approved=false. Browser proof blocked. |
| Modify | Configured Open-source | ToolCallMessagePartProps.resume -> external-store onResumeToolCall with structured payload. Browser proof blocked. |
| Interrupt / Resume | Configured Open-source | External-store message/run status drives requires-action/running state. Browser proof blocked. |
| Artifact | Thin Extension | assistant-ui data message part rendered with custom artifact component. |
| Failure / Recovery | Configured Open-source | External-store assistant message status incomplete/error and recovered state. Browser proof blocked. |
| Custom branding | Thin Extension | Local CSS/text uses HAC-Agent proof branding. |

Counts: Native Open-source=0, Configured Open-source=7, Thin Extension=3, Custom Replacement=0, Cloud=0, Unsupported=0.

Open-core contribution conclusion: Source-level prototype uses public assistant-ui open-source primitives/runtime; browser proof is blocked by environment.

## 7. Network Requests

| Domain / URL | Purpose | Local / Remote | Credential | Evidence |
|---|---|---|---|---|
| `http://127.0.0.1:4177/` | Vite proof page | Local | No credential | HTTP-level capture saved |

Browser-level network capture: unavailable because browser did not render. No Assistant Cloud, remote model, remote Agent Runtime, or license service request was observed in available evidence, but browser-level absence is not proven.

## 8. Custom Code and Extension Points

- Main prototype file: `src/main.tsx`
- Styling: `src/styles.css`
- assistant-ui public APIs used: `useExternalStoreRuntime`, `AssistantRuntimeProvider`, `ThreadPrimitive`, `MessagePrimitive`, `ComposerPrimitive`, `ToolCallMessagePartProps.respondToApproval`, `ToolCallMessagePartProps.resume`
- Custom code role: local mock event stream, custom tool renderer, custom artifact renderer, test ledger
- Product feature code added: No
- Formal Eliy business code modified: No

## 9. Forced Pass Items

| # | Item | Result | Evidence |
|---:|---|---|---|
| 1 | 商业化与许可证 Gate 通过 | Passed | Production licenses are MIT/BSD-3-Clause/0BSD; no UNKNOWN. |
| 2 | 不依赖 Assistant Cloud | Source Passed / Browser Unverified | assistant-cloud installed transitively but not imported or configured. Browser network proof blocked. |
| 3 | Chat / Streaming 可运行 | Environment Blocked | Build passes; browser interaction not executed. |
| 4 | Tool Request 可显示 | Environment Blocked | Source uses public tool-call renderer; browser interaction not executed. |
| 5 | Approve 可可靠提交 | Environment Blocked | Source uses public respondToApproval; browser interaction not executed. |
| 6 | Deny 可可靠提交 | Environment Blocked | Source uses public respondToApproval; browser interaction not executed. |
| 7 | Modify 为结构化修改 | Environment Blocked | Source uses public resume with structured payload; browser interaction not executed. |
| 8 | Interrupt / Resume 状态一致 | Environment Blocked | Source uses external-store status; browser interaction not executed. |
| 9 | Artifact 与 Chat 分离 | Environment Blocked | Source uses data part renderer; browser interaction not executed. |
| 10 | 前端不自行推断 Runtime Truth | Environment Blocked | Source accepts mock runtime state; browser interaction not executed. |
| 11 | 重渲染不重复提交 | Environment Blocked | Source has decision dedupe; browser rerender proof unavailable. |
| 12 | 可接外部 Mock Event Stream | Environment Blocked | External-store mock state is source; browser interaction not executed. |
| 13 | 可使用 HAC-Agent 自有品牌 | Source Passed / Browser Unverified | Local branding in source/CSS. |
| 14 | 不需要 Fork | Passed | No dependency fork or patch. |
| 15 | 不需要大量 Custom Replacement | Source Passed / Browser Unverified | Uses public external-store runtime and tool callbacks. |
| 16 | 核心路径使用公开开源 API | Source Passed / Browser Unverified | Only public @assistant-ui/react exports used. |
| 17 | 测试结果可复现 | Environment Blocked | Browser environment did not allow rendered interaction proof. |

## 10. Final Conclusion

```text
Environment Blocked
```

Reason: commercialization/license and source-level open-core checks are favorable, and the thin prototype builds successfully, but the host browser environment could not render the page or execute the eight browser interaction paths. Under the task rules this is `Environment Blocked`, not `Reference Client Proof Passed` and not `Reference Client Proof Failed`.

Recommendation to freeze:

```text
HAC-Agent Reference Client = assistant-ui
```

Not recommended yet. Browser evidence is required before freezing the Reference Client.
