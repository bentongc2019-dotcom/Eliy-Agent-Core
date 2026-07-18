import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { evidenceExtractCapabilityManifest } from "../../../../skills/evidence-extract/evidence-extract-capability-manifest";
import { assembleCapabilityExecutionContext } from "../../capabilities/capability-execution-context-implementation";
import type {
  DeepSeekCapabilityFinishReason,
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
  DeepSeekCapabilityLlmTransportResponseSuccess,
} from "../deepseek-capability-llm-adapter";
import {
  createDeepSeekCapabilityLlmAdapter,
  parseDeepSeekCapabilityLlmTransportResponse,
} from "../deepseek-capability-llm-adapter";
import { runRouterBasedLlmDogfoodInvocation } from "../router-based-llm-dogfood-invocation";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const payload = { input: "bounded evidence input" };

function createTransportSuccess(
  overrides: Partial<DeepSeekCapabilityLlmTransportResponseSuccess> = {},
): DeepSeekCapabilityLlmTransportResponseSuccess {
  return {
    ok: true,
    text: "evidence candidate",
    finishReason: "stop",
    reasoningContentPresent: false,
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    ...overrides,
  };
}

function createContext() {
  return assembleCapabilityExecutionContext({
    projectRoot,
    manifest: evidenceExtractCapabilityManifest,
    payload,
    invocationId: "empty-output-boundary-001",
    createdAt: "2026-07-19T00:00:00.000Z",
    actor: "agent",
    hlamtInjectionRequested: true,
  });
}

function createAdapter(
  transport: DeepSeekCapabilityLlmTransport,
  thinkingMode: "disabled" | undefined = "disabled",
) {
  return createDeepSeekCapabilityLlmAdapter({
    apiKey: "deepseek-test-key",
    model: "deepseek-v4-flash",
    endpoint: "https://api.deepseek.example/chat/completions",
    enableRealLlm: true,
    transport,
    thinkingMode,
  });
}

function createInput() {
  return {
    capabilityId: "evidence-extract",
    capabilityName: "Evidence Extract",
    capabilityVersion: "1.0.0",
    capabilityKind: "skill" as const,
    payload,
    executionContext: createContext(),
  };
}

describe("DeepSeek capability empty-output boundary", () => {
  it("parses complete provider termination metadata without retaining reasoning text", () => {
    const hiddenReasoning = "private-chain-of-thought";
    const response = parseDeepSeekCapabilityLlmTransportResponse(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: "bounded answer",
              reasoning_content: hiddenReasoning,
            },
          },
        ],
        usage: {
          prompt_tokens: 21,
          completion_tokens: 13,
          total_tokens: 34,
          prompt_cache_hit_tokens: 8,
          prompt_cache_miss_tokens: 13,
        },
      }),
    );

    expect(response).toEqual({
      ok: true,
      text: "bounded answer",
      finishReason: "stop",
      reasoningContentPresent: true,
      reasoningContentLength: hiddenReasoning.length,
      usage: {
        promptTokens: 21,
        completionTokens: 13,
        totalTokens: 34,
        promptCacheHitTokens: 8,
        promptCacheMissTokens: 13,
      },
    });
    expect(JSON.stringify(response)).not.toContain(hiddenReasoning);
  });

  it("rejects an unknown provider finish_reason", () => {
    expect(() =>
      parseDeepSeekCapabilityLlmTransportResponse(
        JSON.stringify({
          choices: [
            {
              finish_reason: "future_unknown_reason",
              message: { content: "answer" },
            },
          ],
          usage: {},
        }),
      ),
    ).toThrow("provider_finish_reason_invalid");
  });

  it("sends thinking.type=disabled on the evidence-extract Skill request", async () => {
    const requests: DeepSeekCapabilityLlmTransportRequest[] = [];
    const adapter = createAdapter(async (request) => {
      requests.push(request);
      return createTransportSuccess();
    });

    await adapter(createInput());

    expect(requests).toHaveLength(1);
    expect(requests[0]?.body.thinking).toEqual({ type: "disabled" });
  });

  it("accepts finish_reason=stop with non-empty final content", async () => {
    const adapter = createAdapter(async () => createTransportSuccess());

    const result = await adapter(createInput());

    expect(result.resultText).toBe("evidence candidate");
    expect(result.invocationEvidence).toMatchObject({
      thinkingMode: "disabled",
      finishReason: "stop",
      contentPresent: true,
      contentLength: 18,
      reasoningContentPresent: false,
    });
  });

  it.each([
    ["stop", "provider_output_empty"],
    ["length", "provider_output_truncated"],
    ["content_filter", "provider_output_filtered"],
    [
      "insufficient_system_resource",
      "provider_output_resource_interrupted",
    ],
  ] satisfies Array<[DeepSeekCapabilityFinishReason, string]>) (
    "rejects empty final content for finish_reason=%s as %s",
    async (finishReason, errorCode) => {
      const adapter = createAdapter(async () =>
        createTransportSuccess({ text: "", finishReason }),
      );

      await expect(adapter(createInput())).rejects.toThrow(errorCode);
    },
  );

  it("rejects whitespace-only final content", async () => {
    const adapter = createAdapter(async () =>
      createTransportSuccess({ text: " \n\t " }),
    );

    await expect(adapter(createInput())).rejects.toThrow(
      "provider_output_empty",
    );
  });

  it.each([
    ["length", "partial answer", "provider_output_truncated"],
    ["content_filter", "partial answer", "provider_output_filtered"],
    [
      "insufficient_system_resource",
      "partial answer",
      "provider_output_resource_interrupted",
    ],
  ] satisfies Array<[DeepSeekCapabilityFinishReason, string, string]>) (
    "rejects unusable finish_reason=%s even when partial content exists",
    async (finishReason, text, errorCode) => {
      const adapter = createAdapter(async () =>
        createTransportSuccess({ text, finishReason }),
      );

      await expect(adapter(createInput())).rejects.toThrow(errorCode);
    },
  );

  it("does not substitute reasoning content for an empty final answer", async () => {
    const adapter = createAdapter(async () =>
      createTransportSuccess({
        text: null,
        reasoningContentPresent: true,
        reasoningContentLength: 37,
      }),
    );

    await expect(adapter(createInput())).rejects.toThrow(
      "provider_output_empty",
    );
  });

  it("records bounded provider diagnostics without reasoning content", async () => {
    const secretReasoning = "hidden-reasoning-must-not-be-persisted";
    const result = await runRouterBasedLlmDogfoodInvocation({
      projectRoot,
      providerId: "deepseek",
      model: "deepseek-v4-flash",
      endpoint: "https://api.deepseek.example/chat/completions",
      apiKey: "deepseek-test-key",
      capabilityId: "evidence-extract",
      invocationId: "empty-output-trace-001",
      createdAt: "2026-07-19T00:00:00.000Z",
      condition: "candidate",
      payload,
      transport: async () =>
        createTransportSuccess({
          reasoningContentPresent: true,
          reasoningContentLength: secretReasoning.length,
        }),
    });

    expect(result.traceRecord).toMatchObject({
      thinkingMode: "disabled",
      finishReason: "stop",
      contentPresent: true,
      contentLength: 18,
      reasoningContentPresent: true,
      reasoningContentLength: secretReasoning.length,
      providerUsage: {
        prompt: 100,
        completion: 50,
        total: 150,
      },
    });
    expect(JSON.stringify(result.traceRecord)).not.toContain(secretReasoning);
    expect(result.traceRecord).not.toHaveProperty("reasoningContent");
  });
});
