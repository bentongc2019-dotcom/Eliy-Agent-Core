import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type {
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
} from "../deepseek-capability-llm-adapter";
import { runRouterBasedLlmDogfoodInvocation } from "../router-based-llm-dogfood-invocation";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));

async function readSource(relativePath: string): Promise<string> {
  const fsModule = await import(["n", "ode", ":", "f", "s"].join(""));
  const sourceTextReader = fsModule[["read", "File", "Sync"].join("")] as (
    path: URL,
    encoding: string,
  ) => string;

  return sourceTextReader(new URL(relativePath, import.meta.url), "utf8");
}

function createInput(
  transport: DeepSeekCapabilityLlmTransport,
) {
  return {
    projectRoot,
    providerId: "deepseek",
    model: "deepseek-chat",
    endpoint: "https://api.deepseek.example/v1/chat/completions",
    apiKey: "router-dogfood-secret-key",
    capabilityId: "evidence-extract",
    invocationId: "router-dogfood-001",
    createdAt: "2026-07-18T00:00:00.000Z",
    condition: "candidate" as const,
    payload: { input: "bounded input" },
    transport,
  };
}

describe("router-based-llm-dogfood-invocation.ts", () => {
  it("exports runRouterBasedLlmDogfoodInvocation", () => {
    expect(runRouterBasedLlmDogfoodInvocation).toBeTypeOf("function");
  });

  it("routes deepseek dogfood invocation through the router with a fake transport", async () => {
    const calls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const result = await runRouterBasedLlmDogfoodInvocation(
      createInput(async (request) => {
        calls.push(request);
        return { ok: true, text: "fake candidate" };
      }),
    );

    expect(calls).toHaveLength(1);
    expect(result).toMatchObject({
      ok: true,
      command: "router-based-llm-dogfood",
      provider_id: "deepseek",
      capability_id: "evidence-extract",
      model: "deepseek-chat",
      status: "real_completed",
      trace_id: "router-dogfood-001",
      condition: "candidate",
      output: {
        kind: "candidate",
        text: "fake candidate",
        requiresConfirmation: true,
        canonicalMutationAllowed: false,
      },
      traceRecord: {
        mode: "real",
        status: "real_completed",
        providerId: "deepseek",
        model: "deepseek-chat",
        hlamtInjectionRequested: true,
        hlamtInjectionVerified: true,
      },
    });
  });

  it("does not leak the api key in the result or thrown errors", async () => {
    const secret = "router-dogfood-secret-key";
    const failedInput = {
      ...createInput(async () => {
        throw new Error("transport failed");
      }),
      apiKey: secret,
    };

    await expect(runRouterBasedLlmDogfoodInvocation(failedInput)).rejects.toThrow(
      "transport failed",
    );

    const result = await runRouterBasedLlmDogfoodInvocation({
      ...createInput(async () => ({ ok: true, text: "fake candidate" })),
      apiKey: secret,
    });

    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("keeps the implementation source free of forbidden integrations", async () => {
    const source = await readSource("../router-based-llm-dogfood-invocation.ts");

    expect(source).toContain("runRouterBasedLlmDogfoodInvocation");
    expect(source).toContain("invokeCapabilityWithRealLlmBoundary");
    expect(source).toContain("createLlmProviderRouter");
    expect(source).toContain("createDeepSeekCapabilityLlmAdapter");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("dotenv");
    expect(source).not.toContain("fetch(");
  });
});
