# Open-core Contribution

Generated: 2026-06-15T11:16:49.204Z

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

## Counts

| Source | Count |
|---|---:|
| Native Open-source | 0 |
| Configured Open-source | 7 |
| Thin Extension | 3 |
| Custom Replacement | 0 |
| Cloud | 0 |
| Unsupported | 0 |

Source-level conclusion: no large custom replacement was needed in the prototype source; browser proof is blocked by environment.
