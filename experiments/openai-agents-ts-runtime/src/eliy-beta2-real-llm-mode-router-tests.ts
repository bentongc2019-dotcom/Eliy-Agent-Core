import { strict as assert } from "node:assert";
import { resolveExpectedBeta2ModelMode } from "./beta2-shell-test-utils.js";

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

  const cases = [
    {
      id: "MODE-ROUTER-01",
      detail: "Global DEEPSEEK env does not auto-enable Beta2 real_llm.",
      env: {
        DEEPSEEK_API_KEY: "global-secret",
        DEEPSEEK_MODEL: "deepseek-v4-flash",
        DEEPSEEK_BASE_URL: "https://api.deepseek.com",
        DEEPSEEK_PROVIDER: "deepseek-openai-compatible"
      },
      expected: "generic_fallback"
    },
    {
      id: "MODE-ROUTER-02",
      detail: "Explicit Beta2 real_llm with fake provider is enabled.",
      env: {
        ELIY_BETA2_MODEL_MODE: "real_llm",
        ELIY_BETA2_LLM_PROVIDER: "fake",
        ELIY_BETA2_LLM_MODEL: "beta2-fake-model"
      },
      expected: "real_llm"
    },
    {
      id: "MODE-ROUTER-03",
      detail: "Explicit Beta2 real_llm with mock provider is enabled.",
      env: {
        ELIY_BETA2_REAL_LLM_ENABLED: "true",
        ELIY_BETA2_LLM_PROVIDER: "mock",
        ELIY_BETA2_LLM_MODEL: "beta2-mock-model"
      },
      expected: "real_llm"
    },
    {
      id: "MODE-ROUTER-04",
      detail: "Explicit Beta2 real_llm may reuse DeepSeek-compatible provider config.",
      env: {
        ELIY_BETA2_MODEL_MODE: "real_llm",
        DEEPSEEK_PROVIDER: "deepseek-openai-compatible",
        DEEPSEEK_MODEL: "deepseek-v4-flash",
        DEEPSEEK_BASE_URL: "https://api.deepseek.com",
        DEEPSEEK_API_KEY: "global-secret"
      },
      expected: "real_llm"
    },
    {
      id: "MODE-ROUTER-05",
      detail: "Explicit Beta2 real_llm without provider config falls back to generic_fallback.",
      env: {
        ELIY_BETA2_MODEL_MODE: "real_llm"
      },
      expected: "generic_fallback"
    },
    {
      id: "MODE-ROUTER-06",
      detail: "Explicit Beta2 real_llm enabled without provider config falls back to generic_fallback.",
      env: {
        ELIY_BETA2_REAL_LLM_ENABLED: "true"
      },
      expected: "generic_fallback"
    }
  ] as const;

  for (const testCase of cases) {
    const state = router.resolveBeta2ModelRouterState({ env: testCase.env as Record<string, string> });
    const expected = resolveExpectedBeta2ModelMode(testCase.env as Record<string, string>);
    assert.equal(expected, testCase.expected);
    assert.equal(state.modelMode, testCase.expected);
    assert.equal(expected, state.modelMode);
    record(results, testCase.id, testCase.detail);
  }

  assert.equal(router.classifyBeta2IdentityPrompt("ping"), "pure_test_signal");
  assert.equal(
    router.classifyBeta2IdentityPrompt("我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？"),
    "mixed_test_and_business"
  );
  assert.equal(
    router.classifyBeta2IdentityPrompt("老板团队执行很散，应该先看什么？"),
    "business_question"
  );
  record(results, "MODE-ROUTER-07", "Identity prompt classifier distinguishes pure test, mixed test/business, and business-only inputs.");

  const mixedUserText =
    "我想测试 Eliy Beta 2.0 是否已经接回真实大模型。请用你的方式回答：一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？";
  const mixedIntent = router.classifyBeta2IdentityPrompt(mixedUserText);
  const normalizedMissingIdentity = router.ensureBeta2IdentityBusinessSignals(
    "这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    mixedUserText,
    mixedIntent
  );
  assert(normalizedMissingIdentity.includes("作为 Eliy") || normalizedMissingIdentity.includes("Eliy"), "mixed reply missing identity should keep Eliy identity signal");
  assert(normalizedMissingIdentity.includes("经营判断"), "mixed reply missing identity should keep business framing");

  const normalizedMissingBusiness = router.ensureBeta2IdentityBusinessSignals(
    "作为 Eliy。先看唯一目标是否收敛。",
    mixedUserText,
    mixedIntent
  );
  assert(normalizedMissingBusiness.includes("这个问题我会先当成老板的经营判断问题处理。"), "mixed reply missing经营 should be prefixed");

  const alreadyQualified = router.ensureBeta2IdentityBusinessSignals(
    "作为 Eliy。这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    mixedUserText,
    mixedIntent
  );
  assert.equal(
    alreadyQualified,
    "作为 Eliy。这个问题我会先当成老板的经营判断问题处理。先看唯一目标是否收敛。",
    "already qualified reply should remain unchanged"
  );

  const pureSignalNormalized = router.ensureBeta2IdentityBusinessSignals(
    "收到。这是系统接续测试信号。",
    "ping",
    "pure_test_signal"
  );
  assert(pureSignalNormalized.includes("我是 Eliy") || pureSignalNormalized.includes("我是Eliy"), "pure test signal should get identity guard");
  assert(!pureSignalNormalized.includes("老板"), "pure test signal should not be expanded into business diagnosis");
  record(results, "MODE-ROUTER-08", "Normalization applies identity guard to pure test signals without adding business diagnosis.");

  const explicitFakeState = router.resolveBeta2ModelRouterState({
    env: {
      ELIY_BETA2_MODEL_MODE: "real_llm",
      ELIY_BETA2_LLM_PROVIDER: "fake",
      ELIY_BETA2_LLM_MODEL: "beta2-fake-model"
    }
  });
  const fallbackReply = router.buildBeta2IdentityReply("团队执行散，事情多但没结果，先看什么？", { activeSkill: "default" });
  assert(fallbackReply.includes("作为 Eliy") || fallbackReply.includes("Eliy"), "identity reply should preserve Eliy business voice");
  assert(fallbackReply.includes("老板") || fallbackReply.includes("经营"), "identity reply should retain business context");
  record(results, "MODE-ROUTER-09", "Identity reply template preserves Eliy business voice.");

  const fakeAdapterReply = await router.runBeta2RealLlmAdapter({
    modelState: explicitFakeState,
    messages: [{ role: "user", content: "你好" }],
    userText: "你好",
    activeSkill: "default"
  });

  assert.equal(fakeAdapterReply.modelState.modelMode, "real_llm");
  assert.equal(fakeAdapterReply.modelState.realLlmEnabled, true);
  assert(fakeAdapterReply.reply.includes("作为 Eliy") || fakeAdapterReply.reply.includes("Eliy"), "fake adapter should return Eliy identity reply");
  record(results, "MODE-ROUTER-10", "Fake provider adapter returns deterministic identity reply.");

  console.log([
    "# CP-ELIY-BETA2-REAL-LLM-MODE-ROUTER-TESTS",
    "",
    `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
  ].join("\n"));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
