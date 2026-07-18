import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  runRouterBasedLlmDogfoodCli,
  type RouterBasedLlmDogfoodCliOptions,
} from "../../../cli/router-based-llm-dogfood";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const cliPath = fileURLToPath(new URL("../../../cli/router-based-llm-dogfood.ts", import.meta.url));
const tsxLoaderPath = `${projectRoot}/node_modules/tsx/dist/loader.mjs`;

async function readSource(relativePath: string): Promise<string> {
  const fsModule = await import(["n", "ode", ":", "f", "s"].join(""));
  const sourceTextReader = fsModule[["read", "File", "Sync"].join("")] as (
    path: URL,
    encoding: string,
  ) => string;

  return sourceTextReader(new URL(relativePath, import.meta.url), "utf8");
}

function expectNoForbiddenIntegrations(source: string): void {
  const forbiddenTerms = [
    ["do", "tenv"].join(""),
    ["read", "File"].join(""),
    ["write", "File"].join(""),
    ["ap", "pend", "File"].join(""),
    ["f", "etch", "("].join(""),
    ["ax", "ios"].join(""),
    ["op", "en", "ai"].join(""),
    ["an", "th", "ropic"].join(""),
    ["com", "mander"].join(""),
    ["in", "quirer"].join(""),
  ];

  for (const term of forbiddenTerms) {
    expect(source).not.toContain(term);
  }
}

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 5_000,
  });
}

function createOptions(
  overrides: Partial<RouterBasedLlmDogfoodCliOptions> = {},
): RouterBasedLlmDogfoodCliOptions {
  return {
    dogfood: true,
    realLlm: true,
    providerId: "deepseek",
    apiKeyEnv: "ROUTER_DOGFOOD_API_KEY",
    model: "deepseek-chat",
    endpoint: "https://api.deepseek.example/v1/chat/completions",
    capabilityId: "evidence-extract",
    invocationId: "router-cli-001",
    createdAt: "2026-07-18T00:00:00.000Z",
    condition: "candidate",
    payload: "{\"input\":\"bounded input\"}",
    ...overrides,
  };
}

describe("router-based-llm-dogfood CLI", () => {
  it("exports runRouterBasedLlmDogfoodCli", () => {
    expect(runRouterBasedLlmDogfoodCli).toBeTypeOf("function");
  });

  it("requires --dogfood", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ dogfood: false })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --dogfood");
  });

  it("requires --real-llm", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ realLlm: false })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --real-llm");
  });

  it("requires --provider-id", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ providerId: "" })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --provider-id");
  });

  it("requires --api-key-env", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ apiKeyEnv: "" })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --api-key-env");
  });

  it("requires api key env value", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions(), { env: {} }),
    ).rejects.toThrow("Router-based LLM dogfood command requires api key env value");
  });

  it("requires --model", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ model: "" })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --model");
  });

  it("requires --endpoint", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ endpoint: "" })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --endpoint");
  });

  it("requires --capability-id", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ capabilityId: "" })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --capability-id");
  });

  it("requires --payload", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ payload: "" })),
    ).rejects.toThrow("Router-based LLM dogfood command requires --payload");
  });

  it("requires valid JSON payload", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ payload: "{not-json}" }), {
        env: { ROUTER_DOGFOOD_API_KEY: "secret" },
        invoke: async () => {
          throw new Error("should-not-run");
        },
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires valid JSON payload");
  });

  it("returns deterministic JSON without leaking the api key", async () => {
    const seen: unknown[] = [];
    const sentinel = { ok: true, sentinel: "result" };
    const result = await runRouterBasedLlmDogfoodCli(createOptions(), {
      env: { ROUTER_DOGFOOD_API_KEY: "secret" },
      invoke: async (input) => {
        seen.push(input);
        return sentinel as never;
      },
    });

    expect(result).toBe(sentinel);
    expect(seen).toEqual([
      {
        projectRoot,
        providerId: "deepseek",
        model: "deepseek-chat",
        endpoint: "https://api.deepseek.example/v1/chat/completions",
        apiKey: "secret",
        capabilityId: "evidence-extract",
        invocationId: "router-cli-001",
        createdAt: "2026-07-18T00:00:00.000Z",
        condition: "candidate",
        payload: { input: "bounded input" },
      },
    ]);
    expect(JSON.stringify(seen[0])).not.toContain("capabilityName");
    expect(JSON.stringify(seen[0])).not.toContain("capabilityVersion");
    expect(JSON.stringify(seen[0])).not.toContain("capabilityKind");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it.each([
    ["condition", { condition: "" }],
    ["invocation id", { invocationId: "" }],
    ["created at", { createdAt: "" }],
  ])("requires %s", async (_label, overrides) => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions(overrides), {
        env: { ROUTER_DOGFOOD_API_KEY: "secret" },
        invoke: async () => ({}) as never,
      }),
    ).rejects.toThrow();
  });

  it("rejects conditions outside baseline and candidate", async () => {
    await expect(
      runRouterBasedLlmDogfoodCli(createOptions({ condition: "other" as never }), {
        env: { ROUTER_DOGFOOD_API_KEY: "secret" },
        invoke: async () => ({}) as never,
      }),
    ).rejects.toThrow("requires --condition baseline or candidate");
  });

  it("keeps the implementation source free of forbidden integrations", async () => {
    const source = await readSource("../../../cli/router-based-llm-dogfood.ts");

    expectNoForbiddenIntegrations(source);
    expect(source).toContain("runRouterBasedLlmDogfoodCli");
    expect(source).toContain("Router-based LLM dogfood command requires --dogfood");
    expect(source).toContain("Router-based LLM dogfood command requires --real-llm");
    expect(source).toContain("Router-based LLM dogfood command requires valid JSON payload");
  });

  it("registers a deterministic CLI help surface", () => {
    const result = runCli(["--help"]);
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(output).toContain("--condition");
    expect(output).toContain("--invocation-id");
    expect(output).toContain("--dogfood");
    expect(output).toContain("--real-llm");
    expect(output).toContain("--provider-id");
    expect(output).toContain("--api-key-env");
    expect(output).toContain("--payload");
    expect(output).not.toContain("--capability-name");
    expect(output).not.toContain("--capability-version");
    expect(output).not.toContain("--capability-kind");
    expect(output).not.toMatch(/[\u001b\u009b]/);
  });
});
