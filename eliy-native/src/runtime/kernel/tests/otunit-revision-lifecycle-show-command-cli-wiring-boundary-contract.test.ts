/**
 * OTUnit Revision Lifecycle Show Command CLI Wiring Boundary — Contract Test
 *
 * Verifies that the CLI wiring boundary connects the revision lifecycle show
 * command to deterministic plain-text output without persistence, provider
 * integration, or source OTUnit mutation.
 *
 * No filesystem persistence, no database persistence, no provider / real LLM
 * integration, and no runtime behavior change outside the CLI wiring surface.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_WIRING_BOUNDARY_KIND,
  projectOTUnitRevisionLifecycleShowCommandCliWiringBoundary,
} from "../otunit-revision-lifecycle-show-command-cli-wiring-boundary";

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

describe("otunit-revision-lifecycle-show-command-cli-wiring-boundary.ts", () => {
  it("exists as a file on disk", () => {
    const sourcePath = join(
      projectRoot,
      "src/runtime/kernel/otunit-revision-lifecycle-show-command-cli-wiring-boundary.ts",
    );
    expect(readFileSync(sourcePath, "utf8").length).toBeGreaterThan(0);
  });

  it("exports the CLI wiring boundary kind", () => {
    expect(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_WIRING_BOUNDARY_KIND).toBe(
      "otunit_revision_lifecycle_show_command_cli_wiring_boundary",
    );
  });

  it("projects a deterministic plain-text CLI wiring result", async () => {
    const result = await projectOTUnitRevisionLifecycleShowCommandCliWiringBoundary({
      id: "cli-wiring-001",
    });

    expect(result.id).toBe("cli-wiring-001");
    expect(result.kind).toBe(OTUNIT_REVISION_LIFECYCLE_SHOW_COMMAND_CLI_WIRING_BOUNDARY_KIND);
    expect(result.commandName).toBe("otunit:revision:lifecycle:show");
    expect(result.commandPath).toEqual(["otunit", "revision", "lifecycle", "show"]);
    expect(result.adapterKind).toBe("otunit_revision_lifecycle_show_command_adapter");
    expect(result.adapterName).toBe("terminal:otunit:revision:lifecycle:show");
    expect(result.cliCommandRegistered).toBe(true);
    expect(result.terminalAdapterIntegrated).toBe(true);
    expect(result.outputKind).toBe("plain_text");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/OTUnit Revision Lifecycle/);
    expect(result.stdout).toMatch(/Read Model:/);
    expect(result.stdout).toMatch(/Snapshot:/);
    expect(result.stdout).toMatch(/Record Steps/);
  });

  it("wires the revision lifecycle show command into the CLI", () => {
    const result = runCli(["otunit", "revision", "lifecycle", "show"]);

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toMatch(/OTUnit Revision Lifecycle/);
    expect(result.stdout).toMatch(/Read Model:/);
    expect(result.stdout).toMatch(/Snapshot:/);
    expect(result.stdout).toMatch(/Record Steps/);
    expect(`${result.stdout}\n${result.stderr}`).not.toMatch(/process\.env|\.env|sqlite|postgres|prisma/i);
  });
});
