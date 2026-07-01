import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

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

function createProofProjectRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "eliy-native-proof-contract-"));
  writeFileSync(join(root, "HAC_AGENT.md"), "# HAC-Agent Governance\n\n- require_confirmation_for_writes: true\n");
  writeFileSync(join(root, "HLAMT.md"), "# HLAMT.md\n\nRuntime Asset hypothesis for human intelligence augmentation context.\n");
  return root;
}

describe("Runtime proof output contract", () => {
  let proofProjectRoot: string | undefined;

  afterEach(() => {
    if (proofProjectRoot) {
      rmSync(proofProjectRoot, { recursive: true, force: true });
      proofProjectRoot = undefined;
    }
  });

  it("keeps proof and smoke wired to the terminal proof path", () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.proof).toBe("tsx src/cli/eliy.ts proof terminal");
    expect(packageJson.scripts?.smoke).toBe("tsx src/cli/eliy.ts proof terminal");
  });

  it("emits stable terminal proof success semantics without leaking secret-like text", () => {
    proofProjectRoot = createProofProjectRoot();

    const result = spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, "proof", "terminal"], {
      cwd: proofProjectRoot,
      encoding: "utf8",
      timeout: 15_000
    });
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const combinedOutput = `${stdout}\n${stderr}`;

    expect(result.status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stderr).not.toMatch(/unhandled exception|stack trace|fatal error/i);
    for (const pattern of secretLikePatterns) {
      expect(combinedOutput).not.toMatch(pattern);
    }

    const payload = JSON.parse(stdout) as {
      ok?: unknown;
      command?: unknown;
    };

    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("proof terminal");
  });
});
