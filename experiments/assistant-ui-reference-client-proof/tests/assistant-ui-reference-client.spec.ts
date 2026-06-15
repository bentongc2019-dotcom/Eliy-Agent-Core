import { expect, test, type ConsoleMessage, type Page, type Request } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type RuntimeRequest = {
  test: string;
  url: string;
  method: string;
  purpose: string;
  networkClass: "Application Runtime Network";
  localRemote: "Local" | "Remote";
  credentialPresent: "No observed credential" | "Yes";
  required: "Yes" | "No";
  allowedBlocked: "Allowed" | "Blocked";
  evidence: string;
};

type TestResult = {
  test: string;
  status: "Passed" | "Failed";
  consoleMessages: string[];
  consoleErrors: string[];
  mockControllerEvents: string[];
  runtimeRequests: RuntimeRequest[];
  duplicateSubmissionCheck: string;
  screenshot: string;
};

const reportsDir = path.resolve("reports");
const screenshotsDir = path.resolve("screenshots");
const browserResultsPath = path.join(reportsDir, "browser-test-results.md");
const networkResultsPath = path.join(reportsDir, "runtime-network-requests-ci.md");
const allResults: TestResult[] = [];

function ensureArtifactDirs() {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function isLocalRuntimeUrl(rawUrl: string) {
  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return true;
  }

  const parsed = new URL(rawUrl);
  return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
}

function classifyRequest(testName: string, request: Request): RuntimeRequest {
  const headers = request.headers();
  const hasCredential = Boolean(headers.authorization || headers.cookie || headers["x-api-key"]);
  const local = isLocalRuntimeUrl(request.url());
  return {
    test: testName,
    url: request.url(),
    method: request.method(),
    purpose: local
      ? "assistant-ui proof page, local Vite static resource, or local mock event stream"
      : "Unexpected remote application runtime request",
    networkClass: "Application Runtime Network",
    localRemote: local ? "Local" : "Remote",
    credentialPresent: hasCredential ? "Yes" : "No observed credential",
    required: "Yes",
    allowedBlocked: local && !hasCredential ? "Allowed" : "Blocked",
    evidence: `${testName} Playwright request log`
  };
}

function setupEvidence(page: Page, testName: string) {
  const runtimeRequests: RuntimeRequest[] = [];
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    runtimeRequests.push(classifyRequest(testName, request));
  });

  page.on("console", (message: ConsoleMessage) => {
    consoleMessages.push(`${message.type()}: ${message.text()}`);
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleMessages.push(`pageerror: ${error.message}`);
    consoleErrors.push(error.message);
  });

  return { runtimeRequests, consoleMessages, consoleErrors };
}

async function openProof(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("thread-root")).toBeVisible();
  await expect(page.getByTestId("mock-controller")).toBeVisible();
}

async function saveScreenshot(page: Page, slug: string) {
  const screenshot = path.join("screenshots", `${slug}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return screenshot;
}

async function eventCount(page: Page, type: string) {
  return page.getByTestId("event-ledger").locator("li", { hasText: `${type}:` }).count();
}

async function writeReports() {
  ensureArtifactDirs();
  const rows = allResults
    .map(
      (result) =>
        `| ${result.test} | ${result.status} | ${result.duplicateSubmissionCheck} | ${result.consoleErrors.length} | ${result.screenshot} |`
    )
    .join("\n");

  const detail = allResults
    .map((result) => {
      const consoleMessageBlock =
        result.consoleMessages.length === 0
          ? "None observed."
          : result.consoleMessages.map((line) => `- ${line}`).join("\n");
      const consoleBlock =
        result.consoleErrors.length === 0
          ? "None observed."
          : result.consoleErrors.map((line) => `- ${line}`).join("\n");
      const mockControllerBlock =
        result.mockControllerEvents.length === 0
          ? "No mock controller events captured."
          : result.mockControllerEvents.map((line) => `- ${line}`).join("\n");
      const requestBlock = result.runtimeRequests
        .map(
          (request) =>
            `- ${request.method} ${request.url} | ${request.localRemote} | ${request.credentialPresent} | ${request.allowedBlocked}`
        )
        .join("\n");

      return `### ${result.test}

- Result: ${result.status}
- Duplicate submission check: ${result.duplicateSubmissionCheck}
- Screenshot: ${result.screenshot}
- Console errors: ${result.consoleErrors.length}

Mock Controller events:

${mockControllerBlock}

Console:

${consoleMessageBlock}

Console errors:

${consoleBlock}

Runtime requests:

${requestBlock}
`;
    })
    .join("\n");

  fs.writeFileSync(
    browserResultsPath,
    `# Browser Test Results

Task: \`CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01\`

Environment: GitHub Actions Hosted Runner, ubuntu-24.04, Playwright bundled Chromium.

| Test | Result | Duplicate Submission Check | Console Errors | Screenshot |
|---|---|---|---:|---|
${rows}

${detail}
`,
    "utf8"
  );

  const requests = allResults.flatMap((result) => result.runtimeRequests);
  const requestRows = requests
    .map(
      (request) =>
        `| ${request.url} | ${request.method} | ${request.purpose} | ${request.networkClass} | ${request.localRemote} | ${request.credentialPresent} | ${request.required} | ${request.allowedBlocked} | ${request.evidence} |`
    )
    .join("\n");

  fs.writeFileSync(
    networkResultsPath,
    `# Runtime Network Requests - CI

Task: \`CP-HAC-ASSISTANT-UI-REFERENCE-CLIENT-PROOF-01\`

## Network Boundary

CI Setup Network is allowed for npm registry access, GitHub Actions services, and Playwright Chromium download.

Application Runtime Network was captured by Playwright during the rendered browser tests. Runtime requests are only allowed to localhost, 127.0.0.1, local static resources, and the local mock event stream.

| URL / Domain | Method | Purpose | CI Setup Network or Application Runtime Network | Local / Remote | Credential Present | Required | Allowed / Blocked | Evidence |
|---|---|---|---|---|---|---|---|---|
${requestRows}
`,
    "utf8"
  );
}

async function recordResult(
  page: Page,
  testName: string,
  evidence: ReturnType<typeof setupEvidence>,
  duplicateSubmissionCheck: string,
  screenshotSlug: string,
  run: () => Promise<void>
) {
  let status: TestResult["status"] = "Passed";
  let runError: unknown;
  let screenshot = "";
  try {
    await run();
  } catch (error) {
    status = "Failed";
    runError = error;
  } finally {
    const blocked = evidence.runtimeRequests.filter((request) => request.allowedBlocked === "Blocked");
    if (blocked.length > 0 || evidence.consoleErrors.length > 0) {
      status = "Failed";
    }
    const mockControllerEvents = await page
      .getByTestId("event-ledger")
      .locator("li")
      .allTextContents()
      .catch(() => []);
    screenshot = await saveScreenshot(page, screenshotSlug).catch(() => "");
    allResults.push({
      test: testName,
      status,
      consoleMessages: evidence.consoleMessages,
      consoleErrors: evidence.consoleErrors,
      mockControllerEvents,
      runtimeRequests: evidence.runtimeRequests,
      duplicateSubmissionCheck,
      screenshot
    });
    await writeReports();
    expect(blocked, "Application runtime network must stay local and credential-free").toEqual([]);
    expect(evidence.consoleErrors, "Browser console must not contain errors").toEqual([]);
    if (runError) {
      throw runError;
    }
  }
}

test.describe("assistant-ui hosted browser reference proof", () => {
  test("Test A - Chat / Streaming", async ({ page }) => {
    const testName = "Test A - Chat / Streaming";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "No human decision submitted in this path.", "test-a-chat-streaming", async () => {
      await openProof(page);
      await expect(page.getByText("Please validate the HAC-Agent Reference Client boundary with assistant-ui.")).toBeVisible();
      await expect(page.getByText(/assistant-ui external-store runtime is active/)).toBeVisible();
      await expect(page.getByText(/no Assistant Cloud or real model is used/)).toBeVisible();
      await expect(page.getByTestId("run-state")).toContainText("running");
    });
  });

  test("Test B - Tool Request", async ({ page }) => {
    const testName = "Test B - Tool Request";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "No human decision submitted in this path.", "test-b-tool-request", async () => {
      await openProof(page);
      await expect(page.getByTestId("tool-request")).toBeVisible();
      await expect(page.getByTestId("tool-name")).toHaveText("request_human_decision");
      await expect(page.getByTestId("tool-args")).toContainText("review_reference_client_boundary");
      await expect(page.getByTestId("tool-args")).toContainText('"requiresHumanAgency": true');
      await expect(page.getByTestId("tool-status")).toContainText("pending");
      await expect(page.getByTestId("event-ledger")).toContainText("tool_requested:");
    });
  });

  test("Test C - Approve", async ({ page }) => {
    const testName = "Test C - Approve";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "human_approved is emitted once; reload does not replay it.", "test-c-approve", async () => {
      await openProof(page);
      await page.getByTestId("approve-button").click();
      await expect(page.getByTestId("decision-state")).toContainText("approved");
      await expect(page.getByTestId("run-state")).toContainText("recovered");
      await expect(page.getByTestId("tool-status")).toContainText("approved");
      await expect.poll(() => eventCount(page, "human_approved")).toBe(1);
      await page.reload();
      await openProof(page);
      await expect.poll(() => eventCount(page, "human_approved")).toBe(0);
    });
  });

  test("Test D - Deny", async ({ page }) => {
    const testName = "Test D - Deny";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "human_denied is emitted once; reload does not replay it.", "test-d-deny", async () => {
      await openProof(page);
      await page.getByTestId("deny-button").click();
      await expect(page.getByTestId("decision-state")).toContainText("denied");
      await expect(page.getByTestId("run-state")).toContainText("recovered");
      await expect(page.getByTestId("tool-status")).toContainText("denied");
      await expect(page.getByTestId("tool-status")).not.toContainText("executed");
      await expect.poll(() => eventCount(page, "human_denied")).toBe(1);
      await page.reload();
      await openProof(page);
      await expect.poll(() => eventCount(page, "human_denied")).toBe(0);
    });
  });

  test("Test E - Modify", async ({ page }) => {
    const testName = "Test E - Modify";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "human_modified is emitted once; reload does not replay it.", "test-e-modify", async () => {
      await openProof(page);
      const modifiedArgs = {
        task: "review_reference_client_boundary_with_modified_risk",
        riskLevel: "high",
        requiresHumanAgency: true,
        version: 1
      };
      await page.getByLabel("Modify structured tool arguments").fill(JSON.stringify(modifiedArgs, null, 2));
      await page.getByTestId("modify-button").click();
      await expect(page.getByTestId("decision-state")).toContainText("modified");
      await expect(page.getByTestId("run-state")).toContainText("interrupted");
      await expect(page.getByTestId("tool-args")).toContainText("review_reference_client_boundary_with_modified_risk");
      await expect(page.getByTestId("tool-args")).toContainText('"version": 2');
      await expect(page.getByTestId("event-ledger")).toContainText("human_confirmation_requested:");
      await expect.poll(() => eventCount(page, "human_modified")).toBe(1);
      await page.reload();
      await openProof(page);
      await expect.poll(() => eventCount(page, "human_modified")).toBe(0);
    });
  });

  test("Test F - Interrupt / Resume", async ({ page }) => {
    const testName = "Test F - Interrupt / Resume";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "No prior human decision is replayed during interrupt/resume.", "test-f-interrupt-resume", async () => {
      await openProof(page);
      await page.getByTestId("interrupt-button").click();
      await expect(page.getByTestId("run-state")).toContainText("interrupted");
      await expect.poll(() => eventCount(page, "run_interrupted")).toBe(1);
      await page.getByTestId("resume-button").click();
      await expect(page.getByTestId("run-state")).toContainText("running");
      await expect.poll(async () => (await eventCount(page, "run_resumed")) >= 1).toBeTruthy();
      await expect.poll(() => eventCount(page, "human_approved")).toBe(0);
      await expect.poll(() => eventCount(page, "human_denied")).toBe(0);
      await expect.poll(() => eventCount(page, "human_modified")).toBe(0);
    });
  });

  test("Test G - Artifact", async ({ page }) => {
    const testName = "Test G - Artifact";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "No human decision submitted in this path.", "test-g-artifact", async () => {
      await openProof(page);
      await expect(page.getByTestId("artifact-panel")).toBeVisible();
      await expect(page.getByTestId("artifact-status")).toContainText("proposed");
      await expect(page.getByTestId("artifact-status")).not.toContainText("accepted");
      await expect(page.getByTestId("artifact-status")).not.toContainText("frozen");
      await page.getByTestId("artifact-select").selectOption("pending_user_confirmation");
      await expect(page.getByTestId("artifact-status")).toContainText("pending_user_confirmation");
      await expect(page.getByTestId("event-ledger")).toContainText("Artifact status set by mock runtime to pending_user_confirmation.");
    });
  });

  test("Test H - Failure / Recovery", async ({ page }) => {
    const testName = "Test H - Failure / Recovery";
    const evidence = setupEvidence(page, testName);

    await recordResult(page, testName, evidence, "No human decision is replayed during failure/recovery.", "test-h-failure-recovery", async () => {
      await openProof(page);
      await page.getByTestId("fail-button").click();
      await expect(page.getByTestId("run-state")).toContainText("failed");
      await expect.poll(() => eventCount(page, "run_failed")).toBe(1);
      await page.getByTestId("recover-button").click();
      await expect(page.getByTestId("run-state")).toContainText("recovered");
      await expect.poll(async () => (await eventCount(page, "run_resumed")) >= 1).toBeTruthy();
      await expect.poll(() => eventCount(page, "human_approved")).toBe(0);
      await expect.poll(() => eventCount(page, "human_denied")).toBe(0);
      await expect.poll(() => eventCount(page, "human_modified")).toBe(0);
    });
  });
});
