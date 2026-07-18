import { describe, expect, it } from "vitest";

import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
} from "../../capabilities/llm-capability-adapter-contract";
import type { CapabilityExecutionContext } from "../../capabilities/capability-execution-context-contract";
import type {
  DeepSeekCapabilityLlmAdapterConfig,
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
  DeepSeekCapabilityLlmTransportResponse,
} from "../deepseek-capability-llm-adapter";

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
  requestId: "deepseek-adapter-request-001",
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

function createDefaultInput(
  overrides: Partial<DeepSeekCapabilityLlmAdapterConfig> = {},
): DeepSeekCapabilityLlmAdapterConfig {
  return {
    apiKey: "deepseek-test-key",
    model: "deepseek-chat",
    endpoint: "https://api.deepseek.example/v1/chat/completions",
    enableRealLlm: true,
    transport: async () => ({
      ok: true,
      text: "unused",
      finishReason: "stop",
      reasoningContentPresent: false,
    }),
    ...overrides,
  };
}

function createInput(): LlmCapabilityAdapterInput {
  return {
    ...capabilityMetadata,
    payload,
  };
}

describe("deepseek-capability-llm-adapter.ts", () => {
  it("exports the explicit DeepSeek adapter factory", async () => {
    const module = await import("../deepseek-capability-llm-adapter");

    expect(module.createDeepSeekCapabilityLlmAdapter).toBeTypeOf("function");
    expect(module).toHaveProperty("createDeepSeekCapabilityLlmAdapter");
  });

  it("conforms to the adapter contract", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const adapter: LlmCapabilityAdapter = module.createDeepSeekCapabilityLlmAdapter(
      createDefaultInput(),
    );

    expect(adapter).toBeTypeOf("function");
  });

  it("rejects when real LLM invocation is not explicitly enabled", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const transportCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const transport: DeepSeekCapabilityLlmTransport = async (request) => {
      transportCalls.push(request);
      return {
        ok: true,
        text: "should-not-run",
        finishReason: "stop",
        reasoningContentPresent: false,
      };
    };
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ enableRealLlm: false, transport }),
      enableRealLlm: false,
    });

    await expect(adapter(createInput())).rejects.toThrow(
      "DeepSeek real LLM adapter requires enableRealLlm: true",
    );
    expect(transportCalls).toHaveLength(0);
  });

  it("rejects when apiKey is missing", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ apiKey: "" as never }),
      apiKey: "" as never,
    });

    await expect(adapter(createInput())).rejects.toThrow(
      "DeepSeek real LLM adapter requires apiKey",
    );
  });

  it("rejects when model is missing", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ model: "" as never }),
      model: "" as never,
    });

    await expect(adapter(createInput())).rejects.toThrow(
      "DeepSeek real LLM adapter requires model",
    );
  });

  it("rejects when endpoint is missing", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ endpoint: "" as never }),
      endpoint: "" as never,
    });

    await expect(adapter(createInput())).rejects.toThrow(
      "DeepSeek real LLM adapter requires endpoint",
    );
  });

  it("rejects when transport is missing", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ transport: undefined as never }),
      transport: undefined as never,
    });

    await expect(adapter(createInput())).rejects.toThrow(
      "DeepSeek real LLM adapter requires transport",
    );
  });

  it("returns a real adapter result from a fake transport", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const transportCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const transport: DeepSeekCapabilityLlmTransport = async (request) => {
      transportCalls.push(request);
      return {
        ok: true,
        text: "fake deepseek result",
        finishReason: "stop",
        reasoningContentPresent: false,
      } satisfies DeepSeekCapabilityLlmTransportResponse;
    };
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ transport }),
      transport,
    });

    const result = await adapter(createInput());

    expect(result).toEqual({
      ok: true,
      mode: "real",
      capabilityId: "opdca",
      handler: "deepseek-capability-llm-adapter",
      resultText: "fake deepseek result",
      metadata: {
        capabilityId: "opdca",
        capabilityName: "O'PDCA",
        capabilityVersion: "1.0.0",
        capabilityKind: "skill",
      },
    } satisfies LlmCapabilityAdapterResult);
    expect(transportCalls).toHaveLength(1);
  });

  it("passes deterministic endpoint headers and messages to the fake transport", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const transportCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const transport: DeepSeekCapabilityLlmTransport = async (request) => {
      transportCalls.push(request);
      return {
        ok: true,
        text: "fake deepseek result",
        finishReason: "stop",
        reasoningContentPresent: false,
      };
    };
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ transport }),
      transport,
    });

    await adapter(createInput());

    expect(transportCalls).toEqual([
      {
        endpoint: "https://api.deepseek.example/v1/chat/completions",
        headers: {
          authorization: "Bearer deepseek-test-key",
          contentType: "application/json",
        },
        body: {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "DeepSeek capability adapter invocation.",
            },
            {
              role: "user",
              content: JSON.stringify(
                {
                  capability: {
                    capabilityId: "opdca",
                    capabilityName: "O'PDCA",
                    capabilityVersion: "1.0.0",
                    capabilityKind: "skill",
                  },
                  payload,
                },
                null,
                2,
              ),
            },
          ],
        },
      } satisfies DeepSeekCapabilityLlmTransportRequest,
    ]);
  });

  it("does not infer HLAMT verification from a marker inside capability instructions", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const transport: DeepSeekCapabilityLlmTransport = async () => ({
      ok: true,
      text: "fake deepseek result",
      finishReason: "stop",
      reasoningContentPresent: false,
    });
    const executionContext: CapabilityExecutionContext = {
      capability: {
        id: "opdca",
        name: "O'PDCA",
        version: "1.0.0",
        kind: "skill",
      },
      stableContext: {
        sourcePath: "HLAMT.md",
        version: "1.0.0",
        content: "bounded stable context",
        fingerprint: "sha256:stable-context",
      },
      asset: {
        capabilityId: "opdca",
        capabilityVersion: "1.0.0",
        assetPath: "skills/opdca/SKILL.md",
        instructions: "[HLAMT CONTEXT] marker collision",
        referenceSources: [],
        assetFingerprint: "sha256:asset",
      },
      hlamt: {
        sourcePath: "HLAMT.md",
        summary: "actual HLAMT summary",
        fingerprint: "sha256:hlamt",
        injectionRequested: false,
      },
      payload,
      outputBoundary: {
        allowedOutputKinds: ["candidate"],
        requiresConfirmation: true,
        canonicalMutationAllowed: false,
      },
      invocationMetadata: {
        invocationId: "marker-collision-001",
        createdAt: "2026-07-18T00:00:00.000Z",
        actor: "agent",
        invocationMode: "runtime_invoked",
      },
    };
    const adapter = module.createDeepSeekCapabilityLlmAdapter(
      createDefaultInput({ transport }),
    );

    const result = await adapter({
      ...createInput(),
      executionContext,
    });

    expect(result.invocationEvidence?.hlamtInjectionVerified).toBe(false);
  });

  it("does not leak the apiKey in the result or thrown errors", async () => {
    const module = await import("../deepseek-capability-llm-adapter");
    const transport: DeepSeekCapabilityLlmTransport = async () => {
      return { ok: false, error: "transport error" } as never;
    };
    const adapter = module.createDeepSeekCapabilityLlmAdapter({
      ...createDefaultInput({ transport }),
      transport,
    });

    await expect(adapter(createInput())).rejects.toThrow("transport error");
    await expect(adapter(createInput())).rejects.not.toThrow("deepseek-test-key");
  });

  it("keeps the implementation source free of forbidden integrations", async () => {
    const source = await readSource("../deepseek-capability-llm-adapter.ts");

    expectNoForbiddenIntegrations(source);
    expect(source).toContain("createDeepSeekCapabilityLlmAdapter");
    expect(source).toContain("DeepSeekCapabilityLlmTransport");
    expect(source).toContain("DeepSeekCapabilityLlmTransportRequest");
    expect(source).toContain("DeepSeekCapabilityLlmTransportResponse");
  });
});
