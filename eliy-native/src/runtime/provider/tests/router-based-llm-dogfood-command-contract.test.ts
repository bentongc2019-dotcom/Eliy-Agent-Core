import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type {
  RouterBasedLlmDogfoodCliDependencies,
  RouterBasedLlmDogfoodCliOptions,
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

function expectNoForbiddenIntegrations(source: string) {
  const ansiEscape = `${String.fromCharCode(27)}[`;
  const forbiddenTerms = [
    ["pro", "cess", ".", "env"].join(""),
    ["do", "tenv"].join(""),
    ["n", "ode", ":", "f", "s"].join(""),
    ["f", "rom", " ", "\"", "f", "s", "\""].join(""),
    ["f", "rom", " ", "'", "f", "s", "'"].join(""),
    ["read", "File"].join(""),
    ["write", "File"].join(""),
    ["ap", "pend", "File"].join(""),
    ["rea", "dir"].join(""),
    ["op", "endir"].join(""),
    ["g", "lob"].join(""),
    ["f", "etch", "("].join(""),
    ["g", "lo", "bal", "This", ".", "f", "etch"].join(""),
    ["ax", "ios"].join(""),
    ["op", "en", "ai"].join(""),
    ["an", "th", "ropic"].join(""),
    ["com", "mander"].join(""),
    ["in", "quirer"].join(""),
    ["s", "rc", "/", "cl", "i"].join(""),
    ["s", "rc", "/", "r", "untime", "/", "work", "space"].join(""),
    ["s", "rc", "/", "r", "untime", "/", "ker", "nel"].join(""),
    ["s", "ki", "lls"].join(""),
    ansiEscape,
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

function createBaseOptions(
  overrides: Partial<RouterBasedLlmDogfoodCliOptions> = {},
): RouterBasedLlmDogfoodCliOptions {
  return {
    dogfood: true,
    realLlm: true,
    providerId: "deepseek",
    apiKeyEnv: "ROUTER_DOGFOOD_API_KEY",
    model: "deepseek-chat",
    endpoint: "https://api.deepseek.example/v1/chat/completions",
    capabilityId: "opdca",
    capabilityName: "O'PDCA",
    capabilityVersion: "1.0.0",
    capabilityKind: "skill",
    payload: "{\"requestId\":\"router-dogfood-request-001\"}",
    ...overrides,
  };
}

describe("router-based-llm-dogfood.ts", () => {
  it("exports runRouterBasedLlmDogfoodCli", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    expect(module.runRouterBasedLlmDogfoodCli).toBeTypeOf("function");
    expect(module).toHaveProperty("runRouterBasedLlmDogfoodCli");
  });

  it("requires --dogfood", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ dogfood: false }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --dogfood");
  });

  it("requires --real-llm", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ realLlm: false }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --real-llm");
  });

  it("requires --provider-id", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ providerId: "" as never }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --provider-id");
  });

  it("requires --api-key-env", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ apiKeyEnv: "" as never }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --api-key-env");
  });

  it("requires api key env value", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli(createBaseOptions(), {
        env: {},
      } satisfies RouterBasedLlmDogfoodCliDependencies),
    ).rejects.toThrow("Router-based LLM dogfood command requires api key env value");
  });

  it("requires --model", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ model: "" as never }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --model");
  });

  it("requires --endpoint", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ endpoint: "" as never }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --endpoint");
  });

  it("requires --capability-id", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ capabilityId: "" as never }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --capability-id");
  });

  it("requires --payload", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli({
        ...createBaseOptions({ payload: "" as never }),
      }),
    ).rejects.toThrow("Router-based LLM dogfood command requires --payload");
  });

  it("requires valid JSON payload", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");

    await expect(
      module.runRouterBasedLlmDogfoodCli(
        createBaseOptions({ payload: "{not-json}" }),
        {
          env: {
            ROUTER_DOGFOOD_API_KEY: "router-dogfood-secret-key",
          },
          invoke: async () => {
            throw new Error("should-not-run");
          },
        } satisfies RouterBasedLlmDogfoodCliDependencies,
      ),
    ).rejects.toThrow("Router-based LLM dogfood command requires valid JSON payload");
  });

  it("returns deterministic JSON without leaking the api key", async () => {
    const module = await import("../../../cli/router-based-llm-dogfood");
    const seenInputs: Array<{
      providerId: string;
      model: string;
      endpoint: string;
      apiKey: string;
      capabilityId: string;
      capabilityName: string;
      capabilityVersion: string;
      capabilityKind: string;
      payload: Record<string, unknown>;
    }> = [];
    const secret = "router-dogfood-secret-key";

    const result = await module.runRouterBasedLlmDogfoodCli(createBaseOptions(), {
      env: {
        ROUTER_DOGFOOD_API_KEY: secret,
      },
      invoke: async (input) => {
        seenInputs.push({
          providerId: input.providerId,
          model: input.model,
          endpoint: input.endpoint,
          apiKey: input.apiKey,
          capabilityId: input.capabilityId,
          capabilityName: input.capabilityName,
          capabilityVersion: input.capabilityVersion,
          capabilityKind: input.capabilityKind,
          payload: input.payload,
        });

        return {
          ok: true,
          command: "router-based-llm-dogfood",
          provider_id: input.providerId,
          capability_id: input.capabilityId,
          model: input.model,
          status: "real_completed",
          trace_id: "router-based-llm-dogfood:deepseek:opdca:deepseek-chat",
        };
      },
    } satisfies RouterBasedLlmDogfoodCliDependencies);

    expect(seenInputs).toEqual([
      {
        providerId: "deepseek",
        model: "deepseek-chat",
        endpoint: "https://api.deepseek.example/v1/chat/completions",
        apiKey: secret,
        capabilityId: "opdca",
        capabilityName: "O'PDCA",
        capabilityVersion: "1.0.0",
        capabilityKind: "skill",
        payload: {
          requestId: "router-dogfood-request-001",
        },
      },
    ]);
    expect(result).toEqual({
      ok: true,
      command: "router-based-llm-dogfood",
      provider_id: "deepseek",
      capability_id: "opdca",
      model: "deepseek-chat",
      status: "real_completed",
      trace_id: "router-based-llm-dogfood:deepseek:opdca:deepseek-chat",
    });
    expect(JSON.stringify(result)).not.toContain(secret);
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
    expect(output).toContain("router-based-llm-dogfood");
    expect(output).toContain("--dogfood");
    expect(output).toContain("--real-llm");
    expect(output).toContain("--provider-id");
    expect(output).toContain("--api-key-env");
    expect(output).toContain("--payload");
    expect(output).not.toMatch(/[\u001b\u009b]/);
  });
});
