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

  const fallbackState = router.resolveBeta2ModelRouterState({
    env: {
      DEEPSEEK_API_KEY: "global-secret",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_PROVIDER: "deepseek-openai-compatible"
    }
  });

  assert.equal(fallbackState.modelMode, "generic_fallback");
  assert.equal(fallbackState.realLlmEnabled, false);
  assert.equal(fallbackState.requestedModelMode, "generic_fallback");
  assert.equal(fallbackState.modelProvider, "beta2-unconfigured");
  assert.equal(fallbackState.fallbackReason, null);
  record(results, "MODE-ROUTER-01", "Global DEEPSEEK env does not auto-enable Beta2 real_llm.");

  const explicitFakeState = router.resolveBeta2ModelRouterState({
    env: {
      ELIY_BETA2_MODEL_MODE: "real_llm",
      ELIY_BETA2_LLM_PROVIDER: "fake",
      ELIY_BETA2_LLM_MODEL: "beta2-fake-model"
    }
  });

  assert.equal(explicitFakeState.modelMode, "real_llm");
  assert.equal(explicitFakeState.realLlmEnabled, true);
  assert.equal(explicitFakeState.requestedModelMode, "real_llm");
  assert.equal(explicitFakeState.modelProvider, "fake");
  record(results, "MODE-ROUTER-02", "Explicit Beta2 real_llm enables fake provider path.");

  const explicitGlobalFallbackState = router.resolveBeta2ModelRouterState({
    env: {
      ELIY_BETA2_MODEL_MODE: "real_llm",
      DEEPSEEK_PROVIDER: "deepseek-openai-compatible",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_API_KEY: "global-secret"
    }
  });

  assert.equal(explicitGlobalFallbackState.modelMode, "real_llm");
  assert.equal(explicitGlobalFallbackState.realLlmEnabled, true);
  assert.equal(explicitGlobalFallbackState.modelProvider, "deepseek-openai-compatible");
  assert.equal(explicitGlobalFallbackState.modelModel, "deepseek-v4-flash");
  assert.equal(explicitGlobalFallbackState.modelBaseUrl, "https://api.deepseek.com");
  record(results, "MODE-ROUTER-03", "Explicit Beta2 real_llm may reuse DeepSeek-compatible provider config.");

  const fallbackReply = router.buildBeta2IdentityReply("团队执行散，事情多但没结果，先看什么？", { activeSkill: "default" });
  assert(fallbackReply.includes("我是 Eliy"), "identity reply should identify Eliy");
  assert(fallbackReply.includes("老板") || fallbackReply.includes("经营"), "identity reply should retain business context");
  record(results, "MODE-ROUTER-04", "Identity reply template preserves Eliy business voice.");

  const fakeAdapterReply = await router.runBeta2RealLlmAdapter({
    modelState: explicitFakeState,
    messages: [{ role: "user", content: "你好" }],
    userText: "你好",
    activeSkill: "default"
  });

  assert.equal(fakeAdapterReply.modelState.modelMode, "real_llm");
  assert.equal(fakeAdapterReply.modelState.realLlmEnabled, true);
  assert(fakeAdapterReply.reply.includes("我是 Eliy"), "fake adapter should return Eliy identity reply");
  record(results, "MODE-ROUTER-05", "Fake provider adapter returns deterministic identity reply.");

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
