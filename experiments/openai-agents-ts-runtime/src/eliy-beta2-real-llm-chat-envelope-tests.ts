import { strict as assert } from "node:assert";
import { fetchJson, loginWithCookie, spawnShellServer } from "./beta2-shell-test-utils.js";

type TestResult = {
  id: string;
  result: "Passed";
  evidence: string;
};

function record(results: TestResult[], id: string, evidence: string): void {
  results.push({ id, result: "Passed", evidence });
}

async function run(): Promise<void> {
  const results: TestResult[] = [];
  const server = await spawnShellServer({
    ELIY_BETA2_MODEL_MODE: "real_llm",
    ELIY_BETA2_LLM_PROVIDER: "fake",
    ELIY_BETA2_LLM_MODEL: "beta2-fake-model"
  });
  const cookieJar: string[] = [];

  try {
    const cookie = await loginWithCookie(server.baseUrl, cookieJar);
    assert(cookie.includes("ELIY_AUTH_SESSION_ID="), "login cookie must be present");

    const createConversation = await fetchJson(`${server.baseUrl}/api/conversations`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ title: "Real LLM Chat Envelope Test" })
    });
    assert.equal(createConversation.res.status, 201);
    const conversationId = createConversation.payload.conversation.conversation_id as string;
    assert(conversationId, "conversation id must exist");

    const prompt = "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？";
    const chat = await fetchJson(`${server.baseUrl}/api/chat`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({
        text: prompt,
        conversationId,
        messageId: "msg_user_1",
        runId: "run_real_llm_1",
        traceId: "trace_real_llm_1",
        activeSkill: "default",
        contextScope: "existing_conversation"
      })
    });

    assert.equal(chat.res.status, 200);
    assert.equal(chat.payload.conversation_id, conversationId);
    assert.equal(chat.payload.trace_id, "trace_real_llm_1");
    assert.equal(chat.payload.runtime.modelMode, "real_llm");
    assert.equal(chat.payload.runtime.realLlmEnabled, true);
    assert.equal(chat.payload.runtime.agentHarnessEnabled, true);
    assert.equal(chat.payload.runtime.skillRegistryEnabled, true);
    assert.equal(chat.payload.skill.activeSkill, "default");
    assert.equal(chat.payload.skill.skillSource, "registry");
    assert.equal(chat.payload.skill.skillLoaded, true);
    assert.equal(chat.payload.workbench.oOrderWorkbench, "shell");
    assert.equal(chat.payload.workbench.oOrderRuntimeEnabled, false);

    const replyText = String(chat.payload.reply || "");
    assert(replyText.includes("我是 Eliy") || replyText.includes("我是Eliy"), "real LLM reply identifies Eliy");
    assert(replyText.includes("老板") || replyText.includes("经营"), "real LLM reply keeps business context");
    assert(!replyText.includes("Mode: generic fallback baseline"), "real LLM reply excludes generic fallback baseline text");
    assert(chat.payload.runtime.fallbackReason === null || chat.payload.runtime.fallbackReason === "redacted", "fallback reason remains redacted or null");
    record(results, "REAL-CHAT-01", "Real LLM chat envelope includes runtime / skill / workbench and identity voice.");

    console.log([
      "# CP-ELIY-BETA2-REAL-LLM-CHAT-ENVELOPE-TESTS",
      "",
      `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
    ].join("\n"));
  } finally {
    await server.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
