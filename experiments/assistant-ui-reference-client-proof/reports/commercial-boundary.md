# Commercial Boundary

Generated: 2026-06-15T11:16:49.204Z

| Boundary Item | Result | Evidence |
|---|---|---|
| Commercial use | Allowed by scanned licenses | Production metadata: MIT/BSD-3-Clause/0BSD only |
| Modification | Allowed by scanned licenses | Permissive licenses only |
| Closed-source integration | Allowed by scanned licenses | Permissive licenses only |
| Multi-tenant commercial service | No restriction found | No scanned production license string indicates a multi-tenant restriction |
| Own branding | Allowed | No forced assistant-ui product branding clause found |
| Assistant Cloud dependency | Not used at runtime by prototype source | No AssistantCloud/cloud runtime import in `src/`; cloud package is transitive only |
| Real LLM / API key | Not used | No model adapter/API key code |
| Real Agent Runtime | Not used | Local React mock event stream only |
| Fork / patch | Not used | No node_modules source patch or fork |

Conclusion: commercial/license gate passed based on installed metadata. Full reference-client proof remains `Environment Blocked` because browser execution could not be captured.
