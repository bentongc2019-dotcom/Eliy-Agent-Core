import fs from "node:fs";
import { execSync } from "node:child_process";

type StepStatus = "PASS" | "FAIL" | "WARN";

type CheckResult = {
  status: StepStatus;
  step: string;
  detail?: string;
};

type HttpResult = {
  status: number;
  text: string;
  json: unknown;
  headers: Headers;
};

const results: CheckResult[] = [];

function record(status: StepStatus, step: string, detail?: string): void {
  results.push({ status, step, detail });
}

function assertCheck(condition: boolean, step: string, detail?: string): void {
  if (!condition) {
    record("FAIL", step, detail);
    throw new Error(`${step}${detail ? ` | ${detail}` : ""}`);
  }
  record("PASS", step, detail);
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const output: Record<string, string> = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    output[key] = value;
  }

  return output;
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  store(headers: Headers): void {
    const headerLike = headers as Headers & {
      getSetCookie?: () => string[];
    };

    const setCookies =
      typeof headerLike.getSetCookie === "function"
        ? headerLike.getSetCookie()
        : headers.get("set-cookie")
          ? [headers.get("set-cookie") as string]
          : [];

    for (const raw of setCookies) {
      const cookiePart = raw.split(";")[0] || "";
      const eq = cookiePart.indexOf("=");
      if (eq <= 0) continue;

      const name = cookiePart.slice(0, eq).trim();
      const value = cookiePart.slice(eq + 1).trim();

      if (!value) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  count(): number {
    return this.cookies.size;
  }
}

function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return output;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, output);
    }
  }

  return output;
}

function payloadText(json: unknown, fallbackText: string): string {
  if (json !== undefined && json !== null) {
    return JSON.stringify(json);
  }
  return fallbackText;
}

function findBestAssistantText(json: unknown, fallbackText: string): string {
  const strings = collectStrings(json);
  const preferred = strings
    .filter((item) => item.includes("Eliy Beta 2.0 Owner Test") || item.includes("经营管理能力仍处于后续工程化阶段"))
    .sort((a, b) => b.length - a.length)[0];

  return preferred || payloadText(json, fallbackText);
}

function findTraceId(value: unknown): string {
  let found = "";

  function walk(current: unknown, keyPath: string): void {
    if (found) return;

    if (typeof current === "string" || typeof current === "number") {
      if (/trace/i.test(keyPath) && String(current).trim()) {
        found = String(current).trim();
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${keyPath}.${index}`));
      return;
    }

    if (current && typeof current === "object") {
      for (const [key, item] of Object.entries(current as Record<string, unknown>)) {
        walk(item, keyPath ? `${keyPath}.${key}` : key);
      }
    }
  }

  walk(value, "");
  return found;
}

function extractConversationId(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const root = json as Record<string, unknown>;

  const direct =
    root.conversation_id ||
    root.conversationId ||
    root.id;

  if (typeof direct === "string") return direct;

  const conversation = root.conversation;
  if (conversation && typeof conversation === "object") {
    const conv = conversation as Record<string, unknown>;
    const nested =
      conv.conversation_id ||
      conv.conversationId ||
      conv.id;

    if (typeof nested === "string") return nested;
  }

  return "";
}

function loadConfig(): {
  baseUrl: string;
  email: string;
  inviteCode: string;
  envFileExists: boolean;
} {
  const envFilePath = "/etc/eliy-beta2/env";
  const fileEnv = parseEnvFile(envFilePath);
  const env = { ...fileEnv, ...process.env };

  const baseUrl = String(env.ELIY_OWNER_TEST_URL || "https://hk-beta2.eliyai.com").replace(/\/+$/, "");
  const email = String(env.ELIY_OWNER_TEST_EMAIL || "owner-test@eliyai.com");

  const rawInvite = String(
    env.ELIY_OWNER_TEST_INVITE_CODE ||
      env.ELIY_INVITE_CODE ||
      env.ELIY_INVITE_CODES ||
      ""
  );

  const inviteCode = rawInvite.split(/[,\s]+/).filter(Boolean)[0] || "";

  return {
    baseUrl,
    email,
    inviteCode,
    envFileExists: fs.existsSync(envFilePath),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();

  console.log("===== CP-ELIY-BETA2-OWNER-TEST-AUTOMATED-REGRESSION-01 / API REGRESSION =====");
  console.log(`base_url=${config.baseUrl}`);
  console.log(`env_file_exists=${config.envFileExists ? "YES" : "NO"}`);
  console.log(`owner_email_present=${config.email ? "YES" : "NO"}`);
  console.log(`invite_code_present_redacted=${config.inviteCode ? "YES" : "NO"}`);

  assertCheck(Boolean(config.baseUrl), "config base URL present");
  assertCheck(Boolean(config.email), "config owner email present");
  assertCheck(Boolean(config.inviteCode), "config invite code present redacted");

  const jar = new CookieJar();

  async function request(method: string, pathOrUrl: string, body?: unknown): Promise<HttpResult> {
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${config.baseUrl}${pathOrUrl}`;
    const headers: Record<string, string> = {
      Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
    };

    const cookieHeader = jar.header();
    if (cookieHeader) headers.Cookie = cookieHeader;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });

    jar.store(response.headers);

    const text = await response.text();
    let json: unknown = undefined;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }

    return {
      status: response.status,
      text,
      json,
      headers: response.headers,
    };
  }

  const html = await request("GET", "/");
  assertCheck(html.status === 200, "HTTPS root returns 200", `status=${html.status}`);
  assertCheck(html.text.trim().length > 200, "root HTML is not blank", `bytes=${html.text.length}`);
  assertCheck(
    !/Cannot GET|Internal Server Error|502 Bad Gateway|504 Gateway Timeout/i.test(html.text),
    "root HTML has no blocking server error marker"
  );

  const loginVariants = [
    { email: config.email, inviteCode: config.inviteCode },
    { email: config.email, invite_code: config.inviteCode },
    { email: config.email, code: config.inviteCode },
  ];

  const loginStatuses: number[] = [];
  let loggedIn = false;

  for (const body of loginVariants) {
    const login = await request("POST", "/api/auth/login", body);
    loginStatuses.push(login.status);

    if (login.status >= 200 && login.status < 300) {
      loggedIn = true;
      break;
    }
  }

  assertCheck(loggedIn, "Owner Test login succeeds", `statuses=${loginStatuses.join(",")}`);
  assertCheck(jar.count() > 0, "login cookie exists", `cookie_count=${jar.count()}`);

  const me = await request("GET", "/api/auth/me");
  const meText = payloadText(me.json, me.text);
  assertCheck(me.status === 200, "/api/auth/me returns authenticated", `status=${me.status}`);
  assertCheck(
    meText.includes(config.email) || meText.includes('"authenticated":true') || meText.includes('"user"'),
    "/api/auth/me payload indicates logged-in user"
  );

  const listBefore = await request("GET", "/api/conversations");
  assertCheck(listBefore.status === 200, "conversation list visible", `status=${listBefore.status}`);

  const runId = `owner-test-regression-${Date.now()}`;
  const createConversation = await request("POST", "/api/conversations", {
    title: `Owner Test Automated Regression ${runId}`,
  });

  assertCheck(
    createConversation.status === 200 || createConversation.status === 201,
    "conversation can be created",
    `status=${createConversation.status}`
  );

  const conversationId = extractConversationId(createConversation.json);
  assertCheck(Boolean(conversationId), "created conversation id exists", `conversation_id=${conversationId || "MISSING"}`);

  const requiredTerms = [
    "Eliy Beta 2.0 Owner Test",
    "登录",
    "会话保存",
    "消息历史",
    "trace",
    "基础对话链路",
    "经营管理能力仍处于后续工程化阶段",
  ];

  const forbiddenTerms = [
    "请提供更多业务细节",
    "请提供具体数据",
    "请说明目前的核心阻碍",
  ];

  const prompts = [
    "你好，请确认当前是否是 Eliy Beta 2.0 Owner Test，并用一句话说明你现在能帮我做什么。",
    "你是谁？",
    "现在这个版本能做什么？",
    "当前是不是完整的经营智能体？",
  ];

  for (const prompt of prompts) {
    const chat = await request("POST", "/api/chat", {
      conversationId,
      contextScope: "existing_conversation",
      text: prompt,
      userText: prompt,
      message: prompt,
      messages: [{ role: "user", content: prompt }],
    });

    assertCheck(chat.status === 200, `chat status 200 for prompt: ${prompt}`, `status=${chat.status}`);

    const assistantText = findBestAssistantText(chat.json, chat.text);

    for (const term of requiredTerms) {
      assertCheck(
        assistantText.includes(term),
        `bootstrap reply contains required term: ${term}`,
        `prompt=${prompt}`
      );
    }

    for (const term of forbiddenTerms) {
      assertCheck(
        !assistantText.includes(term),
        `bootstrap reply excludes forbidden term: ${term}`,
        `prompt=${prompt}`
      );
    }

    const traceId = findTraceId(chat.json);
    assertCheck(Boolean(traceId), "chat response trace id exists", `trace_id=${traceId || "MISSING"}`);
  }

  const conversationDetail = await request("GET", `/api/conversations/${encodeURIComponent(conversationId)}`);
  assertCheck(conversationDetail.status === 200, "conversation detail readable after chat", `status=${conversationDetail.status}`);

  const historyText = payloadText(conversationDetail.json, conversationDetail.text);
  assertCheck(historyText.includes(prompts[0]), "refresh-equivalent history keeps user message");
  assertCheck(historyText.includes("Eliy Beta 2.0 Owner Test"), "refresh-equivalent history keeps assistant reply");

  const listAfter = await request("GET", "/api/conversations");
  assertCheck(listAfter.status === 200, "conversation list visible after chat", `status=${listAfter.status}`);
  assertCheck(
    payloadText(listAfter.json, listAfter.text).includes(conversationId),
    "recent conversation appears in conversation list",
    `conversation_id=${conversationId}`
  );

  const createSecond = await request("POST", "/api/conversations", {
    title: `Owner Test Isolation ${runId}`,
  });

  assertCheck(
    createSecond.status === 200 || createSecond.status === 201,
    "second conversation can be created",
    `status=${createSecond.status}`
  );

  const secondConversationId = extractConversationId(createSecond.json);
  assertCheck(Boolean(secondConversationId), "second conversation id exists");

  const isolationMarker = `REGRESSION_ISOLATION_${Date.now()}`;
  const secondChat = await request("POST", "/api/chat", {
    conversationId: secondConversationId,
    contextScope: "existing_conversation",
    text: isolationMarker,
    userText: isolationMarker,
    message: isolationMarker,
    messages: [{ role: "user", content: isolationMarker }],
  });

  assertCheck(secondChat.status === 200, "second conversation message sends", `status=${secondChat.status}`);

  const firstAfterSecond = await request("GET", `/api/conversations/${encodeURIComponent(conversationId)}`);
  const secondDetail = await request("GET", `/api/conversations/${encodeURIComponent(secondConversationId)}`);

  assertCheck(firstAfterSecond.status === 200, "first conversation still readable after second message");
  assertCheck(secondDetail.status === 200, "second conversation readable after second message");

  const firstAfterSecondText = payloadText(firstAfterSecond.json, firstAfterSecond.text);
  const secondDetailText = payloadText(secondDetail.json, secondDetail.text);

  assertCheck(!firstAfterSecondText.includes(isolationMarker), "new conversation does not pollute old conversation");
  assertCheck(secondDetailText.includes(isolationMarker), "new conversation keeps its own message");

  const logout = await request("POST", "/api/auth/logout");
  assertCheck(logout.status >= 200 && logout.status < 300, "logout succeeds", `status=${logout.status}`);

  const meAfterLogout = await request("GET", "/api/auth/me");
  const meAfterLogoutText = payloadText(meAfterLogout.json, meAfterLogout.text);
  assertCheck(
    meAfterLogout.status === 401 ||
      meAfterLogout.status === 403 ||
      meAfterLogoutText.includes('"authenticated":false') ||
      meAfterLogoutText.includes("UNAUTHORIZED"),
    "after logout /api/auth/me is not authenticated",
    `status=${meAfterLogout.status}`
  );

  const beta1 = await fetch("https://hk-beta.eliyai.com", {
    method: "HEAD",
    redirect: "manual",
  });

  assertCheck(beta1.status === 401, "Beta 1.0 remains protected", `status=${beta1.status}`);

  const pm2Json = execSync("pm2 jlist", { encoding: "utf8" });
  const pm2List = JSON.parse(pm2Json) as Array<{
    name?: string;
    pm2_env?: { status?: string };
  }>;

  const beta2Proc = pm2List.find((item) => item.name === "eliy-beta2");
  const beta1Proc = pm2List.find((item) => item.name === "eliy-v032");

  assertCheck(beta2Proc?.pm2_env?.status === "online", "PM2 eliy-beta2 online");
  assertCheck(beta1Proc?.pm2_env?.status === "online", "PM2 eliy-v032 online");

  const listeners = execSync("ss -lntp 2>/dev/null | grep -E ':3001|:3102|:80|:443' || true", {
    encoding: "utf8",
  });

  assertCheck(listeners.includes("127.0.0.1:3102"), "Beta 2.0 upstream remains 127.0.0.1:3102");
  assertCheck(listeners.includes("127.0.0.1:3001"), "Beta 1.0 upstream remains 127.0.0.1:3001");

  const summaryText = JSON.stringify(results);
  assertCheck(!summaryText.includes(config.inviteCode), "test output does not leak invite code");

  console.log("===== concise summary =====");
  for (const result of results) {
    console.log(`${result.status} ${result.step}${result.detail ? ` | ${result.detail}` : ""}`);
  }

  console.log("secret_redaction=PASS");
  console.log("browser_engine_available=NO");
  console.log("browser_layout_regression=NOT_RUN_ENV_BLOCKED");
  console.log("CONCLUSION: Owner Test automated API regression passed");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("CONCLUSION: Owner Test automated API regression failed");
  console.error(`failure=${message}`);
  console.error("invite_code_redacted=YES");
  process.exit(1);
});
