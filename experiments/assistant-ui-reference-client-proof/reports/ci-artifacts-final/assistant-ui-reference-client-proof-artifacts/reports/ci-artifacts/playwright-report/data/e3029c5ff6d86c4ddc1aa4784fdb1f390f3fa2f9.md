# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant-ui-reference-client.spec.ts >> assistant-ui hosted browser reference proof >> Test D - Deny
- Location: tests/assistant-ui-reference-client.spec.ts:302:3

# Error details

```
Error: Browser console must not contain errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Resource updated before mount",
+   "Resource updated before mount",
+ ]
```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: assistant-ui Reference Client Proof
      - heading "HAC-Agent Open-source Boundary" [level=1] [ref=e7]
    - strong [ref=e8]: running
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - paragraph [ref=e13]: Please validate the HAC-Agent Reference Client boundary with assistant-ui.
        - generic [ref=e14]:
          - paragraph [ref=e15]: "Local mock stream: assistant-ui external-store runtime is active;"
          - generic [ref=e16]:
            - generic [ref=e17]:
              - generic [ref=e18]: Tool Request
              - strong [ref=e19]: request_human_decision
            - generic [ref=e20]: "{ \"task\": \"review_reference_client_boundary\", \"riskLevel\": \"medium\", \"requiresHumanAgency\": true, \"version\": 1 }"
            - paragraph [ref=e21]: "Tool status: pending"
            - textbox "Modify structured tool arguments" [ref=e22]: "{ \"task\": \"review_reference_client_boundary\", \"riskLevel\": \"medium\", \"requiresHumanAgency\": true, \"version\": 1 }"
            - generic [ref=e23]:
              - button "Approve" [ref=e24] [cursor=pointer]
              - button "Deny" [ref=e25] [cursor=pointer]
              - button "Modify" [ref=e26] [cursor=pointer]
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Artifact
              - strong [ref=e30]: HAC-Agent Reference Client artifact
            - paragraph [ref=e31]: "Status: proposed"
            - paragraph [ref=e32]: "Source: local_mock_event_stream"
      - generic [ref=e33]:
        - textbox "Local mock composer" [ref=e34]
        - button "Send" [disabled] [ref=e35]
    - complementary [ref=e36]:
      - heading "Local Mock Controller" [level=2] [ref=e37]
      - paragraph [ref=e38]: "Decision: pending"
      - paragraph [ref=e39]: "Renders: 4"
      - generic [ref=e40]:
        - button "Interrupt" [ref=e41] [cursor=pointer]
        - button "Resume" [ref=e42] [cursor=pointer]
        - button "Fail" [ref=e43] [cursor=pointer]
        - button "Recover" [ref=e44] [cursor=pointer]
      - generic [ref=e45]:
        - text: Artifact runtime status
        - combobox "Artifact runtime status" [ref=e46]:
          - option "proposed" [selected]
          - option "pending_user_confirmation"
          - option "accepted"
          - option "frozen"
      - list [ref=e47]:
        - listitem [ref=e48]:
          - code [ref=e49]: "thread_started: assistant-ui external-store runtime mounted."
        - listitem [ref=e50]:
          - code [ref=e51]: "message: Seeded user message is visible."
        - listitem [ref=e52]:
          - code [ref=e53]: "run_started: Local mock run started without Assistant Cloud."
        - listitem [ref=e54]:
          - code [ref=e55]: "tool_requested: request_human_decision awaits explicit human input."
        - listitem [ref=e56]:
          - code [ref=e57]: "artifact_proposed: Artifact status is proposed from mock runtime input."
        - listitem [ref=e58]:
          - code [ref=e59]: "stream_delta: assistant-ui external-store runtime is active;"
```

# Test source

```ts
  149 |
  150 | Console:
  151 |
  152 | ${consoleMessageBlock}
  153 |
  154 | Console errors:
  155 |
  156 | ${consoleBlock}
  157 |
  158 | Runtime requests:
  159 |
  160 | ${requestBlock}
  161 | `;
  162 |     })
  163 |     .join("\n");
  164 |
  165 |   fs.writeFileSync(
  166 |     browserResultsPath,
  167 |     `# Browser Test Results
  168 |
  169 | Task: \`CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01\`
  170 |
  171 | Environment: GitHub Actions Hosted Runner, ubuntu-24.04, Playwright bundled Chromium.
  172 |
  173 | | Test | Result | Duplicate Submission Check | Console Errors | Screenshot |
  174 | |---|---|---|---:|---|
  175 | ${rows}
  176 |
  177 | ${detail}
  178 | `,
  179 |     "utf8"
  180 |   );
  181 |
  182 |   const requests = allResults.flatMap((result) => result.runtimeRequests);
  183 |   const requestRows = requests
  184 |     .map(
  185 |       (request) =>
  186 |         `| ${request.url} | ${request.method} | ${request.purpose} | ${request.networkClass} | ${request.localRemote} | ${request.credentialPresent} | ${request.required} | ${request.allowedBlocked} | ${request.evidence} |`
  187 |     )
  188 |     .join("\n");
  189 |
  190 |   fs.writeFileSync(
  191 |     networkResultsPath,
  192 |     `# Runtime Network Requests - CI
  193 |
  194 | Task: \`CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01\`
  195 |
  196 | ## Network Boundary
  197 |
  198 | CI Setup Network is allowed for npm registry access, GitHub Actions services, and Playwright Chromium download.
  199 |
  200 | Application Runtime Network was captured by Playwright during the rendered browser tests. Runtime requests are only allowed to localhost, 127.0.0.1, local static resources, and the local mock event stream.
  201 |
  202 | | URL / Domain | Method | Purpose | CI Setup Network or Application Runtime Network | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
  203 | |---|---|---|---|---|---|---|---|---|
  204 | ${requestRows}
  205 | `,
  206 |     "utf8"
  207 |   );
  208 | }
  209 |
  210 | async function recordResult(
  211 |   page: Page,
  212 |   testName: string,
  213 |   evidence: ReturnType<typeof setupEvidence>,
  214 |   duplicateSubmissionCheck: string,
  215 |   screenshotSlug: string,
  216 |   run: () => Promise<void>
  217 | ) {
  218 |   let status: TestResult["status"] = "Passed";
  219 |   let runError: unknown;
  220 |   let screenshot = "";
  221 |   try {
  222 |     await run();
  223 |   } catch (error) {
  224 |     status = "Failed";
  225 |     runError = error;
  226 |   } finally {
  227 |     const blocked = evidence.runtimeRequests.filter((request) => request.allowedBlocked === "Blocked");
  228 |     if (blocked.length > 0 || evidence.consoleErrors.length > 0) {
  229 |       status = "Failed";
  230 |     }
  231 |     const mockControllerEvents = await page
  232 |       .getByTestId("event-ledger")
  233 |       .locator("li")
  234 |       .allTextContents()
  235 |       .catch(() => []);
  236 |     screenshot = await saveScreenshot(page, screenshotSlug).catch(() => "");
  237 |     allResults.push({
  238 |       test: testName,
  239 |       status,
  240 |       consoleMessages: evidence.consoleMessages,
  241 |       consoleErrors: evidence.consoleErrors,
  242 |       mockControllerEvents,
  243 |       runtimeRequests: evidence.runtimeRequests,
  244 |       duplicateSubmissionCheck,
  245 |       screenshot
  246 |     });
  247 |     await writeReports();
  248 |     expect(blocked, "Application runtime network must stay local and credential-free").toEqual([]);
> 249 |     expect(evidence.consoleErrors, "Browser console must not contain errors").toEqual([]);
      |                                                                               ^ Error: Browser console must not contain errors
  250 |     if (runError) {
  251 |       throw runError;
  252 |     }
  253 |   }
  254 | }
  255 |
  256 | test.describe("assistant-ui hosted browser reference proof", () => {
  257 |   test("Test A - Chat / Streaming", async ({ page }) => {
  258 |     const testName = "Test A - Chat / Streaming";
  259 |     const evidence = setupEvidence(page, testName);
  260 |
  261 |     await recordResult(page, testName, evidence, "No human decision submitted in this path.", "test-a-chat-streaming", async () => {
  262 |       await openProof(page);
  263 |       await expect(page.getByText("Please validate the HAC-Agent Reference Client boundary with assistant-ui.")).toBeVisible();
  264 |       await expect(page.getByText(/assistant-ui external-store runtime is active/)).toBeVisible();
  265 |       await expect(page.getByText(/no Assistant Cloud or real model is used/)).toBeVisible();
  266 |       await expect(page.getByTestId("run-state")).toContainText("running");
  267 |     });
  268 |   });
  269 |
  270 |   test("Test B - Tool Request", async ({ page }) => {
  271 |     const testName = "Test B - Tool Request";
  272 |     const evidence = setupEvidence(page, testName);
  273 |
  274 |     await recordResult(page, testName, evidence, "No human decision submitted in this path.", "test-b-tool-request", async () => {
  275 |       await openProof(page);
  276 |       await expect(page.getByTestId("tool-request")).toBeVisible();
  277 |       await expect(page.getByTestId("tool-name")).toHaveText("request_human_decision");
  278 |       await expect(page.getByTestId("tool-args")).toContainText("review_reference_client_boundary");
  279 |       await expect(page.getByTestId("tool-args")).toContainText('"requiresHumanAgency": true');
  280 |       await expect(page.getByTestId("tool-status")).toContainText("pending");
  281 |       await expect(page.getByTestId("event-ledger")).toContainText("tool_requested:");
  282 |     });
  283 |   });
  284 |
  285 |   test("Test C - Approve", async ({ page }) => {
  286 |     const testName = "Test C - Approve";
  287 |     const evidence = setupEvidence(page, testName);
  288 |
  289 |     await recordResult(page, testName, evidence, "human_approved is emitted once; reload does not replay it.", "test-c-approve", async () => {
  290 |       await openProof(page);
  291 |       await page.getByTestId("approve-button").click();
  292 |       await expect(page.getByTestId("decision-state")).toContainText("approved");
  293 |       await expect(page.getByTestId("run-state")).toContainText("recovered");
  294 |       await expect(page.getByTestId("tool-status")).toContainText("approved");
  295 |       await expect.poll(() => eventCount(page, "human_approved")).toBe(1);
  296 |       await page.reload();
  297 |       await openProof(page);
  298 |       await expect.poll(() => eventCount(page, "human_approved")).toBe(0);
  299 |     });
  300 |   });
  301 |
  302 |   test("Test D - Deny", async ({ page }) => {
  303 |     const testName = "Test D - Deny";
  304 |     const evidence = setupEvidence(page, testName);
  305 |
  306 |     await recordResult(page, testName, evidence, "human_denied is emitted once; reload does not replay it.", "test-d-deny", async () => {
  307 |       await openProof(page);
  308 |       await page.getByTestId("deny-button").click();
  309 |       await expect(page.getByTestId("decision-state")).toContainText("denied");
  310 |       await expect(page.getByTestId("run-state")).toContainText("recovered");
  311 |       await expect(page.getByTestId("tool-status")).toContainText("denied");
  312 |       await expect(page.getByTestId("tool-status")).not.toContainText("executed");
  313 |       await expect.poll(() => eventCount(page, "human_denied")).toBe(1);
  314 |       await page.reload();
  315 |       await openProof(page);
  316 |       await expect.poll(() => eventCount(page, "human_denied")).toBe(0);
  317 |     });
  318 |   });
  319 |
  320 |   test("Test E - Modify", async ({ page }) => {
  321 |     const testName = "Test E - Modify";
  322 |     const evidence = setupEvidence(page, testName);
  323 |
  324 |     await recordResult(page, testName, evidence, "human_modified is emitted once; reload does not replay it.", "test-e-modify", async () => {
  325 |       await openProof(page);
  326 |       const modifiedArgs = {
  327 |         task: "review_reference_client_boundary_with_modified_risk",
  328 |         riskLevel: "high",
  329 |         requiresHumanAgency: true,
  330 |         version: 1
  331 |       };
  332 |       await page.getByLabel("Modify structured tool arguments").fill(JSON.stringify(modifiedArgs, null, 2));
  333 |       await page.getByTestId("modify-button").click();
  334 |       await expect(page.getByTestId("decision-state")).toContainText("modified");
  335 |       await expect(page.getByTestId("run-state")).toContainText("interrupted");
  336 |       await expect(page.getByTestId("tool-args")).toContainText("review_reference_client_boundary_with_modified_risk");
  337 |       await expect(page.getByTestId("tool-args")).toContainText('"version": 2');
  338 |       await expect(page.getByTestId("event-ledger")).toContainText("human_confirmation_requested:");
  339 |       await expect.poll(() => eventCount(page, "human_modified")).toBe(1);
  340 |       await page.reload();
  341 |       await openProof(page);
  342 |       await expect.poll(() => eventCount(page, "human_modified")).toBe(0);
  343 |     });
  344 |   });
  345 |
  346 |   test("Test F - Interrupt / Resume", async ({ page }) => {
  347 |     const testName = "Test F - Interrupt / Resume";
  348 |     const evidence = setupEvidence(page, testName);
  349 |
```