import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../../..");
const cliPath = join(projectRoot, "src/cli/eliy.ts");
const tsxLoaderPath = join(projectRoot, "node_modules/tsx/dist/loader.mjs");
const secretLikePatterns = [
  /sk-/i,
  /api_key/i,
  /apikey/i,
  /secret/i,
  /token/i,
  /\.env/i,
  /Authorization/i,
  /Bearer\s+/i
];

function runCli(args: string[], stdin = "") {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    input: stdin,
    timeout: 5_000
  });
}

function expectNoSecretLikeText(output: string): void {
  for (const pattern of secretLikePatterns) {
    expect(output).not.toMatch(pattern);
  }
}

describe("Terminal chat command skeleton", () => {
  it("keeps chat wired to the terminal chat path without changing proof or smoke", () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.chat).toBe("tsx src/cli/eliy.ts chat");
    expect(packageJson.scripts?.proof).toBe("tsx src/cli/eliy.ts proof terminal");
    expect(packageJson.scripts?.smoke).toBe("tsx src/cli/eliy.ts proof terminal");
  });

  it("starts and exits the terminal chat loop without leaking secret-like text", () => {
    const result = runCli(["chat"], "/exit\n");
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expectNoSecretLikeText(combinedOutput);
    expect(stdout).toMatch(/chat loop started/i);
    expect(stdout).toMatch(/\/exit/i);
    expect(stdout).toMatch(/chat loop exited/i);
  });

  it("prints chat skeleton help without leaking secret-like text", () => {
    const result = runCli(["chat", "--help"]);
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toMatch(/usage/i);
    expect(stdout).toMatch(/chat/i);
    expect(stdout).toMatch(/deterministic terminal chat loop/i);
    expect(stdout).toMatch(/\/exit/i);
    expect(stdout).toMatch(/provider\/model adapter/i);
    expectNoSecretLikeText(combinedOutput);
  });
});
