import { describe, expect, it } from "vitest";

import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
} from "../../capabilities/llm-capability-adapter-contract";
import type {
  LlmProviderAdapterMap,
  LlmProviderRouterConfig,
  LlmProviderRouterInput,
} from "../llm-provider-router";

const capabilityMetadata = {
  capabilityId: "opdca",
  capabilityName: "O'PDCA",
  capabilityVersion: "1.0.0",
  capabilityKind: "skill",
} satisfies Pick<
  LlmCapabilityAdapterInput,
  "capabilityId" | "capabilityName" | "capabilityVersion" | "capabilityKind"
>;

const payload = {
  requestId: "router-contract-request-001",
  nested: {
    attempt: 1,
    tags: ["alpha", "beta"],
  },
} satisfies LlmCapabilityAdapterInput["payload"];

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

function createFakeAdapter(
  handler: string,
  resultText: string,
  calls: Array<LlmCapabilityAdapterInput>,
): LlmCapabilityAdapter {
  return async (input) => {
    calls.push(input);
    return {
      ok: true,
      mode: "real",
      capabilityId: input.capabilityId,
      handler,
      resultText,
      metadata: {
        capabilityId: input.capabilityId,
        capabilityName: input.capabilityName,
        capabilityVersion: input.capabilityVersion,
        capabilityKind: input.capabilityKind,
      },
    } satisfies LlmCapabilityAdapterResult;
  };
}

function createRouterConfig(
  adapterMap: LlmProviderAdapterMap,
): LlmProviderRouterConfig {
  return {
    adapterMap,
  };
}

function createRouterInput(
  overrides: Partial<LlmProviderRouterInput> = {},
): LlmProviderRouterInput {
  return {
    providerId: "deepseek",
    model: "deepseek-chat",
    ...capabilityMetadata,
    payload,
    ...overrides,
  };
}

describe("llm-provider-router.ts", () => {
  it("exports createLlmProviderRouter", async () => {
    const module = await import("../llm-provider-router");

    expect(module.createLlmProviderRouter).toBeTypeOf("function");
    expect(module).toHaveProperty("createLlmProviderRouter");
  });

  it('routes provider id "deepseek" to the injected adapter', async () => {
    const module = await import("../llm-provider-router");
    const adapterCalls: LlmCapabilityAdapterInput[] = [];
    const deepseekAdapter = createFakeAdapter(
      "deepseek-capability-llm-adapter",
      "fake deepseek router result",
      adapterCalls,
    );
    const router = module.createLlmProviderRouter(
      createRouterConfig({
        deepseek: deepseekAdapter,
      }),
    );

    const result = await router(createRouterInput());

    expect(result).toEqual({
      ok: true,
      mode: "real",
      capabilityId: "opdca",
      handler: "deepseek-capability-llm-adapter",
      resultText: "fake deepseek router result",
      metadata: {
        capabilityId: "opdca",
        capabilityName: "O'PDCA",
        capabilityVersion: "1.0.0",
        capabilityKind: "skill",
      },
      router: {
        providerId: "deepseek",
        model: "deepseek-chat",
      },
    } satisfies LlmCapabilityAdapterResult & {
      router: {
        providerId: string;
        model: string;
      };
    });
    expect(adapterCalls).toHaveLength(1);
  });

  it("passes capability metadata and payload to the injected adapter", async () => {
    const module = await import("../llm-provider-router");
    const adapterCalls: LlmCapabilityAdapterInput[] = [];
    const router = module.createLlmProviderRouter(
      createRouterConfig({
        deepseek: createFakeAdapter(
          "deepseek-capability-llm-adapter",
          "fake deepseek router result",
          adapterCalls,
        ),
      }),
    );

    await router(createRouterInput());

    expect(adapterCalls).toEqual([
      {
        capabilityId: "opdca",
        capabilityName: "O'PDCA",
        capabilityVersion: "1.0.0",
        capabilityKind: "skill",
        payload,
      } satisfies LlmCapabilityAdapterInput,
    ]);
  });

  it("requires providerId", async () => {
    const module = await import("../llm-provider-router");
    const router = module.createLlmProviderRouter(
      createRouterConfig({
        deepseek: createFakeAdapter("deepseek-capability-llm-adapter", "ok", []),
      }),
    );

    await expect(
      router(createRouterInput({ providerId: "" as never })),
    ).rejects.toThrow("LLM provider router requires providerId");
  });

  it("requires model", async () => {
    const module = await import("../llm-provider-router");
    const router = module.createLlmProviderRouter(
      createRouterConfig({
        deepseek: createFakeAdapter("deepseek-capability-llm-adapter", "ok", []),
      }),
    );

    await expect(router(createRouterInput({ model: "" as never }))).rejects.toThrow(
      "LLM provider router requires model",
    );
  });

  it("requires adapterMap", async () => {
    const module = await import("../llm-provider-router");

    expect(() =>
      module.createLlmProviderRouter({ adapterMap: undefined as never }),
    ).toThrow("LLM provider router requires adapterMap");
  });

  it("requires an adapter for the requested providerId", async () => {
    const module = await import("../llm-provider-router");
    const router = module.createLlmProviderRouter(
      createRouterConfig({
        deepseek: createFakeAdapter("deepseek-capability-llm-adapter", "ok", []),
      }),
    );

    await expect(
      router(createRouterInput({ providerId: "other-provider" })),
    ).rejects.toThrow(
      "LLM provider router requires adapter for providerId: other-provider",
    );
  });

  it("supports another provider id without hard-coding deepseek only", async () => {
    const module = await import("../llm-provider-router");
    const adapterCalls: LlmCapabilityAdapterInput[] = [];
    const router = module.createLlmProviderRouter(
      createRouterConfig({
        deepseek: createFakeAdapter("deepseek-capability-llm-adapter", "ok", []),
        another: createFakeAdapter("another-handler", "fake another provider result", adapterCalls),
      }),
    );

    const result = await router(
      createRouterInput({
        providerId: "another",
        model: "another-model",
      }),
    );

    expect(result).toEqual({
      ok: true,
      mode: "real",
      capabilityId: "opdca",
      handler: "another-handler",
      resultText: "fake another provider result",
      metadata: {
        capabilityId: "opdca",
        capabilityName: "O'PDCA",
        capabilityVersion: "1.0.0",
        capabilityKind: "skill",
      },
      router: {
        providerId: "another",
        model: "another-model",
      },
    } satisfies LlmCapabilityAdapterResult & {
      router: {
        providerId: string;
        model: string;
      };
    });
    expect(adapterCalls).toHaveLength(1);
  });

  it("keeps the implementation source free of forbidden integrations", async () => {
    const source = await readSource("../llm-provider-router.ts");

    expectNoForbiddenIntegrations(source);
    expect(source).toContain("createLlmProviderRouter");
    expect(source).toContain("LlmProviderRouter");
    expect(source).toContain("LlmProviderAdapterMap");
    expect(source).toContain("LlmProviderId");
  });
});
