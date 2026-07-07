/**
 * OTUnit Revision Lifecycle Show CLI Wiring Boundary — Contract Test
 *
 * Verifies the exact dogfood-only CLI wiring for:
 *   corepack pnpm exec tsx src/cli/eliy.ts otunit revision-lifecycle-show --dogfood
 *
 * The command must remain read-only, deterministic, and plain-text only.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_CLI_DOGFOOD_KIND,
  runOTUnitRevisionLifecycleShowCliDogfood,
} from "../otunit-revision-lifecycle-show-cli-dogfood";

const projectRoot = path.resolve(__dirname, "../../../..");
const cliPath = path.join(projectRoot, "src/cli/eliy.ts");
const tsxLoaderPath = path.join(projectRoot, "node_modules/tsx/dist/loader.mjs");

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 5_000,
  });
}

describe("otunit-revision-lifecycle-show-command-cli-wiring-boundary.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-lifecycle-show-cli-dogfood.ts",
    );
    expect(readFileSync(sourcePath, "utf8").length).toBeGreaterThan(0);
  });

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

  it("wires the revision lifecycle show command into the CLI", () => {
    const dogfoodResult = runCli(["otunit", "revision-lifecycle-show", "--dogfood"]);
    const missingDogfoodResult = runCli(["otunit", "revision-lifecycle-show"]);
    const otunitHelpResult = runCli(["otunit", "--help"]);
    const showHelpResult = runCli(["otunit", "revision-lifecycle-show", "--help"]);

    expect(dogfoodResult.status).toBe(0);
    expect(dogfoodResult.error).toBeUndefined();
    expect(dogfoodResult.stderr).toBe("");
    expect(dogfoodResult.stdout).toContain("OTUnit Revision Lifecycle");
    expect(dogfoodResult.stdout).toContain("Read Model:");
    expect(dogfoodResult.stdout).toContain("Snapshot:");
    expect(dogfoodResult.stdout).toContain("Record Steps");
    expect(dogfoodResult.stdout).not.toMatch(/[\u001b\u009b]/);

    expect(missingDogfoodResult.status).toBe(1);
    expect(missingDogfoodResult.stdout).toBe("");
    expect(missingDogfoodResult.stderr).toContain(
      "revision-lifecycle-show requires --dogfood in current boundary phase.",
    );

    expect(otunitHelpResult.status).toBe(0);
    expect(otunitHelpResult.stdout).toContain("revision-lifecycle-show");

    expect(showHelpResult.status).toBe(0);
    expect(showHelpResult.stdout).toContain("revision-lifecycle-show");
    expect(showHelpResult.stdout).toContain("--dogfood");
  });
});
