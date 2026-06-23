import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDirs, reportsDir } from "./storage.js";

type TestResult = {
  id: string;
  result: "Passed" | "Failed";
  evidence: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadAccountStore(): Promise<any> {
  // @ts-expect-error - runtime side-effect import of a browser/server-side JS module.
  return await import("../../../eliy-kernel/runtime/account-store.js");
}

async function getFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate port."));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function fetchJson(url: string, options: RequestInit = {}): Promise<{ res: Response; payload: any }> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await res.json().catch(() => ({} as any));
  return { res, payload };
}

async function waitForServer(baseUrl: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, { credentials: "same-origin" });
      if (res.status === 200 || res.status === 401) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not become ready in time.");
}

async function spawnServer(tempDir: string) {
  const port = await getFreePort();
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const serverPath = join(repoRoot, "eliy-kernel", "runtime", "server.js");
  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      ELIY_BETA2_MODEL_MODE: "generic_fallback",
      ELIY_BETA2_REAL_LLM_ENABLED: "false",
      ELIY_RUNTIME_DATA_DIR: join(tempDir, "runtime"),
      ELIY_ACCOUNT_STORAGE_DIR: tempDir,
      ELIY_ALLOWLIST: "beta-user@example.com,second-beta@example.com",
      ELIY_INVITE_CODES: "BETA-INVITE",
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "NOT_SET"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl);

  return {
    baseUrl,
    child,
    stdout,
    stderr,
    async stop() {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      await new Promise((resolve) => child.once("exit", resolve));
    }
  };
}

function cookieHeaderFromLogin(setCookie: string | null): string {
  assert(setCookie, "Login response must include a cookie.");
  return setCookie.split(";")[0];
}

async function login(baseUrl: string, email_or_login_id: string, invite_code: string) {
  const { res, payload } = await fetchJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email_or_login_id, invite_code })
  });
  return {
    res,
    payload,
    cookie: cookieHeaderFromLogin(res.headers.get("set-cookie"))
  };
}

function readStoreFile(storeDir: string) {
  const storePath = join(storeDir, "account-store.json");
  return readFile(storePath, "utf8").then((text) => JSON.parse(text));
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const tempDir = await mkdtemp(join(tmpdir(), "eliy-account-store-"));
  const accountStoreModule = await loadAccountStore();
  const store = accountStoreModule.createAccountStore({
    baseDir: tempDir,
    allowlist: ["beta-user@example.com", "second-beta@example.com"],
    inviteCodes: ["BETA-INVITE"],
    sessionTtlMs: 60 * 60 * 1000,
    runtimeLabel: "account-storage-test"
  });

  const loginResult = store.login({
    email_or_login_id: "beta-user@example.com",
    invite_code: "BETA-INVITE",
    display_name: "Beta User",
    device_info: { user_agent: "test", ip: "127.0.0.1" }
  });
  assert(loginResult.ok, "Store login must succeed for allowlisted user.");
  const derivedUserId = accountStoreModule.deriveUserIdFromLogin("beta-user@example.com");
  assert(loginResult.user.user_id === derivedUserId, "user_id must be stable and derived from login id.");
  const meAfterLogin = store.me({
    headers: { cookie: `ELIY_AUTH_SESSION_ID=${loginResult.session.auth_session_id}` }
  });
  assert(meAfterLogin.ok, "Store me() must succeed after login.");
  results.push({
    id: "AS-GT-01",
    result: "Passed",
    evidence: "Allowlist invite login produced stable user_id and active session."
  });

  const runTrace = store.recordRunTrace({
    run_id: "run_trace_test",
    trace_id: "trace_trace_test",
    conversation_id: "conv_trace_test",
    message_id: "msg_trace_test",
    user_id: loginResult.user.user_id,
    model_or_runtime: "test-runtime",
    eval_summary: { ok: true },
    error_summary: [{ code: "TRACE_ERROR", message: "trace summary persisted", retryable: false }]
  });
  const stateAfterTrace = store.loadState();
  assert(stateAfterTrace.runTraces.some((item: any) => item.run_id === runTrace.run_id), "RunTraceMeta must persist.");
  assert(stateAfterTrace.runTraces.some((item: any) => item.error_summary), "RunTraceMeta must persist error_summary.");
  results.push({
    id: "AS-GT-02",
    result: "Passed",
    evidence: "RunTraceMeta persisted eval and error summaries in file-backed storage."
  });

  store.expireSession(loginResult.session.auth_session_id);
  const meExpired = store.me({
    headers: { cookie: `ELIY_AUTH_SESSION_ID=${loginResult.session.auth_session_id}` }
  });
  assert(!meExpired.ok, "Expired session must fail me().");
  assert(meExpired.error.errors[0].code === "AUTH_SESSION_EXPIRED", "Expired session must return AUTH_SESSION_EXPIRED.");
  results.push({
    id: "AS-GT-03",
    result: "Passed",
    evidence: "Expired session is rejected by store-level auth check."
  });

  const server = await spawnServer(tempDir);
  try {
    const loginOne = await login(server.baseUrl, "beta-user@example.com", "BETA-INVITE");
    const cookieOne = loginOne.cookie;
    assert(loginOne.payload.user.user_id === derivedUserId, "Server login must return stable user_id.");

    const meOne = await fetchJson(`${server.baseUrl}/api/auth/me`, {
      method: "GET",
      headers: { Cookie: cookieOne }
    });
    assert(meOne.res.status === 200, "Authenticated /api/auth/me must succeed.");
    assert(meOne.payload.user.user_id === derivedUserId, "/api/auth/me must return current user.");

    const createConversation = await fetchJson(`${server.baseUrl}/api/conversations`, {
      method: "POST",
      headers: { Cookie: cookieOne },
      body: JSON.stringify({ title: "Beta Conversation" })
    });
    assert(createConversation.res.status === 201, "Conversation creation must succeed.");
    const conversationId = createConversation.payload.conversation.conversation_id as string;
    assert(conversationId, "Conversation id must be returned.");

    const listResponse = await fetchJson(`${server.baseUrl}/api/conversations`, {
      method: "GET",
      headers: { Cookie: cookieOne }
    });
    assert(listResponse.res.status === 200, "Conversation list must succeed.");
    assert(Array.isArray(listResponse.payload.conversations) && listResponse.payload.conversations.some((item: any) => item.conversation_id === conversationId), "Conversation list must include newly created conversation.");

    const chatResponse = await fetchJson(`${server.baseUrl}/api/chat`, {
      method: "POST",
      headers: { Cookie: cookieOne },
      body: JSON.stringify({
        text: "请帮我确认账号 / 存储最小规格。",
        conversationId,
        messageId: "msg_user_1",
        runId: "run_1",
        traceId: "trace_1",
        activeSkill: "default",
        contextScope: "existing_conversation"
      })
    });
    assert(chatResponse.res.status === 200, "/api/chat must succeed for authenticated user.");
    assert(chatResponse.payload.conversation_id === conversationId, "/api/chat must bind to the current conversation.");
    assert(chatResponse.payload.trace_id === "trace_1", "/api/chat must preserve trace_id.");
    assert(typeof chatResponse.payload.message_id === "string" && chatResponse.payload.message_id.length > 0, "/api/chat must return assistant message_id.");

    const messages = await fetchJson(`${server.baseUrl}/api/conversations/${conversationId}/messages`, {
      method: "GET",
      headers: { Cookie: cookieOne }
    });
    assert(messages.res.status === 200, "Message history must be readable.");
    assert(messages.payload.messages.length >= 2, "Conversation must persist user and assistant messages.");
    assert(messages.payload.messages.some((item: any) => item.role === "assistant" && item.run_id === "run_1" && item.trace_id === "trace_1"), "Assistant message must persist run_id and trace_id.");

    const storeAfterChat = await readStoreFile(tempDir);
    assert(Array.isArray(storeAfterChat.messages) && storeAfterChat.messages.some((item: any) => item.conversation_id === conversationId), "File-backed message store must persist chat turn.");
    assert(Array.isArray(storeAfterChat.runTraces) && storeAfterChat.runTraces.some((item: any) => item.run_id === "run_1"), "File-backed run trace store must persist trace meta.");
    results.push({
      id: "AS-GT-04",
      result: "Passed",
      evidence: "Server chat persisted user/assistant messages and run/trace metadata for the authenticated conversation."
    });

    const loginTwo = await login(server.baseUrl, "second-beta@example.com", "BETA-INVITE");
    const cookieTwo = loginTwo.cookie;
    const forbiddenRead = await fetchJson(`${server.baseUrl}/api/conversations/${conversationId}/messages`, {
      method: "GET",
      headers: { Cookie: cookieTwo }
    });
    assert(forbiddenRead.res.status === 404, "Second user must not read first user's conversation.");

    const forbiddenChat = await fetchJson(`${server.baseUrl}/api/chat`, {
      method: "POST",
      headers: { Cookie: cookieTwo },
      body: JSON.stringify({
        text: "越权读取测试",
        conversationId,
        messageId: "msg_user_2",
        runId: "run_2",
        traceId: "trace_2",
        activeSkill: "default",
        contextScope: "existing_conversation"
      })
    });
    assert(forbiddenChat.res.status === 404, "Second user must not write to first user's conversation.");
    results.push({
      id: "AS-GT-05",
      result: "Passed",
      evidence: "User isolation prevented cross-user conversation read/write."
    });

    const logout = await fetchJson(`${server.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookieOne }
    });
    assert(logout.res.status === 200, "Logout must succeed.");
    const meAfterLogout = await fetchJson(`${server.baseUrl}/api/auth/me`, {
      method: "GET",
      headers: { Cookie: cookieOne }
    });
    assert(meAfterLogout.res.status === 401, "Logged-out session must be rejected.");
    results.push({
      id: "AS-GT-06",
      result: "Passed",
      evidence: "Logout revoked the session and /api/auth/me returned 401 afterwards."
    });
  } finally {
    await server.stop();
  }

  await rm(tempDir, { recursive: true, force: true });
  return results;
}

function renderReport(results: TestResult[]): string {
  const rows = results.map((result) => `| ${result.id} | ${result.result} | ${result.evidence} |`).join("\n");
  return `# CP-ELIY-BETA2-ACCOUNT-STORAGE-MINIMUM-IMPLEMENTATION-01 Final Report

## 1. Baseline

- Branch: spike/eliy-beta2-gate2-ui-adapter-minimum
- Baseline HEAD: 53cf5fe
- Final HEAD: Pending commit
- Workspace: clean before implementation, modified during implementation

## 2. Modification Summary

- Added a file-backed account/session/conversation/message/run-trace store.
- Added auth endpoints for login, me, and logout.
- Added conversation endpoints for list, create, read, rename, archive, and delete.
- Bound /api/chat to authenticated user, conversation, message, run, and trace identifiers.
- Updated webchat login and app bootstrap to use server-side auth and conversation history.

## 3. Modified Files

- eliy-kernel/runtime/account-store.js
- eliy-kernel/runtime/server.js
- frontend/webchat/index.html
- frontend/webchat/login.html
- frontend/webchat/app.js
- experiments/openai-agents-ts-runtime/package.json
- experiments/openai-agents-ts-runtime/src/eliy-beta2-account-storage-minimum-tests.ts
- experiments/openai-agents-ts-runtime/reports/hac-eliy-beta2-account-storage-minimum-final-report.md

## 4. Account / Session / Storage Implementation

- User: allowlist/invite activation, stable user_id derived from login id, active-only access.
- AuthSession: HttpOnly cookie, server-side session, revoke and expiry supported.
- Conversation: server-backed list/read/write with soft delete and archive support.
- Message: user and assistant messages persisted separately with run_id / trace_id.
- RunTraceMeta: run / trace metadata persisted alongside error summaries.

## 5. API Implementation

- /api/auth/login
- /api/auth/me
- /api/auth/logout
- /api/conversations
- /api/conversations/:conversation_id
- /api/conversations/:conversation_id/messages
- /api/chat now binds authenticated user and conversation state before reply generation.

## 6. Frontend Adaptation

- login.html now calls /api/auth/login and restores existing sessions via /api/auth/me.
- index.html now guards on server session rather than localStorage token.
- app.js now loads conversation lists and message history from the server.
- localStorage remains only as a fallback cache and UI preference store.

## 7. User Isolation

- All conversation and message reads/writes are filtered by user_id.
- Cross-user access is rejected.
- Session expiration and logout both invalidate access.

## 8. Tests

${rows}

## 9. Execution Results

- Server-side allowlist login: Passed
- Session expiry rejection: Passed
- Conversation list/read/write: Passed
- /api/chat persistence: Passed
- Cross-user isolation: Passed
- Logout invalidation: Passed
- RunTraceMeta persistence: Passed

## 10. Known Limits

- No full enterprise account system.
- No RBAC / admin console.
- No formal cloud database; this is a file-backed store.
- No billing / subscription.
- No full artifact platform rewrite.

## 11. Recommended Next Spike

Recommended next task:
CP-ELIY-BETA2-ACCOUNT-STORAGE-CLOSE-THE-LOOP-01

Suggested focus:
- Add conversation rename/archive/delete UI affordances.
- Add a minimal debug trace viewer.
- Decide whether to preserve or retire the localStorage fallback cache after the closed beta gate stabilizes.

## 12. Stop Point

- 是否修改文件：Yes
- 是否创建分支：Yes
- 是否 commit：No
- 是否 push：No
- 是否 merge：No
- 是否 deploy：No
- 是否调用模型 API：No
- 是否引入完整云数据库：No
- 是否引入完整企业账号系统：No
- 是否改 HAC-Agent Gate 2 核心机制：No
- 是否改 S’FOCUS Skill：No
- 是否改 O’PDCA：No
- 当前 branch：spike/eliy-beta2-gate2-ui-adapter-minimum
- 当前 HEAD：53cf5fe
- 工作区状态：modified during implementation
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = await runTests();
  const report = renderReport(results);
  const reportPath = join(reportsDir, "hac-eliy-beta2-account-storage-minimum-final-report.md");
  await writeFile(reportPath, `${report}\n`, "utf8");
  for (const result of results) {
    console.log(`${result.id}: ${result.result}`);
  }
  console.log(`Report written to ${reportPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
