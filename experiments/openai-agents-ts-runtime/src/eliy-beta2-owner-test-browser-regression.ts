import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

type StepStatus = "PASS" | "FAIL" | "WARN";

type CheckResult = {
  status: StepStatus;
  step: string;
  detail?: string;
};

type ConsoleEntry = {
  type: string;
  text: string;
};

const results: CheckResult[] = [];
const consoleEntries: ConsoleEntry[] = [];
const artifactDir = path.join(os.tmpdir(), `eliy-beta2-browser-regression-${Date.now()}`);

function record(status: StepStatus, step: string, detail?: string): void {
  results.push({ status, step, detail });
  console.log(`${status} ${step}${detail ? ` | ${detail}` : ""}`);
}

function assertCheck(condition: boolean, step: string, detail?: string): void {
  if (!condition) {
    record("FAIL", step, detail);
    throw new Error(`${step}${detail ? ` | ${detail}` : ""}`);
  }
  record("PASS", step, detail);
}

function sanitize(text: string): string {
  const invite = process.env.ELIY_OWNER_TEST_INVITE_CODE || "";
  let output = text;
  if (invite) output = output.split(invite).join("<INVITE_CODE_REDACTED>");
  return output;
}

function config(): {
  baseUrl: string;
  email: string;
  inviteCode: string;
  headless: boolean;
} {
  const baseUrl = String(process.env.ELIY_OWNER_TEST_URL || "https://hk-beta2.eliyai.com").replace(/\/+$/, "");
  const email = String(process.env.ELIY_OWNER_TEST_EMAIL || "owner-test@eliyai.com");
  const inviteCode = String(process.env.ELIY_OWNER_TEST_INVITE_CODE || "");
  const headless = process.env.ELIY_BROWSER_HEADLESS === "0" ? false : true;

  return { baseUrl, email, inviteCode, headless };
}

async function saveFailureArtifacts(page: Page, label: string): Promise<void> {
  fs.mkdirSync(artifactDir, { recursive: true });
  const safeLabel = label.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
  const screenshotPath = path.join(artifactDir, `${safeLabel}.png`);
  const htmlPath = path.join(artifactDir, `${safeLabel}.html`);
  const consolePath = path.join(artifactDir, `${safeLabel}.console.json`);

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const html = await page.content().catch(() => "");
  fs.writeFileSync(htmlPath, sanitize(html), "utf8");
  fs.writeFileSync(consolePath, JSON.stringify(consoleEntries.map((entry) => ({
    type: entry.type,
    text: sanitize(entry.text),
  })), null, 2), "utf8");

  console.error(`failure_artifacts_dir=${artifactDir}`);
  console.error(`failure_screenshot=${screenshotPath}`);
  console.error(`failure_html=${htmlPath}`);
  console.error(`failure_console=${consolePath}`);
}

async function clickFirstVisible(page: Page, selectors: string[], step: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.click();
        record("PASS", step, `selector=${selector}`);
        return true;
      }
    }
  }

  record("WARN", step, "no visible selector matched");
  return false;
}

async function getRequiredVisibleTestId(page: Page, testId: string, step: string): Promise<ReturnType<Page["locator"]>> {
  const locator = page.locator(`[data-testid="${testId}"]`).last();
  assertCheck(await locator.count().catch(() => 0) > 0, step, `missing data-testid=${testId}`);
  assertCheck(await locator.isVisible().catch(() => false), step, `hidden data-testid=${testId}`);
  return locator;
}

async function clickRequiredTestId(page: Page, testId: string, step: string): Promise<void> {
  const locator = await getRequiredVisibleTestId(page, testId, step);
  await locator.click();
  record("PASS", step, `data-testid=${testId}`);
}

async function getRequiredConversationId(page: Page, selector: string, step: string): Promise<string> {
  const locator = page.locator(selector).first();
  assertCheck(await locator.count().catch(() => 0) > 0, step, `missing selector=${selector}`);
  assertCheck(await locator.isVisible().catch(() => false), step, `hidden selector=${selector}`);
  const conversationId = await locator.getAttribute("data-conversation-id");
  assertCheck(Boolean(conversationId), step, `missing data-conversation-id for selector=${selector}`);
  return String(conversationId);
}

async function clickConversationById(page: Page, conversationId: string, step: string): Promise<void> {
  const selector = `#historyList [data-conversation-id="${conversationId}"]`;
  const locator = page.locator(selector).first();
  assertCheck(await locator.count().catch(() => 0) > 0, step, `missing selector=${selector}`);
  assertCheck(await locator.isVisible().catch(() => false), step, `hidden selector=${selector}`);
  await locator.click();
  record("PASS", step, `selector=${selector}`);
}

async function fillFirstVisible(page: Page, selectors: string[], value: string, step: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.fill(value);
        record("PASS", step, `selector=${selector}`);
        return true;
      }
    }
  }

  record("FAIL", step, "no visible selector matched");
  return false;
}

async function textVisible(page: Page, text: string, timeout = 12000): Promise<boolean> {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function waitForAnyText(page: Page, texts: string[], timeout = 20000): Promise<string> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    for (const text of texts) {
      if (bodyText.includes(text)) return text;
    }
    await page.waitForTimeout(500);
  }
  return "";
}

async function getBodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 10000 });
}

async function checkAuthMe(page: Page, baseUrl: string, expectedAuthenticated: boolean): Promise<void> {
  const response = await page.evaluate(async (url) => {
    const res = await fetch(`${url}/api/auth/me`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
      },
    });
    const text = await res.text();
    return { status: res.status, text };
  }, baseUrl);

  if (expectedAuthenticated) {
    assertCheck(response.status === 200, "/api/auth/me authenticated in browser context", `status=${response.status}`);
    assertCheck(
      response.text.includes("owner-test@eliyai.com") ||
        response.text.includes('"authenticated":true') ||
        response.text.includes('"user"'),
      "/api/auth/me payload indicates authenticated"
    );
  } else {
    assertCheck(
      response.status === 401 ||
        response.status === 403 ||
        response.text.includes('"authenticated":false') ||
        response.text.includes("UNAUTHORIZED"),
      "/api/auth/me unauthenticated after logout",
      `status=${response.status}`
    );
  }
}

async function typeAndSendMessage(page: Page, message: string): Promise<void> {
  const inputSelectors = [
    'textarea',
    '[contenteditable="true"]',
    'input[placeholder*="消息"]',
    'input[placeholder*="输入"]',
    'textarea[placeholder*="消息"]',
    'textarea[placeholder*="输入"]',
  ];

  let filled = false;

  for (const selector of inputSelectors) {
    const locator = page.locator(selector).last();
    if ((await locator.count().catch(() => 0)) && (await locator.isVisible().catch(() => false))) {
      if (selector.includes("contenteditable")) {
        await locator.click();
        await page.keyboard.insertText(message);
      } else {
        await locator.fill(message);
      }
      filled = true;
      record("PASS", "message input filled", `selector=${selector}`);
      break;
    }
  }

  assertCheck(filled, "message input visible and fillable");

  await clickRequiredTestId(page, "send-message-button", "send button clicked");
}

async function main(): Promise<void> {
  const cfg = config();

  console.log("===== CP-ELIY-BETA2-OWNER-TEST-BROWSER-REGRESSION-REMOTE-RUNNER-01 =====");
  console.log(`runner=os:${process.platform}-${process.arch}`);
  console.log(`base_url=${cfg.baseUrl}`);
  console.log(`owner_email_present=${cfg.email ? "YES" : "NO"}`);
  console.log(`invite_code_present_redacted=${cfg.inviteCode ? "YES" : "NO"}`);
  console.log(`headless=${cfg.headless ? "YES" : "NO"}`);

  assertCheck(Boolean(cfg.baseUrl), "config base URL present");
  assertCheck(Boolean(cfg.email), "config owner email present");
  assertCheck(Boolean(cfg.inviteCode), "config invite code present redacted");

  fs.mkdirSync(artifactDir, { recursive: true });

  const browser: Browser = await chromium.launch({
    headless: cfg.headless,
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: false,
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleEntries.push({ type, text });
  });

  page.on("pageerror", (error) => {
    consoleEntries.push({ type: "pageerror", text: error.message });
  });

  try {
    const response = await page.goto(cfg.baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    assertCheck(Boolean(response), "page navigation has response");
    assertCheck(response?.status() === 200, "page returns 200", `status=${response?.status()}`);
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);

    const bodyText = await getBodyText(page);
    assertCheck(bodyText.trim().length > 20, "page is not blank", `body_chars=${bodyText.length}`);
    assertCheck(
      !/Cannot GET|Internal Server Error|502 Bad Gateway|504 Gateway Timeout/i.test(bodyText),
      "page has no blocking server error marker"
    );

    const blockingConsoleErrors = consoleEntries.filter((entry) => {
      if (!["error", "pageerror"].includes(entry.type)) return false;
      return !/favicon|ResizeObserver loop|Failed to load resource.*(401|404)|401 \(Unauthorized\)|Unauthorized/i.test(entry.text);
    });

    assertCheck(blockingConsoleErrors.length === 0, "no blocking console error before login", `count=${blockingConsoleErrors.length}`);

    const loginHint = await waitForAnyText(page, ["Owner", "invite", "邀请码", "登录", "Login", "email", "Email"], 12000);
    assertCheck(Boolean(loginHint), "login page visible", `matched=${loginHint || "NONE"}`);

    await fillFirstVisible(
      page,
      [
        'input[type="email"]',
        'input[name*="email" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="邮箱"]',
        'input[placeholder*="账号"]',
      ],
      cfg.email,
      "email input filled"
    );

    await fillFirstVisible(
      page,
      [
        'input[name*="invite" i]',
        'input[name*="code" i]',
        'input[placeholder*="invite" i]',
        'input[placeholder*="code" i]',
        'input[placeholder*="邀请码"]',
        'input[placeholder*="代码"]',
        'input[type="password"]',
        'input:not([type])',
      ],
      cfg.inviteCode,
      "invite code input filled"
    );

    const loginClicked = await clickFirstVisible(
      page,
      [
        'button:has-text("登录")',
        'button:has-text("Login")',
        'button:has-text("进入")',
        'button[type="submit"]',
      ],
      "login submit clicked"
    );

    if (!loginClicked) {
      await page.keyboard.press("Enter");
      record("PASS", "login submitted by Enter fallback");
    }

    const mainHint = await waitForAnyText(
      page,
      ["连接", "Connected", "Skill", "backend", "conversation", "Conversation", "最近", "话题", "消息", "发送"],
      30000
    );

    assertCheck(Boolean(mainHint), "main UI visible after login", `matched=${mainHint || "NONE"}`);
    await checkAuthMe(page, cfg.baseUrl, true);

    const mainText = await getBodyText(page);
    assertCheck(/Eliy Beta 2\.0/i.test(mainText), "top product shell visible");
    assertCheck(/Owner Test/i.test(mainText), "owner test shell visible");
    assertCheck(/连接|Connected|online|在线/i.test(mainText), "top connection status visible");
    assertCheck(/Skill|backend|generic|fallback|Beta|状态|模式/i.test(mainText), "skill/backend status chip visible");
    assertCheck(/conversation|Conversation|最近|话题|新建|New/i.test(mainText), "conversation list area visible");
    assertCheck(
      (await page.locator('textarea, [contenteditable="true"], input[placeholder*="消息"], input[placeholder*="输入"]').count()) > 0,
      "message input visible"
    );
    record("WARN", "send button precheck skipped", "post-input submit path verifies button or Enter fallback");

    await clickRequiredTestId(page, "workspace-debug-button", "debug workspace clicked");
    assertCheck(await textVisible(page, "owner_test", 15000), "debug workspace shows runtime environment");
    assertCheck(await textVisible(page, "generic_fallback", 15000), "debug workspace shows generic fallback mode");
    assertCheck(await textVisible(page, "p0_foundation_agent_harness_shell", 15000), "debug workspace shows shell stage");

    await clickRequiredTestId(page, "workspace-skills-button", "skills workspace clicked");
    assertCheck(await textVisible(page, "Default", 15000), "skills workspace shows default skill");
    assertCheck(await textVisible(page, "S’FOCUS", 15000) || await textVisible(page, "S'FOCUS", 15000), "skills workspace shows S’FOCUS skill");
    assertCheck(await textVisible(page, "SKILL.md loaded", 15000), "skills workspace shows loaded skill metadata");

    await clickRequiredTestId(page, "workspace-o-order-button", "o-order workspace clicked");
    assertCheck(await textVisible(page, "Schema Ready", 15000), "o-order workspace shows schema ready state");
    assertCheck(await textVisible(page, "目标", 15000), "o-order workspace shows goal field");
    assertCheck(await textVisible(page, "证据", 15000), "o-order workspace shows evidence field");
    await clickRequiredTestId(page, "workspace-conversations-button", "conversations workspace clicked");

    // ownerTestNewConversationBeforePrompt: isolate browser regression from prior Owner Test conversations.
    const ownerTestNewConversationBeforePrompt = page.getByTestId("new-conversation-button").first();
    await ownerTestNewConversationBeforePrompt.waitFor({ state: "visible", timeout: 15000 });
    await ownerTestNewConversationBeforePrompt.click();
    record("PASS", "new conversation button clicked before browser prompt", "data-testid=new-conversation-button");
    await page.waitForTimeout(1000);

    const prompt = "你好，请确认当前是否是 Eliy Beta 2.0 Owner Test，并用一句话说明你现在能帮我做什么。";
    await typeAndSendMessage(page, prompt);

    await textVisible(page, prompt, 15000);
    assertCheck(await textVisible(page, "Eliy Beta 2.0 Owner Test", 30000), "assistant reply visible");

    const latestAssistantLocator = await getRequiredVisibleTestId(page, "latest-assistant-message", "latest assistant reply visible");
    let latestAssistantText = await latestAssistantLocator.innerText().catch(() => "");
    const requiredTerms = [
      "Eliy Beta 2.0 Owner Test",
      "登录",
      "会话保存",
      "消息历史",
      "trace",
      "基础对话链路",
      "经营管理能力仍处于后续工程化阶段",
    ];
    assertCheck(Boolean(latestAssistantText.trim().length > 0), "latest assistant reply non-empty");
    const latestAssistantDeadline = Date.now() + 45000;

    while (Date.now() < latestAssistantDeadline) {
      latestAssistantText = await latestAssistantLocator.innerText().catch(() => "");
      const missingRequiredTerms = requiredTerms.filter((term) => !latestAssistantText.includes(term));
      if (missingRequiredTerms.length === 0) break;
      await page.waitForTimeout(500);
    }

    assertCheck(latestAssistantText.includes("Eliy Beta 2.0 Owner Test"), "latest assistant reply contains Owner Test phrase");

    for (const term of requiredTerms) {
      assertCheck(latestAssistantText.includes(term), `latest assistant reply contains required term: ${term}`);
    }

    for (const term of ["请提供更多业务细节", "请提供具体数据", "请说明目前的核心阻碍"]) {
      if (latestAssistantText.includes(term)) {
        record("FAIL", `latest assistant reply contains forbidden term: ${term}`);
        throw new Error(`latest assistant reply contains forbidden term: ${term}`);
      } else {
        record("PASS", `latest assistant reply excludes forbidden term: ${term}`);
      }
    }

    // ownerTestWaitForTraceChipAfterDelayedAttach: wait for frontend delayed trace-chip reattach.
    await page.waitForSelector('[data-testid="trace-chip"]', { state: "visible", timeout: 8000 }).catch(() => undefined);

    const traceLocator = await getRequiredVisibleTestId(page, "trace-chip", "trace chip visible");
    const traceText = await traceLocator.innerText().catch(() => "");
    assertCheck(Boolean(traceText.trim().length > 0), "trace id non-empty", `trace=${traceText || "MISSING"}`);

    const box = await traceLocator.boundingBox().catch(() => null);
    assertCheck(Boolean(box && box.width > 0 && box.height > 0), "trace chip has visible layout box");
    assertCheck(Boolean(box && box.width < 900 && box.height < 160), "trace chip does not obviously break layout");

    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);

    await checkAuthMe(page, cfg.baseUrl, true);

    assertCheck(await textVisible(page, prompt, 20000), "refresh keeps user message visible");
    assertCheck(await textVisible(page, "Eliy Beta 2.0 Owner Test", 20000), "refresh keeps assistant reply visible");

    const refreshedText = await getBodyText(page);
    assertCheck(/conversation|Conversation|最近|话题|新建|New/i.test(refreshedText), "refresh keeps conversation list visible");

    const firstConversationMarker = "Eliy Beta 2.0 Owner Test";
    const firstConversationId = await getRequiredConversationId(
      page,
      "#historyList .history-item.active",
      "capture first conversation id"
    );
    const secondMarker = `BROWSER_ISOLATION_${Date.now()}`;

    await clickRequiredTestId(page, "new-conversation-button", "new conversation clicked");
    await page.waitForTimeout(1000);
    await typeAndSendMessage(page, secondMarker);
    assertCheck(await textVisible(page, secondMarker, 20000), "second conversation message visible");

    const secondConversationText = await getBodyText(page);
    assertCheck(secondConversationText.includes(secondMarker), "second conversation contains its own marker");
    assertCheck(
      !secondConversationText.includes(prompt) || !secondConversationText.includes(firstConversationMarker),
      "second conversation does not show full first conversation history"
    );

    await clickConversationById(page, firstConversationId, "return to first conversation attempt");
    await page.waitForTimeout(1000);
    const firstAgainText = await getBodyText(page);
    assertCheck(firstAgainText.includes(firstConversationMarker), "first conversation history retained after returning");

    const logoutResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/logout") && response.request().method() === "POST",
      { timeout: 10000 }
    );
    await clickRequiredTestId(page, "logout-button", "logout clicked");
    const logoutResponse = await logoutResponsePromise.catch(() => null);
    assertCheck(Boolean(logoutResponse), "/api/auth/logout response seen");
    assertCheck(logoutResponse?.status() === 200, "/api/auth/logout returns 200", `status=${logoutResponse?.status()}`);
    const loginBackHint = await waitForAnyText(page, ["登录", "Login", "invite", "邀请码", "email", "Email"], 20000);
    assertCheck(Boolean(loginBackHint), "logout returns to login state", `matched=${loginBackHint || "NONE"}`);
    // ownerTestWaitForAuthMeUnauthenticatedAfterLogout: allow logout cookie/session invalidation to settle.
    await page.waitForFunction(
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
          },
        });
        if (response.status === 401) return true;
        const payload = await response.json().catch(() => null) as { authenticated?: boolean } | null;
        return Boolean(payload && payload.authenticated === false);
      },
      cfg.baseUrl,
      { timeout: 10000 }
    ).catch(() => undefined);

    await checkAuthMe(page, cfg.baseUrl, false);

    const beta1Response = await page.request.get("https://hk-beta.eliyai.com", {
      failOnStatusCode: false,
    });

    assertCheck(beta1Response.status() === 401, "Beta 1.0 remains protected", `status=${beta1Response.status()}`);

    const finalBlockingConsoleErrors = consoleEntries.filter((entry) => {
      if (!["error", "pageerror"].includes(entry.type)) return false;
      return !/favicon|ResizeObserver loop|Failed to load resource.*(401|404)|401 \(Unauthorized\)|Unauthorized/i.test(entry.text);
    });

    assertCheck(finalBlockingConsoleErrors.length === 0, "no blocking console error during browser regression", `count=${finalBlockingConsoleErrors.length}`);

    const serializedResults = JSON.stringify(results) + JSON.stringify(consoleEntries);
    assertCheck(!serializedResults.includes(cfg.inviteCode), "test output does not leak invite code");

    console.log("===== concise browser summary =====");
    console.log(`artifact_dir=${artifactDir}`);
    console.log("secret_redaction=PASS");
    console.log("browser_engine_available=YES");
    console.log("CONCLUSION: Owner Test browser regression passed");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await saveFailureArtifacts(page, "owner-test-browser-regression-failure");
    console.error("CONCLUSION: Owner Test browser regression failed");
    console.error(`failure=${sanitize(message)}`);
    console.error("invite_code_redacted=YES");
    throw error;
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch(() => {
  process.exit(1);
});
