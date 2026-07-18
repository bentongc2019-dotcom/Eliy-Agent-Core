import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type {
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
} from "../deepseek-capability-llm-adapter";
import { runRouterBasedLlmDogfoodInvocation } from "../router-based-llm-dogfood-invocation";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const frozenInput =
  "客户说产品不好用，所以产品定位失败，应该马上重做整个产品。";

function createTransport(
  calls: DeepSeekCapabilityLlmTransportRequest[],
): DeepSeekCapabilityLlmTransport {
  return async (request) => {
    calls.push(request);
    return {
      ok: true,
      text: "deterministic fake candidate",
    };
  };
}

function removeHlamtBlock(message: string): string {
  return message.replace(/\n\n\[HLAMT CONTEXT\]\n[\s\S]*?\n\[\/HLAMT CONTEXT\]/, "");
}

describe("HLAMT Skill Application vertical proof", () => {
  it("runs baseline and candidate through one formal chain with only the HLAMT block changed", async () => {
    const baselineCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const candidateCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const common = {
      projectRoot,
      providerId: "deepseek",
      model: "deepseek-chat",
      endpoint: "https://api.deepseek.example/v1/chat/completions",
      apiKey: "proof-secret-key",
      capabilityId: "evidence-extract",
      createdAt: "2026-07-18T00:00:00.000Z",
      payload: { input: frozenInput },
    };

    const baseline = await runRouterBasedLlmDogfoodInvocation({
      ...common,
      invocationId: "hlamt-proof-baseline-001",
      condition: "baseline",
      transport: createTransport(baselineCalls),
    });
    const candidate = await runRouterBasedLlmDogfoodInvocation({
      ...common,
      invocationId: "hlamt-proof-candidate-001",
      condition: "candidate",
      transport: createTransport(candidateCalls),
    });

    expect(baselineCalls).toHaveLength(1);
    expect(candidateCalls).toHaveLength(1);

    const baselineRequest = baselineCalls[0];
    const candidateRequest = candidateCalls[0];
    const baselineSystem = baselineRequest.body.messages[0].content;
    const candidateSystem = candidateRequest.body.messages[0].content;

    expect(baselineSystem).not.toContain("[HLAMT CONTEXT]");
    expect(candidateSystem).toContain("[HLAMT CONTEXT]");
    expect(candidateSystem).toContain("Epistemic Clarity");
    expect(removeHlamtBlock(candidateSystem)).toBe(baselineSystem);
    expect(candidateRequest.body.messages[1]).toEqual(
      baselineRequest.body.messages[1],
    );
    expect({ ...candidateRequest, body: { ...candidateRequest.body, messages: [] } }).toEqual(
      { ...baselineRequest, body: { ...baselineRequest.body, messages: [] } },
    );

    expect(baseline.traceRecord.assetFingerprint).toBe(
      candidate.traceRecord.assetFingerprint,
    );
    expect(baseline.traceRecord.hlamtFingerprint).toBe(
      candidate.traceRecord.hlamtFingerprint,
    );
    expect(baseline.traceRecord.hlamtInjectionRequested).toBe(false);
    expect(baseline.traceRecord.hlamtInjectionVerified).toBe(false);
    expect(candidate.traceRecord.hlamtInjectionRequested).toBe(true);
    expect(candidate.traceRecord.hlamtInjectionVerified).toBe(true);

    expect(candidate.output).toEqual({
      kind: "candidate",
      text: "deterministic fake candidate",
      requiresConfirmation: true,
      canonicalMutationAllowed: false,
    });
    expect(JSON.stringify(candidate.traceRecord)).not.toContain(frozenInput);
    expect(JSON.stringify(candidate.traceRecord)).not.toContain("proof-secret-key");
    expect(JSON.stringify(candidate.traceRecord)).not.toContain("Reported Fact");
    expect(JSON.stringify(candidate.traceRecord)).not.toContain("Epistemic Clarity");
    expect(JSON.stringify(candidateRequest.body)).not.toContain("proof-secret-key");
    expect(JSON.stringify(candidateRequest.body)).not.toContain("sha256:");
    expect(JSON.stringify(candidateRequest.body)).not.toContain("HLAMT.md");
    expect(JSON.stringify(candidateRequest.body)).not.toContain(
      "hlamt-proof-candidate-001",
    );
    expect(candidate.traceRecord).not.toHaveProperty("applied");
    expect(candidate.traceRecord).not.toHaveProperty("enforced");
  });

  it("rejects an unsupported capability before transport", async () => {
    const calls: DeepSeekCapabilityLlmTransportRequest[] = [];

    await expect(
      runRouterBasedLlmDogfoodInvocation({
        projectRoot,
        providerId: "deepseek",
        model: "deepseek-chat",
        endpoint: "https://api.deepseek.example/v1/chat/completions",
        apiKey: "proof-secret-key",
        capabilityId: "forged-capability",
        invocationId: "hlamt-proof-forged-001",
        createdAt: "2026-07-18T00:00:00.000Z",
        condition: "candidate",
        payload: { input: frozenInput },
        transport: createTransport(calls),
      }),
    ).rejects.toThrow("Capability not available for dogfood: forged-capability");

    expect(calls).toHaveLength(0);
  });
});
