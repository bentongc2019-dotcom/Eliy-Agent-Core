/**
 * OTUnit Revision Lifecycle Show CLI Wiring Boundary — Contract Test
 *
 * Verifies the exact dogfood-only CLI wiring for:
 *   corepack pnpm exec tsx src/cli/eliy.ts otunit revision-lifecycle-show --dogfood
 *
 * The command must remain read-only, deterministic, and plain-text only.
 */

import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND,
  runOTUnitRevisionLifecycleShowCliDogfood,
} from "../otunit-revision-lifecycle-show-cli-dogfood";

const projectRoot = resolve(__dirname, "../../../..");
const cliPath = join(projectRoot, "src/cli/eliy.ts");
const tsxLoaderPath = join(projectRoot, "node_modules/tsx/dist/loader.mjs");

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 5_000,
  });
}

describe("otunit-revision-lifecycle-show-cli-dogfood.ts", () => {
  it("exports the dogfood kind", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND).toBe(
      "otunit_revision_lifecycle_show_cli_dogfood",
    );
  });

  it("returns adapter stdout directly in the dogfood result", async () => {
    const result = await runOTUnitRevisionLifecycleShowCliDogfood({
      id: "cli-dogfood-test-001",
    });

    expect(result.kind).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND);
    expect(result.commandPath).toEqual(["otunit", "revision-lifecycle-show"]);
    expect(result.stdout).toBe(result.adapterResult.stdout);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.outputKind).toBe("plain_text");
    expect(result.ansiColorAllowed).toBe(false);
    expect(result.cliCommandRegistered).toBe(true);
    expect(result.terminalAdapterIntegrated).toBe(true);
    expect(result.stdout).toContain("OTUnit Revision Lifecycle");
    expect(result.stdout).toContain("Read Model:");
    expect(result.stdout).toContain("Snapshot:");
    expect(result.stdout).toContain("Record Steps");
    expect(result.stdout).not.toMatch(/[\u001b\u009b]/);
  });

  it("fails without dogfood in the exact CLI boundary phase", () => {
    const result = runCli(["otunit", "revision-lifecycle-show"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(
      "revision-lifecycle-show requires --dogfood in current boundary phase.",
    );
  });

  it("prints plain text and no stderr when dogfood is provided", () => {
    const result = runCli(["otunit", "revision-lifecycle-show", "--dogfood"]);

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("OTUnit Revision Lifecycle");
    expect(result.stdout).toContain("Read Model:");
    expect(result.stdout).toContain("Snapshot:");
    expect(result.stdout).toContain("Record Steps");
    expect(result.stdout).not.toMatch(/[\u001b\u009b]/);
  });

  it("exposes revision-lifecycle-show in otunit help", () => {
    const result = runCli(["otunit", "--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("revision-lifecycle-show");
  });

  it("exposes dogfood help for the exact command", () => {
    const result = runCli(["otunit", "revision-lifecycle-show", "--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("revision-lifecycle-show");
    expect(result.stdout).toContain("--dogfood");
  });
});
