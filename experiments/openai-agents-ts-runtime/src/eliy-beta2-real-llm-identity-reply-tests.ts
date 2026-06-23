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

  const pureTestReply = router.buildBeta2IdentityReply("ping", { activeSkill: "default" });
  assert(pureTestReply.includes("系统接续测试信号"), "pure test signal should get concise confirmation");
  assert(!pureTestReply.includes("老板"), "pure test signal should not expand into business diagnosis");
  record(results, "IDENTITY-03", "Pure test signals receive concise link confirmation.");

  const mixedReply = router.buildBeta2IdentityReply(
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    { activeSkill: "default" }
  );
  assert(mixedReply.includes("我是 Eliy"), "mixed test/business reply should still identify Eliy");
  assert(mixedReply.includes("老板"), "mixed test/business reply should keep business context");
  assert(mixedReply.includes("经营"), "mixed test/business reply should keep经营语境");
  assert(mixedReply.includes("判断"), "mixed test/business reply should preserve judgment framing");
  record(results, "IDENTITY-04", "Mixed test/business inputs should answer the business question instead of only confirming link status.");

  const mixedIntent = router.classifyBeta2IdentityPrompt(
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？"
  );

  const normalizedMissingIdentity = router.ensureBeta2IdentityBusinessSignals(
    "这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    mixedIntent
  );
  assert(normalizedMissingIdentity.includes("我是 Eliy"), "mixed input missing identity should be prefixed");
  assert(normalizedMissingIdentity.includes("经营判断"), "mixed input missing identity should keep经营判断 framing");
  record(results, "IDENTITY-05", "Mixed test/business reply missing Eliy should be prefixed with identity framing.");

  const normalizedMissingBusiness = router.ensureBeta2IdentityBusinessSignals(
    "我是 Eliy。先看唯一目标是否收敛。",
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    mixedIntent
  );
  assert(normalizedMissingBusiness.includes("这个问题我会先当成老板的经营判断问题处理。"), "mixed input missing经营 should be prefixed");
  record(results, "IDENTITY-06", "Mixed test/business reply missing经营 should be prefixed with business framing.");

  const alreadyQualified = router.ensureBeta2IdentityBusinessSignals(
    "我是 Eliy。这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    mixedIntent
  );
  assert.equal(
    alreadyQualified,
    "我是 Eliy。这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    "already qualified mixed reply should not be prefixed again"
  );
  record(results, "IDENTITY-07", "Already qualified mixed reply is left unchanged.");

  const pureSignalNormalized = router.ensureBeta2IdentityBusinessSignals(
    "收到。这是系统接续测试信号。",
    "ping",
    "pure_test_signal"
  );
  assert.equal(pureSignalNormalized, "收到。这是系统接续测试信号。", "pure test signal should not be expanded into business diagnosis");
  record(results, "IDENTITY-08", "Pure test signals are not normalized into business diagnosis.");

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
  record(results, "IDENTITY-09", "Fake adapter returns deterministic identity reply for offline tests.");

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
