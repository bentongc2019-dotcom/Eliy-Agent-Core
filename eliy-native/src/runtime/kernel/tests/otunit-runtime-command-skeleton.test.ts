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
      repositoryBoundaryAvailable: boolean;
    };
  };
  requiresProviderConfig: boolean;
  waitsForStdin: boolean;
  persistence: boolean;
  repository: {
    implementation: string;
    persistence: boolean;
    durableRuntimeState: boolean;
    chatWrites: boolean;
  };
  repositoryInspection: {
    saveValidOTUnit: boolean;
    getById: boolean;
    listByObjectiveId: boolean;
    clear: boolean;
    mutationSafeCopies: boolean;
    persistedAfterProcessExit: boolean;
    stdinRequired: boolean;
    chatCreatesOTUnits: boolean;
    mutationCliCommands: boolean;
  };
}

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
          reviewRevisionBoundaryAvailable: true,
          repositoryBoundaryAvailable: true
        }
      },
      repository: {
        implementation: "in_memory",
        persistence: false,
        durableRuntimeState: false,
        chatWrites: false
      },
      repositoryInspection: {
        saveValidOTUnit: true,
        getById: true,
        listByObjectiveId: true,
        clear: true,
        mutationSafeCopies: true,
        persistedAfterProcessExit: false,
        stdinRequired: false,
        chatCreatesOTUnits: false,
        mutationCliCommands: false
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
    expect(output.domain.otunit.repositoryBoundaryAvailable).toBe(true);
    expect(output.requiresProviderConfig).toBe(false);
    expect(output.waitsForStdin).toBe(false);
    expect(output.repository.implementation).toBe("in_memory");
    expect(output.repository.persistence).toBe(false);
    expect(output.repository.durableRuntimeState).toBe(false);
    expect(output.repository.chatWrites).toBe(false);
    expect(output.persistence).toBe(false);
  });


  it("inspection exposes OTUnit repository boundary availability", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.domain.otunit.repositoryBoundaryAvailable).toBe(true);
  });

  it("inspection proves save valid OTUnit", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.saveValidOTUnit).toBe(true);
  });

  it("inspection proves get by id", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.getById).toBe(true);
  });

  it("inspection proves list by objectiveId", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.listByObjectiveId).toBe(true);
  });

  it("inspection proves clear / reset", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.clear).toBe(true);
  });

  it("inspection proves returned OTUnits are mutation-safe copies", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.mutationSafeCopies).toBe(true);
  });

  it("inspection reports no durable persistence", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.persistedAfterProcessExit).toBe(false);
  });

  it("inspection reports no stdin required", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.stdinRequired).toBe(false);
  });

  it("inspection reports no chat creates OTUnits", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.chatCreatesOTUnits).toBe(false);
  });

  it("inspection reports no mutation CLI commands", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repositoryInspection.mutationCliCommands).toBe(false);
  });

  it("inspection reports all repository inspection fields present", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    const ri = output.repositoryInspection;
    expect(ri.saveValidOTUnit).toBe(true);
    expect(ri.getById).toBe(true);
    expect(ri.listByObjectiveId).toBe(true);
    expect(ri.clear).toBe(true);
    expect(ri.mutationSafeCopies).toBe(true);
    expect(ri.persistedAfterProcessExit).toBe(false);
    expect(ri.stdinRequired).toBe(false);
    expect(ri.chatCreatesOTUnits).toBe(false);
    expect(ri.mutationCliCommands).toBe(false);
    // All nine fields must be present.
    expect(Object.keys(ri).length).toBe(9);
  });

  it("inspection uses in-memory repository implementation", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repository.implementation).toBe("in_memory");
  });

  it("inspection reports no durable persistence", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repository.persistence).toBe(false);
    expect(output.repository.durableRuntimeState).toBe(false);
  });

  it("inspection reports no chat writes", () => {
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.repository.chatWrites).toBe(false);
  });

  it("repository can be constructed at runtime boundary", () => {
    // Repository is constructed inside the otunit CLI action callback.
    // This test proves the otunit command runs without error,
    // which means createInMemoryOTUnitRepository was called successfully.
    const result = runDirectOtunitCommand();
    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    const output = parseJsonOutput((result.stdout as string).trim());
    expect(output.ok).toBe(true);
  });

  it("prints help without exposing mutation subcommands", () => {
    const result = runOtunitCommand(["--help"]);

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    const helpOutput = `${String(result.stdout)}\n${String(result.stderr)}`;
    expect(helpOutput).toMatch(/OTUnit commands/i);
    expect(helpOutput).toMatch(/inspection-only/i);
    expect(helpOutput).not.toMatch(/eliy otunit create/i);
    expect(helpOutput).not.toMatch(/eliy otunit draft/i);
    expect(helpOutput).not.toMatch(/eliy otunit list/i);
    expect(helpOutput).not.toMatch(/eliy otunit show/i);
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
