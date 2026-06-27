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

  const businessPrompts = [
    "一个老板现在团队执行很散、事情很多但没有结果，应该先看什么？",
    "如果每个负责人都说自己很忙，我怎么判断问题在哪里？",
    "那我下一步应该先找谁谈？",
    "如果他们都说目标不清楚，我要怎么处理？",
  ];

  const explicitIntroReplies = businessPrompts.map((prompt) => router.buildBeta2IdentityReply(prompt, { activeSkill: "default" }));
  const explicitIntroCount = explicitIntroReplies.filter((reply) => /^(?:我是\s*Eliy|我是Eliy)/.test(reply)).length;

  assert(
    explicitIntroCount <= 1,
    `business dialogue should not repeatedly start with explicit identity phrasing; got ${explicitIntroCount}/4`
  );

  for (const reply of explicitIntroReplies) {
    assert(/老板|经营|判断|下一步/.test(reply), "business dialogue should retain owner judgment framing");
    assert(!/generic_fallback|generic fallback|provider config|invite code|api key|API key/.test(reply), "business dialogue should not leak fallback or internal config");
  }

  const identityReply = router.buildBeta2IdentityReply("你是谁？", { activeSkill: "default" });
  assert(
    /我是\s*(?:Eliy|艾利)|我是Eliy/.test(identityReply),
    "identity inquiry should still allow a concise Eliy self-introduction"
  );

  record(results, "IDENTITY-REPETITION-01", "Continuous business dialogue avoids repeated explicit self-introduction.");
  record(results, "IDENTITY-REPETITION-02", "Identity inquiry still allows a concise Eliy self-introduction.");

  console.log([
    "# CP-ELIY-BETA2-IDENTITY-REPETITION-CHECK",
    "",
    `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
  ].join("\n"));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
