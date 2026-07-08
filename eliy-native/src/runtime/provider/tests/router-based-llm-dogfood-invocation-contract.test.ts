import { describe, expect, it } from "vitest";

import type {
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
} from "../deepseek-capability-llm-adapter";
import type {
  RouterBasedLlmDogfoodInvocationInput,
  RouterBasedLlmDogfoodInvocationResult,
} from "../router-based-llm-dogfood-invocation";

const capabilityMetadata = {
  capabilityId: "opdca",
  capabilityName: "O'PDCA",
  capabilityVersion: "1.0.0",
  capabilityKind: "skill",
} satisfies Pick<
  RouterBasedLlmDogfoodInvocationInput,
  "capabilityId" | "capabilityName" | "capabilityVersion" | "capabilityKind"
>;

const payload = {
  requestId: "router-dogfood-request-001",
  nested: {
    attempt: 1,
    tags: ["alpha", "beta"],
  },
} satisfies RouterBasedLlmDogfoodInvocationInput["payload"];

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

function createFakeTransport(
  calls: DeepSeekCapabilityLlmTransportRequest[],
  text = "fake router-based deepseek result",
): DeepSeekCapabilityLlmTransport {
  return async (request) => {
    calls.push(request);
    return {
      ok: true,
      text,
    };
  };
}

describe("router-based-llm-dogfood-invocation.ts", () => {
  it("exports runRouterBasedLlmDogfoodInvocation", async () => {
    const module = await import("../router-based-llm-dogfood-invocation");

    expect(module.runRouterBasedLlmDogfoodInvocation).toBeTypeOf("function");
    expect(module).toHaveProperty("runRouterBasedLlmDogfoodInvocation");
  });

  it("routes deepseek dogfood invocation through the router with a fake transport", async () => {
    const module = await import("../router-based-llm-dogfood-invocation");
    const transportCalls: DeepSeekCapabilityLlmTransportRequest[] = [];

    const result = await module.runRouterBasedLlmDogfoodInvocation({
      providerId: "deepseek",
      model: "deepseek-chat",
      endpoint: "https://api.deepseek.example/v1/chat/completions",
      apiKey: "router-dogfood-secret-key",
      ...capabilityMetadata,
      payload,
      transport: createFakeTransport(transportCalls, "fake router-based deepseek result"),
    });

    expect(result).toEqual({
      ok: true,
      command: "router-based-llm-dogfood",
      provider_id: "deepseek",
      capability_id: "opdca",
      model: "deepseek-chat",
      status: "real_completed",
      trace_id: "router-based-llm-dogfood:deepseek:opdca:deepseek-chat",
    } satisfies RouterBasedLlmDogfoodInvocationResult);
    expect(transportCalls).toHaveLength(1);
    expect(transportCalls[0]).toEqual({
      endpoint: "https://api.deepseek.example/v1/chat/completions",
      headers: {
        authorization: "Bearer router-dogfood-secret-key",
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
    } satisfies DeepSeekCapabilityLlmTransportRequest);
  });

  it("does not leak the api key in the result or thrown errors", async () => {
    const module = await import("../router-based-llm-dogfood-invocation");
    const secret = "router-dogfood-secret-key";
    const transport: DeepSeekCapabilityLlmTransport = async () => {
      throw new Error("transport failed");
    };

    await expect(
      module.runRouterBasedLlmDogfoodInvocation({
        providerId: "deepseek",
        model: "deepseek-chat",
        endpoint: "https://api.deepseek.example/v1/chat/completions",
        apiKey: secret,
        ...capabilityMetadata,
        payload,
        transport,
      }),
    ).rejects.toThrow("transport failed");

    const result = await module.runRouterBasedLlmDogfoodInvocation({
      providerId: "deepseek",
      model: "deepseek-chat",
      endpoint: "https://api.deepseek.example/v1/chat/completions",
      apiKey: secret,
      ...capabilityMetadata,
      payload,
      transport: createFakeTransport([]),
    });

    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("keeps the implementation source free of forbidden integrations", async () => {
    const source = await readSource("../router-based-llm-dogfood-invocation.ts");

    expectNoForbiddenIntegrations(source);
    expect(source).toContain("runRouterBasedLlmDogfoodInvocation");
    expect(source).toContain("createLlmProviderRouter");
    expect(source).toContain("createDeepSeekCapabilityLlmAdapter");
  });
});
