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
  assert(reply.includes("作为 Eliy") || reply.includes("Eliy"), "identity reply should identify Eliy through role framing");
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
  assert(mixedReply.includes("作为 Eliy") || mixedReply.includes("Eliy"), "mixed test/business reply should still identify Eliy");
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
  assert(normalizedMissingIdentity.includes("作为 Eliy") || normalizedMissingIdentity.includes("Eliy"), "mixed input missing identity should keep Eliy identity signal");
  assert(normalizedMissingIdentity.includes("经营判断"), "mixed input missing identity should keep经营判断 framing");
  record(results, "IDENTITY-05", "Mixed test/business reply missing Eliy should be prefixed with identity framing.");

  const normalizedMissingBusiness = router.ensureBeta2IdentityBusinessSignals(
    "作为 Eliy。先看唯一目标是否收敛。",
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    mixedIntent
  );
  assert(normalizedMissingBusiness.includes("这个问题我会先当成老板的经营判断问题处理。"), "mixed input missing经营 should be prefixed");
  record(results, "IDENTITY-06", "Mixed test/business reply missing经营 should be prefixed with business framing.");

  const alreadyQualified = router.ensureBeta2IdentityBusinessSignals(
    "作为 Eliy。这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    mixedIntent
  );
  assert.equal(
    alreadyQualified,
    "作为 Eliy。这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    "already qualified mixed reply should not be prefixed again"
  );
  record(results, "IDENTITY-07", "Already qualified mixed reply is left unchanged.");

  const pureSignalNormalized = router.ensureBeta2IdentityBusinessSignals(
    "收到。这是系统接续测试信号。",
    "ping",
    "pure_test_signal"
  );
  assert(pureSignalNormalized.includes("我是 Eliy") || pureSignalNormalized.includes("我是Eliy"), "pure owner-facing real_llm signal should still include exact Eliy self phrase");
  assert(!pureSignalNormalized.includes("老板"), "pure test signal should not be expanded into business diagnosis");
  assert(!/generic_fallback|generic fallback|provider config|invite code|api key|API key|ELIY_BETA2_LLM_API_KEY|DEEPSEEK_API_KEY/.test(pureSignalNormalized), "pure identity guard should not leak fallback or internal config");
  record(results, "IDENTITY-08", "Pure test signals get identity guard without being expanded into business diagnosis.");

  const beta2NameOnlyNormalized = router.ensureBeta2IdentityBusinessSignals(
    "确认，当前是 Eliy Beta 2.0 Owner Test。",
    "你好，请确认当前是否是 Eliy Beta 2.0 Owner Test，并用一句话说明你现在能帮我做什么。",
    router.classifyBeta2IdentityPrompt("你好，请确认当前是否是 Eliy Beta 2.0 Owner Test，并用一句话说明你现在能帮我做什么。")
  );
  assert(beta2NameOnlyNormalized.includes("作为 Eliy") || beta2NameOnlyNormalized.includes("Eliy"), "Eliy name-only reply should be normalized into Eliy identity signal");

  const beta2VersionOnlyNormalized = router.ensureBeta2IdentityBusinessSignals(
    "嗨，Eliy Beta 2.0 的这一版可以先帮你做基础对话验证。",
    "现在这个版本能做什么？",
    router.classifyBeta2IdentityPrompt("现在这个版本能做什么？")
  );
  assert(beta2VersionOnlyNormalized.includes("作为 Eliy") || beta2VersionOnlyNormalized.includes("Eliy"), "Eliy version-only reply should be normalized into Eliy identity signal");

  const alreadySelfPhrasedNormalized = router.ensureBeta2IdentityBusinessSignals(
    "我是 Eliy，一个主体型商业智能体。",
    "你是谁？",
    router.classifyBeta2IdentityPrompt("你是谁？")
  );
  assert.equal(
    (alreadySelfPhrasedNormalized.match(/我是\s*Eliy/g) || []).length,
    1,
    "exact Eliy self phrase should not be duplicated"
  );
  record(results, "IDENTITY-09", "Name-only Eliy replies are normalized into a stable identity signal without duplicating qualified replies.");

  const ownerFacingPrompts = [
    "你好，请确认当前是否是 Eliy Beta 2.0 Owner Test，并用一句话说明你现在能帮我做什么。",
    "你是谁？",
    "现在这个版本能做什么？",
    "当前是不是完整的经营智能体？",
    "测试一下：如果我是一个补习班老板，老师时间不够，我下一步该先看什么？",
  ];
  for (const prompt of ownerFacingPrompts) {
    const normalized = router.ensureBeta2IdentityBusinessSignals(
      "可以。我会先判断当前问题，再给你一个下一步。",
      prompt,
      router.classifyBeta2IdentityPrompt(prompt)
    );
    assert(normalized.includes("Eliy") || normalized.includes("艾利"), `owner-facing real_llm reply should include Eliy identity signal for prompt: ${prompt}`);
    if (!/你是谁/.test(prompt)) {
      assert(!/^(?:我是\s*Eliy|我是Eliy)/.test(normalized), `owner-facing business reply should not repeatedly start with exact self-introduction for prompt: ${prompt}`);
    }
    assert(!normalized.includes("Mode: generic fallback baseline"), "real_llm identity guard should not add generic fallback baseline text");
    assert(!/invite code|api key|API key|provider config|ELIY_BETA2_LLM_API_KEY|DEEPSEEK_API_KEY/.test(normalized), "identity guard should not leak internal config or secrets");
  }

  const ownerBusinessNormalized = router.ensureBeta2IdentityBusinessSignals(
    "老师时间不够时，先判断是哪类工作正在挤占老师精力，再决定下一步。",
    "测试一下：如果我是一个补习班老板，老师时间不够，我下一步该先看什么？",
    router.classifyBeta2IdentityPrompt("测试一下：如果我是一个补习班老板，老师时间不够，我下一步该先看什么？")
  );
  assert(/老板|经营|判断/.test(ownerBusinessNormalized), "business owner-facing reply should retain business signal");
  record(results, "IDENTITY-10", "Owner-facing Beta2 real_llm replies keep Eliy identity signal without leaking fallback or internal config.");

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
  assert(fakeAdapter.reply.includes("我是 Eliy") || fakeAdapter.reply.includes("作为 Eliy"), "fake adapter should return identity reply");
  record(results, "IDENTITY-11", "Fake adapter returns deterministic identity reply for offline tests.");

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
