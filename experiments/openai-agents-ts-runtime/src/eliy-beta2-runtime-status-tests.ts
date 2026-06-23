import { strict as assert } from "node:assert";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type TestResult = {
  id: string;
  result: "Passed";
  evidence: string;
};

function record(results: TestResult[], id: string, evidence: string): void {
  results.push({ id, result: "Passed", evidence });
}

function resolveRepoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

async function run(): Promise<void> {
  const results: TestResult[] = [];
  // @ts-expect-error runtime import of JS helpers
  const shell = await import("../../../eliy-kernel/runtime/beta2-architecture-shell.js");
  // @ts-expect-error runtime import of JS config helper
  const deployConfig = await import("../../../eliy-kernel/runtime/deploy-config.js");

  const repoRoot = resolveRepoRoot();

  const runtimeConfig = deployConfig.resolveRuntimeConfig({
    env: {
      HOST: "127.0.0.1",
      PORT: "3102",
      ELIY_PUBLIC_BASE_URL: "https://hk-beta2.eliyai.com",
      ELIY_COOKIE_SECURE: "true",
      ELIY_COOKIE_SAMESITE: "Lax",
      ELIY_RUNTIME_DATA_DIR: "/var/lib/eliy-beta2/runtime",
      ELIY_ACCOUNT_STORAGE_DIR: "/var/lib/eliy-beta2/account-store",
      ELIY_TRANSCRIPTS_DIR: "/var/lib/eliy-beta2/runtime/transcripts",
      ELIY_MEMORY_DIR: "/var/lib/eliy-beta2/runtime/memory",
      ELIY_REPORTS_DIR: "/var/lib/eliy-beta2/runtime/reports",
      ELIY_STATE_DIR: "/var/lib/eliy-beta2/runtime/state",
      ELIY_EVIDENCE_DIR: "/var/lib/eliy-beta2/runtime/hlamt",
      ELIY_ALLOWLIST: "owner-test@eliyai.com",
      ELIY_INVITE_CODES: "BETA-INVITE",
      CANDIDATE_GENERATION_MODE: "generic_fallback"
    },
    rootDir: repoRoot
  });

  const runtimeStatus = shell.buildRuntimeStatus({ runtimeConfig, activeSkill: "default", modelMode: "generic_fallback" });
  assert.equal(runtimeStatus.environment, "owner_test");
  assert.equal(runtimeStatus.version, "beta2");
  assert.equal(runtimeStatus.stage, "p0_foundation_agent_harness_shell");
  assert.equal(runtimeStatus.modelMode, "generic_fallback");
  assert.equal(runtimeStatus.realLlmEnabled, false);
  assert.equal(runtimeStatus.agentHarnessEnabled, true);
  assert.equal(runtimeStatus.skillRegistryEnabled, true);
  assert.equal(runtimeStatus.oOrderWorkbench, "shell");
  assert.equal(runtimeStatus.oOrderRuntimeEnabled, false);
  assert.equal(runtimeStatus.activeSkill, "default");
  assert.equal(runtimeStatus.host, "127.0.0.1");
  assert.equal(runtimeStatus.port, 3102);
  assert.equal(runtimeStatus.publicBaseUrl, "https://hk-beta2.eliyai.com");
  record(results, "RT-STATUS-01", "Runtime status exposes owner_test beta2 shell metadata.");

  const skillRegistry = shell.buildSkillRegistry(repoRoot, "default");
  assert.equal(skillRegistry.registry, "filesystem");
  assert.equal(skillRegistry.registryLoaded, true);
  assert.equal(skillRegistry.activeSkill, "default");
  assert(Array.isArray(skillRegistry.skills) && skillRegistry.skills.length === 2);
  assert(skillRegistry.skills.some((item: any) => item.id === "default"));
  assert(skillRegistry.skills.some((item: any) => item.id === "sfocus"));
  record(results, "RT-STATUS-02", "Skill registry exposes default and sfocus shell metadata.");

  const schema = shell.buildOOrderWorkbenchSchema();
  assert.equal(schema.workbench, "o_order");
  assert.equal(schema.status, "shell");
  assert.equal(schema.runtimeEnabled, false);
  assert.deepEqual(schema.fields.map((item: any) => item.key), [
    "goal",
    "plan",
    "actions",
    "owner",
    "time",
    "followUps",
    "review",
    "evidence",
    "status"
  ]);
  record(results, "RT-STATUS-03", "O 单 shell schema exposes the required field keys.");

  console.log([
    "# CP-ELIY-BETA2-RUNTIME-STATUS-TESTS",
    "",
    `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
  ].join("\n"));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
