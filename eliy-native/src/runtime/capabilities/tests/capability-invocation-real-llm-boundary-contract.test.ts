import { describe, expect, it } from "vitest";

import {
  createCapabilityInvocationTraceRecord,
} from "../capability-invocation-trace-record";
import {
  invokeMockCapability,
  type MockCapabilityInvocationPayload,
} from "../capability-invocation-mock-execution";
import {
  invokeCapabilityWithRealLlmBoundary,
  type CapabilityInvocationBoundaryInput,
  type CapabilityInvocationBoundaryResult,
  type RealLlmCapabilityInvocationAdapter,
  type RealLlmCapabilityInvocationResult,
} from "../capability-invocation-real-llm-boundary";

const capabilityId = "opdca";
const createdAt = "2026-07-08T00:00:00.000Z";

const payload = {
  requestId: "real-boundary-request-001",
  nested: {
    attempt: 1,
    tags: ["alpha", "beta"],
  },
} satisfies MockCapabilityInvocationPayload;

function createDefaultInput(): CapabilityInvocationBoundaryInput {
  return {
    invocationId: "invocation-001",
    capabilityId,
    payload,
    createdAt,
  };
}

function expectMockBoundaryResultShape(
  result: Extract<CapabilityInvocationBoundaryResult, { mode: "mock" }>,
) {
  expect(result.ok).toBe(true);
  expect(result.mockResult).toEqual(invokeMockCapability(capabilityId, payload));
  expect(result.traceRecord).toEqual(
    createCapabilityInvocationTraceRecord({
      invocationId: "invocation-001",
      capabilityId,
      result: result.mockResult,
      createdAt,
    }),
  );
}

function assertMockBoundaryResult(
  result: CapabilityInvocationBoundaryResult,
): asserts result is Extract<CapabilityInvocationBoundaryResult, { mode: "mock" }> {
  expect(result.mode).toBe("mock");
}

describe("capability-invocation-real-llm-boundary.ts", () => {
  it("exports the real LLM boundary API", () => {
    expect(invokeCapabilityWithRealLlmBoundary).toBeTypeOf("function");
  });

  it("defaults to mock mode when no real flag is provided", async () => {
    const result = await invokeCapabilityWithRealLlmBoundary(createDefaultInput());

    assertMockBoundaryResult(result);
    expectMockBoundaryResultShape(result);
  });

  it("reuses the PR #75 mock invocation result and the PR #76 trace record", async () => {
    const result = await invokeCapabilityWithRealLlmBoundary(createDefaultInput());

    assertMockBoundaryResult(result);
    const expectedMockResult = invokeMockCapability(capabilityId, payload);
    const expectedTraceRecord = createCapabilityInvocationTraceRecord({
      invocationId: "invocation-001",
      capabilityId,
      result: expectedMockResult,
      createdAt,
    });

    expect(result).toEqual({
      ok: true,
      mode: "mock",
      mockResult: expectedMockResult,
      traceRecord: expectedTraceRecord,
    });
  });

  it("rejects real mode when enableRealLlm is not true", async () => {
    await expect(
      invokeCapabilityWithRealLlmBoundary({
        ...createDefaultInput(),
        mode: "real",
      }),
    ).rejects.toThrow("real mode requires enableRealLlm: true");
  });

  it("rejects real mode when the adapter is missing", async () => {
    await expect(
      invokeCapabilityWithRealLlmBoundary({
        ...createDefaultInput(),
        mode: "real",
        enableRealLlm: true,
      }),
    ).rejects.toThrow("real mode requires a realLlmAdapter");
  });

  it("accepts a local fake adapter and returns a deterministic real mode result", async () => {
    const adapterCalls: Array<Readonly<{
      invocationId: string;
      capabilityId: string;
      payload: MockCapabilityInvocationPayload;
      createdAt: string;
    }>> = [];

    const realLlmAdapter: RealLlmCapabilityInvocationAdapter = async (
      adapterInput,
    ): Promise<RealLlmCapabilityInvocationResult> => {
      adapterCalls.push(adapterInput);

      return {
        ok: true,
        mode: "real",
        capabilityId: adapterInput.capabilityId,
        resultText: [
          "local-fake-real-result",
          adapterInput.capabilityId,
          adapterInput.payload.requestId,
        ].join(":"),
        handler: "local-fake-adapter:v1",
        traceRecordCompatible: true,
      };
    };

    const input: CapabilityInvocationBoundaryInput = {
      ...createDefaultInput(),
      mode: "real",
      enableRealLlm: true,
      realLlmAdapter,
    };

    const first = await invokeCapabilityWithRealLlmBoundary(input);
    const second = await invokeCapabilityWithRealLlmBoundary(input);

    expect(first).toEqual(second);
    expect(adapterCalls).toHaveLength(2);
    expect(adapterCalls[0]).toEqual(adapterCalls[1]);
    expect(first).toEqual({
      ok: true,
      mode: "real",
      capabilityId,
      resultText: "local-fake-real-result:opdca:real-boundary-request-001",
      handler: "local-fake-adapter:v1",
      traceRecordCompatible: true,
    });
  });
});
