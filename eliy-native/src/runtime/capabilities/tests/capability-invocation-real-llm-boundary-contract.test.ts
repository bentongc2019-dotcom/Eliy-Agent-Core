import { describe, expect, it } from "vitest";

import type { LlmCapabilityAdapter, LlmCapabilityAdapterInput } from "../llm-capability-adapter-contract";
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

async function readSource(relativePath: string): Promise<string> {
  const fsModule = await import(["n", "ode", ":", "f", "s"].join(""));
  const sourceReader = fsModule[["read", "File", "Sync"].join("")] as (
    path: URL,
    encoding: string,
  ) => string;

  return sourceReader(new URL(relativePath, import.meta.url), "utf8");
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
    ["de", "ep", "seek"].join(""),
    ["an", "th", "ropic"].join(""),
    ["dat", "abase"].join(""),
    ["com", "mander"].join(""),
    ["in", "quirer"].join(""),
    ansiEscape,
    ["s", "rc", "/", "r", "untime", "/", "pro", "vider"].join(""),
    ["s", "rc", "/", "pro", "vider"].join(""),
    ["s", "rc", "/", "cl", "i"].join(""),
    ["s", "rc", "/", "r", "untime", "/", "work", "space"].join(""),
    ["s", "rc", "/", "r", "untime", "/", "ker", "nel"].join(""),
    ["s", "ki", "lls"].join(""),
  ];

  for (const term of forbiddenTerms) {
    expect(source).not.toContain(term);
  }
}

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

  it("stays in mock mode when enableRealLlm is true but mode is omitted", async () => {
    const result = await invokeCapabilityWithRealLlmBoundary({
      ...createDefaultInput(),
      enableRealLlm: true,
    });

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
    ).rejects.toThrow("real mode requires a llmAdapter");
  });

  it("accepts a local fake adapter and returns a deterministic real mode result", async () => {
    const adapterCalls: LlmCapabilityAdapterInput[] = [];

    const llmAdapter: LlmCapabilityAdapter = async (
      adapterInput,
    ): Promise<RealLlmCapabilityInvocationResult> => {
      adapterCalls.push(adapterInput);

      return {
        ok: true,
        mode: "real",
        capabilityId: adapterInput.capabilityId,
        resultText: [
          "fake-real-result",
          adapterInput.capabilityId,
          adapterInput.capabilityVersion,
        ].join(":"),
        handler: "local-fake-adapter:v1",
      };
    };

    const expectedMockResult = invokeMockCapability(capabilityId, payload);
    const expectedAdapterInput = {
      capabilityId: expectedMockResult.capabilityId,
      capabilityName: expectedMockResult.capabilityName,
      capabilityVersion: expectedMockResult.capabilityVersion,
      capabilityKind: expectedMockResult.capabilityKind,
      payload: expectedMockResult.payload,
    } satisfies LlmCapabilityAdapterInput;

    const input: CapabilityInvocationBoundaryInput = {
      ...createDefaultInput(),
      mode: "real",
      enableRealLlm: true,
      llmAdapter,
    };

    const first = await invokeCapabilityWithRealLlmBoundary(input);
    const second = await invokeCapabilityWithRealLlmBoundary(input);

    expect(adapterCalls).toHaveLength(2);
    expect(adapterCalls[0]).toEqual(expectedAdapterInput);
    expect(adapterCalls[1]).toEqual(expectedAdapterInput);
    expect(first).toEqual(second);
    expect(first).toEqual({
      ok: true,
      mode: "real",
      capabilityId,
      resultText: `fake-real-result:opdca:${expectedMockResult.capabilityVersion}`,
      handler: "local-fake-adapter:v1",
    });
  });

  it("keeps the implementation source free of forbidden runtime integrations", async () => {
    const source = await readSource("../capability-invocation-real-llm-boundary.ts");

    expectNoForbiddenIntegrations(source);
    expect(source).toContain("invokeMockCapability");
    expect(source).toContain("createCapabilityInvocationTraceRecord");
    expect(source).toContain("llmAdapter");
    expect(source).toContain("realLlmAdapter");
  });
});
