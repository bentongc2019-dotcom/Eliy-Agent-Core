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
  const server = await spawnShellServer();
  const cookieJar: string[] = [];

  try {
    const cookie = await loginWithCookie(server.baseUrl, cookieJar);
    assert(cookie.includes("ELIY_AUTH_SESSION_ID="), "login cookie must be present");

    const createConversation = await fetchJson(`${server.baseUrl}/api/conversations`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ title: "Chat Envelope Test" })
    });
    assert.equal(createConversation.res.status, 201);
    const conversationId = createConversation.payload.conversation.conversation_id as string;
    assert(conversationId, "conversation id must exist");

    const chat = await fetchJson(`${server.baseUrl}/api/chat`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({
        text: "请确认架构壳状态。",
        conversationId,
        messageId: "msg_user_1",
        runId: "run_1",
        traceId: "trace_1",
        activeSkill: "default",
        contextScope: "existing_conversation"
      })
    });

    assert.equal(chat.res.status, 200);
    assert.equal(chat.payload.conversation_id, conversationId);
    assert.equal(chat.payload.trace_id, "trace_1");
    assert(chat.payload.runtime, "runtime envelope must exist");
    assert(chat.payload.skill, "skill envelope must exist");
    assert(chat.payload.workbench, "workbench envelope must exist");
    assert.equal(chat.payload.runtime.environment, "owner_test");
    assert.equal(chat.payload.runtime.version, "beta2");
    assert.equal(chat.payload.runtime.stage, "p0_foundation_agent_harness_shell");
    assert.equal(chat.payload.runtime.modelMode, "generic_fallback");
    assert.equal(chat.payload.runtime.realLlmEnabled, false);
    assert.equal(chat.payload.runtime.agentHarnessEnabled, true);
    assert.equal(chat.payload.skill.activeSkill, "default");
    assert.equal(chat.payload.skill.skillSource, "registry");
    assert.equal(chat.payload.skill.skillLoaded, true);
    assert.equal(chat.payload.workbench.oOrderWorkbench, "shell");
    assert.equal(chat.payload.workbench.oOrderRuntimeEnabled, false);
    record(results, "CHAT-ENV-01", "Chat envelope includes runtime, skill, and workbench shell metadata.");

    console.log([
      "# CP-ELIY-BETA2-CHAT-ENVELOPE-TESTS",
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
