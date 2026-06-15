# Runtime Network Requests

Generated: 2026-06-15T11:16:49.204Z

Conclusion: `Environment Blocked`

## HTTP-level Evidence

| Domain / URL | Purpose | Local / Remote | Credential | Required | Evidence |
|---|---|---|---|---|---|
| `http://127.0.0.1:4177/` | Load Vite proof page | Local | No credential | Yes | `reports/browser-test-artifacts/http-home-headers.txt`, `reports/browser-test-artifacts/http-home.html` |

## Browser-level Evidence

Browser-level request capture could not be produced because no browser rendered the page.

| Request Class | Observed | Notes |
|---|---|---|
| localhost / 127.0.0.1 page load | HTTP-level only | Browser did not render |
| Assistant Cloud | Not observed | Browser request list unavailable; source does not import cloud runtime |
| Remote model API | Not observed | No API key/model adapter code; browser request list unavailable |
| Remote Agent Runtime | Not observed | Local mock only; browser request list unavailable |
| License service | Not observed | No license key/service code; browser request list unavailable |

No request blocking, fake cloud response, SDK patch, license verifier patch, or remote browser service was used.
