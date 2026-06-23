import { strict as assert } from "node:assert";

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
  // @ts-expect-error runtime import of JS helper
  const router = await import("../../../eliy-kernel/runtime/beta2-model-router.js");

  const instruction = router.buildBeta2IdentityInstruction({ activeSkill: "default" });
  assert(instruction.includes("面向老板与经营者的主体型商业智能体"), "instruction should define Eliy identity");
  assert(instruction.includes("保留用户判断权"), "instruction should preserve owner judgment");
  assert(!instruction.includes("generic_fallback"), "instruction should not leak fallback mode text");
  record(results, "IDENTITY-01", "Identity instruction states Eliy's business role and judgment boundary.");

  const reply = router.buildBeta2IdentityReply("老板团队执行很散，事情很多但没有结果，应该先看什么？", {
    activeSkill: "default"
  });
  assert(reply.includes("我是 Eliy"), "identity reply should identify Eliy");
  assert(reply.includes("老板"), "identity reply should mention老板");
  assert(reply.includes("经营"), "identity reply should mention经营语境");
  assert(reply.includes("判断"), "identity reply should preserve judgment framing");
  record(results, "IDENTITY-02", "Identity reply keeps the owner judgment and operating context.");

  const fakeAdapter = await router.runBeta2RealLlmAdapter({
    modelState: router.resolveBeta2ModelRouterState({
      env: {
        ELIY_BETA2_MODEL_MODE: "real_llm",
        ELIY_BETA2_LLM_PROVIDER: "fake",
        ELIY_BETA2_LLM_MODEL: "beta2-fake-model"
      }
    }),
    messages: [{ role: "user", content: "请简短说明你是谁。" }],
    userText: "请简短说明你是谁。",
    activeSkill: "default"
  });

  assert.equal(fakeAdapter.modelState.modelMode, "real_llm");
  assert.equal(fakeAdapter.modelState.realLlmEnabled, true);
  assert(fakeAdapter.reply.includes("我是 Eliy"), "fake adapter should return identity reply");
  record(results, "IDENTITY-03", "Fake adapter returns deterministic identity reply for offline tests.");

  console.log([
    "# CP-ELIY-BETA2-REAL-LLM-IDENTITY-REPLY-TESTS",
    "",
    `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
  ].join("\n"));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
