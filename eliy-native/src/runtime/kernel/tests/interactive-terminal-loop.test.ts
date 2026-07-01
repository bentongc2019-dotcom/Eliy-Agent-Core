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

describe("Interactive terminal chat loop", () => {
  it("keeps chat wired without changing proof or smoke scripts", () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.chat).toBe("tsx src/cli/eliy.ts chat");
    expect(packageJson.scripts?.proof).toBe("tsx src/cli/eliy.ts proof terminal");
    expect(packageJson.scripts?.smoke).toBe("tsx src/cli/eliy.ts proof terminal");
  });

  it("prints chat help with loop controls and disabled provider/model semantics", () => {
    const result = runCli(["chat", "--help"]);
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toMatch(/usage/i);
    expect(stdout).toMatch(/chat/i);
    expect(stdout).toMatch(/\/exit/i);
    expect(stdout).toMatch(/provider\/model adapter (is )?not enabled/i);
    expect(stdout).toMatch(/deterministic skeleton response/i);
    expect(stdout).toMatch(/no session, transcript, or runtime state persistence/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("exits with code 0 when the first command is /exit", () => {
    const result = runCli(["chat"], "/exit\n");
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toMatch(/chat loop started/i);
    expect(stdout).toMatch(/\/exit/i);
    expect(stdout).toMatch(/chat loop exited/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("returns a deterministic skeleton response for non-empty input", () => {
    const result = runCli(["chat"], "hello\n/exit\n");
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout).toMatch(/assistant: skeleton response received: hello/i);
    expect(stdout).toMatch(/provider\/model adapter not enabled/i);
    expect(stdout).toMatch(/chat loop exited/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("handles empty input cleanly before exit", () => {
    const result = runCli(["chat"], "\n/exit\n");
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout).toMatch(/empty input received/i);
    expect(stdout).toMatch(/chat loop exited/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("exits cleanly on EOF without hanging", () => {
    const result = runCli(["chat"], "");
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout).toMatch(/chat loop started/i);
    expect(stdout).toMatch(/chat loop exited/i);
    expectNoSecretLikeText(combinedOutput);
  });
});
