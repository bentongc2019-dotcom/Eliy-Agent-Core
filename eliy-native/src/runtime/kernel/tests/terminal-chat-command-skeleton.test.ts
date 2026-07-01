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

function runCli(args: string[]) {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
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

  it("emits stable terminal chat skeleton semantics without leaking secret-like text", () => {
    const result = runCli(["chat"]);
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expectNoSecretLikeText(combinedOutput);

    const payload = JSON.parse(stdout) as {
      ok?: unknown;
      command?: unknown;
      mode?: unknown;
      interactive_loop_enabled?: unknown;
      provider_adapter_enabled?: unknown;
      message?: unknown;
    };

    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("chat");
    expect(payload.mode).toBe("terminal_chat_skeleton");
    expect(payload.interactive_loop_enabled).toBe(false);
    expect(payload.provider_adapter_enabled).toBe(false);
    expect(String(payload.message)).toMatch(/chat/i);
    expect(String(payload.message)).toMatch(/skeleton/i);
    expect(String(payload.message)).toMatch(/interactive loop (is )?not enabled|interactive loop disabled/i);
    expect(String(payload.message)).toMatch(/provider(\/model)? adapter (is )?not enabled|provider adapter disabled/i);
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
    expect(stdout).toMatch(/skeleton/i);
    expect(stdout).toMatch(/interactive loop/i);
    expect(stdout).toMatch(/provider adapter/i);
    expectNoSecretLikeText(combinedOutput);
  });
});
