import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWED_OTUNIT_TRANSITIONS, OTUNIT_STATUSES } from "../../../domain/index.js";

const projectRoot = resolve(__dirname, "../../../..");
const cliPath = join(projectRoot, "src/cli/eliy.ts");
const tsxLoaderPath = join(projectRoot, "node_modules/tsx/dist/loader.mjs");
type OtunitCommandOutput = {
  ok: true;
  command: string;
  mode: string;
  domain: {
    otunit: {
      available: boolean;
      statusValues: string[];
      allowedTransitionsCount: number;
      confirmationBoundaryAvailable: boolean;
      draftBoundaryAvailable: boolean;
      evidenceRefBoundaryAvailable: boolean;
      reviewRevisionBoundaryAvailable: boolean;
    };
  };
  requiresProviderConfig: boolean;
  waitsForStdin: boolean;
  persistence: boolean;
};

function runDirectOtunitCommand(env: NodeJS.ProcessEnv = process.env): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, "otunit"], {
    cwd: projectRoot,
    encoding: "utf8",
    env,
    timeout: 5_000
  });
}

function runOtunitCommand(args: string[], env: NodeJS.ProcessEnv = process.env): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, "otunit", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env,
    timeout: 5_000
  });
}

function parseJsonOutput(stdout: string): OtunitCommandOutput {
  return JSON.parse(stdout) as OtunitCommandOutput;
}

describe("OTUnit runtime command skeleton", () => {
  it("exposes the otunit package script", () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.otunit).toBe("tsx src/cli/eliy.ts otunit");
  });

  it("prints deterministic JSON from the direct CLI command", () => {
    const result = runDirectOtunitCommand();

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(typeof result.stdout).toBe("string");

    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output).toEqual({
      ok: true,
      command: "otunit",
      mode: "domain_contract_inspection",
      domain: {
        otunit: {
          available: true,
          statusValues: [...OTUNIT_STATUSES],
          allowedTransitionsCount: ALLOWED_OTUNIT_TRANSITIONS.length,
          confirmationBoundaryAvailable: true,
          draftBoundaryAvailable: true,
          evidenceRefBoundaryAvailable: true,
          reviewRevisionBoundaryAvailable: true
        }
      },
      requiresProviderConfig: false,
      waitsForStdin: false,
      persistence: false
    });
  });

  it("prints deterministic JSON from the package script", () => {
    const result = spawnSync("corepack", ["pnpm", "otunit"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 5_000
    });

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.command).toBe("otunit");
    expect(output.mode).toBe("domain_contract_inspection");
    expect(output.domain.otunit.available).toBe(true);
    expect(output.domain.otunit.statusValues).toEqual([...OTUNIT_STATUSES]);
    expect(output.domain.otunit.allowedTransitionsCount).toBe(ALLOWED_OTUNIT_TRANSITIONS.length);
    expect(output.domain.otunit.confirmationBoundaryAvailable).toBe(true);
    expect(output.domain.otunit.draftBoundaryAvailable).toBe(true);
    expect(output.domain.otunit.evidenceRefBoundaryAvailable).toBe(true);
    expect(output.domain.otunit.reviewRevisionBoundaryAvailable).toBe(true);
    expect(output.requiresProviderConfig).toBe(false);
    expect(output.waitsForStdin).toBe(false);
    expect(output.persistence).toBe(false);
  });

  it("prints help without exposing mutation subcommands", () => {
    const result = runOtunitCommand(["--help"]);

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const helpOutput = `${String(result.stdout)}\n${String(result.stderr)}`;
    expect(helpOutput).toMatch(/OTUnit commands/i);
    expect(helpOutput).not.toMatch(/\bcreate\b/);
    expect(helpOutput).not.toMatch(/\bdraft\b/);
    expect(helpOutput).not.toMatch(/\blist\b/);
    expect(helpOutput).not.toMatch(/\bshow\b/);
    expect(helpOutput).not.toMatch(/\bstatus\b/);
    expect(helpOutput).not.toMatch(/\bclose\b/);
  });

  it("does not require provider config to run", () => {
    const env = { ...process.env };
    delete env.ELIY_PROVIDER_BASE_URL;
    delete env.ELIY_PROVIDER_API_KEY;
    delete env.ELIY_PROVIDER_MODEL;
    delete env.ELIY_PROVIDER_TIMEOUT_MS;

    const result = runDirectOtunitCommand(env);

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(parseJsonOutput((result.stdout as string).trim()).command).toBe("otunit");
  });

  it("does not accept mutation-oriented otunit subcommands", () => {
    const result = runOtunitCommand(["create"]);

    expect(result.status).not.toBe(0);
    expect(result.error).toBeUndefined();

    const combinedOutput = `${String(result.stdout)}\n${String(result.stderr)}`;
    expect(combinedOutput).not.toMatch(/"ok"\s*:\s*true/);
    expect(combinedOutput).toMatch(/Unknown command|error/i);
  });

  it("completes without waiting for stdin", () => {
    const result = execFileSync(process.execPath, ["--import", tsxLoaderPath, cliPath, "otunit"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 5_000
    });

    const output = parseJsonOutput(result.trim());

    expect(output.ok).toBe(true);
    expect(output.command).toBe("otunit");
    expect(output.waitsForStdin).toBe(false);
  });
});
