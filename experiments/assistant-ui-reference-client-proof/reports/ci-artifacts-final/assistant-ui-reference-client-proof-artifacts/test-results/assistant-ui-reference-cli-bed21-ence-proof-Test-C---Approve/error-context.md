# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant-ui-reference-client.spec.ts >> assistant-ui hosted browser reference proof >> Test C - Approve
- Location: tests/assistant-ui-reference-client.spec.ts:302:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('proof-ready')
Expected: "ready"
Received: "warming"
Timeout:  8000ms

Call log:
  - Expect "toHaveText" with timeout 8000ms
  - waiting for getByTestId('proof-ready')
    20 × locator resolved to <span class="proof-ready" data-testid="proof-ready">warming</span>
       - unexpected value "warming"

```

```yaml
- text: warming
```

# Test source

```ts
  1   | import { expect, test, type ConsoleMessage, type Page, type Request } from "@playwright/test";
  2   | import fs from "node:fs";
  3   | import path from "node:path";
  4   | 
  5   | type RuntimeRequest = {
  6   |   test: string;
  7   |   url: string;
  8   |   method: string;
  9   |   purpose: string;
  10  |   networkClass: "Application Runtime Network";
  11  |   localRemote: "Local" | "Remote";
  12  |   credentialPresent: "No observed credential" | "Yes";
  13  |   required: "Yes" | "No";
  14  |   allowedBlocked: "Allowed" | "Blocked";
  15  |   evidence: string;
  16  | };
  17  | 
  18  | type TestResult = {
  19  |   test: string;
  20  |   status: "Passed" | "Failed";
  21  |   consoleMessages: string[];
  22  |   consoleErrors: string[];
  23  |   mockControllerEvents: string[];
  24  |   runtimeRequests: RuntimeRequest[];
  25  |   duplicateSubmissionCheck: string;
  26  |   screenshot: string;
  27  | };
  28  | 
  29  | const reportsDir = path.resolve("reports");
  30  | const screenshotsDir = path.resolve("screenshots");
  31  | const browserResultsPath = path.join(reportsDir, "browser-test-results.md");
  32  | const networkResultsPath = path.join(reportsDir, "runtime-network-requests-ci.md");
  33  | const controllerStorageKey = "hac-assistant-ui-reference-proof-controller-v1";
  34  | const allResults: TestResult[] = [];
  35  | 
  36  | function ensureArtifactDirs() {
  37  |   fs.mkdirSync(reportsDir, { recursive: true });
  38  |   fs.mkdirSync(screenshotsDir, { recursive: true });
  39  | }
  40  | 
  41  | function isLocalRuntimeUrl(rawUrl: string) {
  42  |   if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
  43  |     return true;
  44  |   }
  45  | 
  46  |   const parsed = new URL(rawUrl);
  47  |   return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  48  | }
  49  | 
  50  | function classifyRequest(testName: string, request: Request): RuntimeRequest {
  51  |   const headers = request.headers();
  52  |   const hasCredential = Boolean(headers.authorization || headers.cookie || headers["x-api-key"]);
  53  |   const local = isLocalRuntimeUrl(request.url());
  54  |   return {
  55  |     test: testName,
  56  |     url: request.url(),
  57  |     method: request.method(),
  58  |     purpose: local
  59  |       ? "assistant-ui proof page, local Vite static resource, or local mock event stream"
  60  |       : "Unexpected remote application runtime request",
  61  |     networkClass: "Application Runtime Network",
  62  |     localRemote: local ? "Local" : "Remote",
  63  |     credentialPresent: hasCredential ? "Yes" : "No observed credential",
  64  |     required: "Yes",
  65  |     allowedBlocked: local && !hasCredential ? "Allowed" : "Blocked",
  66  |     evidence: `${testName} Playwright request log`
  67  |   };
  68  | }
  69  | 
  70  | function setupEvidence(page: Page, testName: string) {
  71  |   const runtimeRequests: RuntimeRequest[] = [];
  72  |   const consoleMessages: string[] = [];
  73  |   const consoleErrors: string[] = [];
  74  | 
  75  |   page.on("request", (request) => {
  76  |     runtimeRequests.push(classifyRequest(testName, request));
  77  |   });
  78  | 
  79  |   page.on("console", (message: ConsoleMessage) => {
  80  |     consoleMessages.push(`${message.type()}: ${message.text()}`);
  81  |     if (message.type() === "error") {
  82  |       consoleErrors.push(message.text());
  83  |     }
  84  |   });
  85  | 
  86  |   page.on("pageerror", (error) => {
  87  |     consoleMessages.push(`pageerror: ${error.message}`);
  88  |     consoleErrors.push(error.message);
  89  |   });
  90  | 
  91  |   return { runtimeRequests, consoleMessages, consoleErrors };
  92  | }
  93  | 
  94  | async function waitForProofReady(page: Page) {
  95  |   await expect(page.getByTestId("thread-root")).toBeVisible();
  96  |   await expect(page.getByTestId("mock-controller")).toBeVisible();
> 97  |   await expect(page.getByTestId("proof-ready")).toHaveText("ready");
      |                                                 ^ Error: expect(locator).toHaveText(expected) failed
  98  | }
  99  | 
  100 | async function openProof(page: Page, options: { fresh?: boolean } = {}) {
  101 |   await page.goto("/");
  102 |   if (options.fresh) {
  103 |     await page.evaluate((key) => window.sessionStorage.removeItem(key), controllerStorageKey);
  104 |     await page.reload();
  105 |   }
  106 |   await waitForProofReady(page);
  107 | }
  108 | 
  109 | async function saveScreenshot(page: Page, slug: string) {
  110 |   const screenshot = path.join("screenshots", `${slug}.png`);
  111 |   await page.screenshot({ path: screenshot, fullPage: true });
  112 |   return screenshot;
  113 | }
  114 | 
  115 | async function eventCount(page: Page, type: string) {
  116 |   return page.getByTestId("event-ledger").locator("li", { hasText: `${type}:` }).count();
  117 | }
  118 | 
  119 | async function waitForHumanConfirmation(page: Page, version = 1) {
  120 |   await expect(page.getByTestId("event-ledger")).toContainText(`human_confirmation_requested: Tool args v${version} pending.`);
  121 | }
  122 | 
  123 | async function writeReports() {
  124 |   ensureArtifactDirs();
  125 |   const rows = allResults
  126 |     .map(
  127 |       (result) =>
  128 |         `| ${result.test} | ${result.status} | ${result.duplicateSubmissionCheck} | ${result.consoleErrors.length} | ${result.screenshot} |`
  129 |     )
  130 |     .join("\n");
  131 | 
  132 |   const detail = allResults
  133 |     .map((result) => {
  134 |       const consoleMessageBlock =
  135 |         result.consoleMessages.length === 0
  136 |           ? "None observed."
  137 |           : result.consoleMessages.map((line) => `- ${line}`).join("\n");
  138 |       const consoleBlock =
  139 |         result.consoleErrors.length === 0
  140 |           ? "None observed."
  141 |           : result.consoleErrors.map((line) => `- ${line}`).join("\n");
  142 |       const mockControllerBlock =
  143 |         result.mockControllerEvents.length === 0
  144 |           ? "No mock controller events captured."
  145 |           : result.mockControllerEvents.map((line) => `- ${line}`).join("\n");
  146 |       const requestBlock = result.runtimeRequests
  147 |         .map(
  148 |           (request) =>
  149 |             `- ${request.method} ${request.url} | ${request.localRemote} | ${request.credentialPresent} | ${request.allowedBlocked}`
  150 |         )
  151 |         .join("\n");
  152 | 
  153 |       return `### ${result.test}
  154 | 
  155 | - Result: ${result.status}
  156 | - Duplicate submission check: ${result.duplicateSubmissionCheck}
  157 | - Screenshot: ${result.screenshot}
  158 | - Console errors: ${result.consoleErrors.length}
  159 | 
  160 | Mock Controller events:
  161 | 
  162 | ${mockControllerBlock}
  163 | 
  164 | Console:
  165 | 
  166 | ${consoleMessageBlock}
  167 | 
  168 | Console errors:
  169 | 
  170 | ${consoleBlock}
  171 | 
  172 | Runtime requests:
  173 | 
  174 | ${requestBlock}
  175 | `;
  176 |     })
  177 |     .join("\n");
  178 | 
  179 |   fs.writeFileSync(
  180 |     browserResultsPath,
  181 |     `# Browser Test Results
  182 | 
  183 | Task: \`CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01\`
  184 | 
  185 | Environment: GitHub Actions Hosted Runner, ubuntu-24.04, Playwright bundled Chromium.
  186 | 
  187 | | Test | Result | Duplicate Submission Check | Console Errors | Screenshot |
  188 | |---|---|---|---:|---|
  189 | ${rows}
  190 | 
  191 | ${detail}
  192 | `,
  193 |     "utf8"
  194 |   );
  195 | 
  196 |   const requests = allResults.flatMap((result) => result.runtimeRequests);
  197 |   const requestRows = requests
```