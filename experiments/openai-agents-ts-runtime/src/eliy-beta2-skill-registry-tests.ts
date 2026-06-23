import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
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
  // @ts-expect-error runtime import of JS helper
  const shell = await import("../../../eliy-kernel/runtime/beta2-architecture-shell.js");

  const rootDir = resolveRepoRoot();
  const registry = shell.buildSkillRegistry(rootDir, "default");

  const defaultSkill = registry.skills.find((item: any) => item.id === "default");
  const sfocusSkill = registry.skills.find((item: any) => item.id === "sfocus");

  assert(defaultSkill, "default skill must exist");
  assert(sfocusSkill, "sfocus skill must exist");
  assert.equal(defaultSkill.status, "active");
  assert.equal(defaultSkill.enabled, true);
  assert.equal(defaultSkill.available, true);
  assert.equal(defaultSkill.active, true);
  assert.equal(defaultSkill.skillLoaded, true);
  assert.equal(path.basename(defaultSkill.skillMdPath), "SKILL.md");
  assert.equal(path.basename(defaultSkill.referencesPath), "references");
  assert(fs.existsSync(defaultSkill.skillMdPath), "default skill markdown must exist");
  assert(fs.existsSync(defaultSkill.referencesPath), "default skill references dir must exist");
  record(results, "SKILL-REG-01", "Default skill is loaded from filesystem with references directory.");

  assert.equal(sfocusSkill.status, "shell");
  assert.equal(sfocusSkill.enabled, true);
  assert.equal(sfocusSkill.available, true);
  assert.equal(sfocusSkill.active, false);
  assert.equal(sfocusSkill.skillLoaded, true);
  assert(fs.existsSync(sfocusSkill.skillMdPath), "sfocus skill markdown must exist");
  assert(fs.existsSync(sfocusSkill.referencesPath), "sfocus references dir must exist");
  record(results, "SKILL-REG-02", "S’FOCUS remains shell-only and filesystem-loaded.");

  console.log([
    "# CP-ELIY-BETA2-SKILL-REGISTRY-TESTS",
    "",
    `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
  ].join("\n"));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
