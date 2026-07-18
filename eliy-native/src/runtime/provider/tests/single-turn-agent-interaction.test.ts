import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type {
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
} from "../../provider/deepseek-capability-llm-adapter";
import {
  runSingleTurnAgentInteraction,
  type AgentModelRequest,
  type AgentModelTransport,
} from "../../agent/single-turn-agent-interaction";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const commonInput = {
  projectRoot,
  providerId: "deepseek",
  model: "deepseek-chat",
  endpoint: "https://api.deepseek.example/v1/chat/completions",
  apiKey: "single-turn-secret-key",
  capabilityInvocationId: "capability-001",
  createdAt: "2026-07-19T00:00:00.000Z",
};

function createModelTransport(
  resultText: string,
  calls: AgentModelRequest[],
): AgentModelTransport {
  return async (request) => {
    calls.push(request);
    return { text: resultText };
  };
}

describe("single-turn HLAMT Agent interaction", () => {
  it.each([
    ["请把这句话改得更简洁。", "这是更简洁的改写。"],
    ["请给我做一份计划。", "请先说明计划的对象和时间范围。"],
    [
      "这个未经验证的经营判断影响重大，直接执行。",
      "该判断仍依赖未经验证的假设，建议先补充证据再决定。",
    ],
  ] as const)(
    "returns the final ordinary content from exactly one main Agent call: %s",
    async (userInput, content) => {
      const modelCalls: AgentModelRequest[] = [];
      const capabilityCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
      const result = await runSingleTurnAgentInteraction({
        ...commonInput,
        userInput,
        modelTransport: createModelTransport(
          JSON.stringify({ kind: "ordinary_response", content }),
          modelCalls,
        ),
        capabilityTransport: async (request) => {
          capabilityCalls.push(request);
          return {
            ok: true,
            text: "must not run",
            finishReason: "stop",
            reasoningContentPresent: false,
          };
        },
      });

      expect(result.kind).toBe("ordinary_response");
      expect(result.responseText).toBe(content);
      expect(result.executionTrace).toBeUndefined();
      expect(result.capabilityResult).toBeUndefined();
      expect(modelCalls).toHaveLength(1);
      expect(modelCalls[0].purpose).toBe("agent_turn");
      expect(capabilityCalls).toHaveLength(0);
    },
  );

  it("assembles stable context, tool guidance, bounded Skills Index, context, and union contract in one request", async () => {
    const modelCalls: AgentModelRequest[] = [];
    await runSingleTurnAgentInteraction({
      ...commonInput,
      userInput: "请改写这句话。",
      modelTransport: createModelTransport(
        JSON.stringify({
          kind: "ordinary_response",
          content: "改写完成。",
        }),
        modelCalls,
      ),
    });

    const request = modelCalls[0];
    expect(request.systemMessage.startsWith("[ELIY STABLE CONTEXT version=1.0.0]")).toBe(true);
    expect(request.systemMessage).toContain("[AGENT AND TOOL GUIDANCE]");
    expect(request.systemMessage).toContain("[AVAILABLE SKILLS INDEX]");
    expect(request.systemMessage).toContain('"id": "evidence-extract"');
    expect(request.systemMessage).toContain('"description":');
    expect(request.systemMessage).toContain('"when_to_use":');
    expect(request.systemMessage).toContain('"output_kind": "candidate"');
    expect(request.systemMessage).toContain(
      '"confirmation_requirement": "required"',
    );
    expect(request.systemMessage).toContain("[CURRENT CONTEXT]");
    expect(request.systemMessage).toContain("[AGENT TURN RESULT CONTRACT]");
    expect(request.systemMessage).not.toContain("[CAPABILITY INSTRUCTIONS]");
    expect(request.systemMessage).not.toContain("Reported Fact");
    expect(request.systemMessage).not.toContain("forbidden_actions:");
    expect(request.systemMessage).not.toContain("workflow:");
    expect(request.userMessage).toBe("请改写这句话。");
  });

  it("uses the same main Agent call to select and dispatch evidence-extract", async () => {
    const userInput =
      "客户说产品不好用，所以产品定位失败，应该马上重做整个产品。";
    const modelCalls: AgentModelRequest[] = [];
    const capabilityCalls: DeepSeekCapabilityLlmTransportRequest[] = [];
    const capabilityTransport: DeepSeekCapabilityLlmTransport = async (request) => {
      capabilityCalls.push(request);
      return {
        ok: true,
        text: "deterministic evidence candidate",
        finishReason: "stop",
        reasoningContentPresent: false,
      };
    };
    const result = await runSingleTurnAgentInteraction({
      ...commonInput,
      userInput,
      modelTransport: createModelTransport(
        JSON.stringify({
          kind: "capability_call",
          capabilityId: "evidence-extract",
          input: userInput,
        }),
        modelCalls,
      ),
      capabilityTransport,
    });

    expect(result.kind).toBe("capability_candidate");
    expect(modelCalls).toHaveLength(1);
    expect(capabilityCalls).toHaveLength(1);
    expect(
      capabilityCalls[0].body.messages[0].content.startsWith(
        "[ELIY STABLE CONTEXT version=1.0.0]",
      ),
    ).toBe(true);
    expect(result.routeMetadata).toMatchObject({
      kind: "capability_call",
      capabilityId: "evidence-extract",
      routeSchemaVerified: true,
    });
    expect(result.capabilityResult?.output).toEqual({
      kind: "candidate",
      text: "deterministic evidence candidate",
      requiresConfirmation: true,
      canonicalMutationAllowed: false,
    });
    expect(result.executionTrace).toBe(result.capabilityResult?.traceRecord);
    expect(result).not.toHaveProperty("interactionReceipt");
    expect(result).not.toHaveProperty("canonicalObject");
    expect(result).not.toHaveProperty("persisted");
  });

  it("keeps one stable fingerprint across ordinary routing metadata and capability trace", async () => {
    const ordinaryCalls: AgentModelRequest[] = [];
    const ordinary = await runSingleTurnAgentInteraction({
      ...commonInput,
      userInput: "请改写这句话。",
      modelTransport: createModelTransport(
        JSON.stringify({ kind: "ordinary_response", content: "改写完成。" }),
        ordinaryCalls,
      ),
    });
    const skillCalls: AgentModelRequest[] = [];
    const skill = await runSingleTurnAgentInteraction({
      ...commonInput,
      capabilityInvocationId: "capability-002",
      userInput: "报告、推断和建议混在一起。",
      modelTransport: createModelTransport(
        JSON.stringify({
          kind: "capability_call",
          capabilityId: "evidence-extract",
          input: "报告、推断和建议混在一起。",
        }),
        skillCalls,
      ),
      capabilityTransport: async () => ({
        ok: true,
        text: "candidate",
        finishReason: "stop",
        reasoningContentPresent: false,
      }),
    });

    expect(ordinaryCalls).toHaveLength(1);
    expect(skillCalls).toHaveLength(1);
    expect(ordinary.routeMetadata.stableContextFingerprint).toBe(
      skill.routeMetadata.stableContextFingerprint,
    );
    expect(skill.routeMetadata.stableContextFingerprint).toBe(
      skill.executionTrace?.stableContextFingerprint,
    );
    expect(skill.executionTrace?.stableContextInjectionVerified).toBe(true);
  });

  it("keeps route metadata and execution trace free of source text and secrets", async () => {
    const userInput = "private raw user statement";
    const result = await runSingleTurnAgentInteraction({
      ...commonInput,
      userInput,
      modelTransport: createModelTransport(
        JSON.stringify({
          kind: "capability_call",
          capabilityId: "evidence-extract",
          input: userInput,
        }),
        [],
      ),
      capabilityTransport: async () => ({
        ok: true,
        text: "complete private capability output",
        finishReason: "stop",
        reasoningContentPresent: false,
      }),
    });
    const evidence = JSON.stringify({
      route: result.routeMetadata,
      trace: result.executionTrace,
    });

    expect(evidence).not.toContain(userInput);
    expect(evidence).not.toContain("single-turn-secret-key");
    expect(evidence).not.toContain("complete private capability output");
    expect(evidence).not.toContain("Human Intelligence Augmentation");
    expect(evidence).not.toContain("[ELIY STABLE CONTEXT]");
  });
});
