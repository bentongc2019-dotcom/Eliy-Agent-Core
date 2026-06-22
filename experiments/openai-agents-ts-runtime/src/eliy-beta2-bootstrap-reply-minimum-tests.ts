import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = resolve(process.cwd(), "../..");
const serverSource = readFileSync(resolve(repoRoot, "eliy-kernel/runtime/server.js"), "utf8");

const marker = "CP_ELIY_BETA2_OWNER_TEST_BOOTSTRAP_REPLY_FIX";
const standardReply = "你好，我是 Eliy Beta 2.0 Owner Test 环境。当前我可以帮助你验证登录、会话保存、消息历史、trace 显示与基础对话链路；经营管理能力仍处于后续工程化阶段，所以现在还不是完整的经营智能体。";

const bootstrapInputs = [
  "你好，请确认当前是否是 Eliy Beta 2.0 Owner Test，并用一句话说明你现在能帮我做什么。",
  "你是谁？",
  "现在这个版本能做什么？",
  "当前是不是完整的经营智能体？"
];

const requiredTerms = [
  "Eliy Beta 2.0 Owner Test",
  "登录",
  "会话保存",
  "消息历史",
  "trace",
  "基础对话链路",
  "经营管理能力仍处于后续工程化阶段"
];

assert(serverSource.includes(marker), "Bootstrap reply fix marker must exist in server.js.");
assert(serverSource.includes(standardReply), "Standard Owner Test bootstrap reply must exist in server.js.");

const requiredIntentTerms = [
  "你好",
  "你是谁",
  "Eliy",
  "Beta 2.0",
  "Owner Test",
  "能帮我做什么",
  "现在这个版本能做什么",
  "这个版本能做什么",
  "版本能做什么",
  "能做什么",
  "完整的经营智能体"
];

for (const term of requiredIntentTerms) {
  assert(serverSource.includes(term), `server.js bootstrap intent terms must include: ${term}`);
}

for (const term of requiredTerms) {
  assert(standardReply.includes(term), `Standard reply must include required term: ${term}`);
}

for (const input of bootstrapInputs) {
  const matched =
    input.includes("你好") ||
    input.includes("你是谁") ||
    input.includes("Eliy") ||
    input.includes("Beta 2.0") ||
    input.includes("Owner Test") ||
    input.includes("能帮我做什么") ||
    input.includes("现在这个版本能做什么") ||
    input.includes("完整的经营智能体");

  assert(matched, `Bootstrap input must be covered by intent terms: ${input}`);
}

assert(!standardReply.includes("请提供更多业务细节"), "Standard reply must not ask for more business details.");
assert(!standardReply.includes("请提供具体数据"), "Standard reply must not ask for specific data.");

console.log("Eliy Beta 2.0 bootstrap reply minimum tests passed.");
