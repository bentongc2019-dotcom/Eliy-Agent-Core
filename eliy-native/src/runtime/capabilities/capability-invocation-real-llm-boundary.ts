import {
  invokeMockCapability,
  type MockCapabilityInvocationPayload,
  type MockCapabilityInvocationResult,
} from "./capability-invocation-mock-execution";
import {
  createCapabilityInvocationTraceRecord,
  type CapabilityInvocationTraceRecord,
} from "./capability-invocation-trace-record";
import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
} from "./llm-capability-adapter-contract";

export interface CapabilityInvocationBoundaryInput {
  invocationId: string;
  capabilityId: string;
  payload: MockCapabilityInvocationPayload;
  createdAt: string;
  mode?: "mock" | "real";
  enableRealLlm?: boolean;
  llmAdapter?: LlmCapabilityAdapter;
  realLlmAdapter?: LlmCapabilityAdapter;
}

export type RealLlmCapabilityInvocationResult = LlmCapabilityAdapterResult;
export type RealLlmCapabilityInvocationAdapter = LlmCapabilityAdapter;

export interface CapabilityInvocationBoundaryMockResult {
  ok: true;
  mode: "mock";
  mockResult: MockCapabilityInvocationResult;
  traceRecord: CapabilityInvocationTraceRecord;
}

export type CapabilityInvocationBoundaryResult =
  | CapabilityInvocationBoundaryMockResult
  | RealLlmCapabilityInvocationResult;

function isRealMode(input: CapabilityInvocationBoundaryInput): boolean {
  return input.mode === "real";
}

function createMockBoundaryResult(
  input: CapabilityInvocationBoundaryInput,
): CapabilityInvocationBoundaryMockResult {
  const mockResult = invokeMockCapability(input.capabilityId, input.payload);
  const traceRecord = createCapabilityInvocationTraceRecord({
    invocationId: input.invocationId,
    capabilityId: input.capabilityId,
    result: mockResult,
    createdAt: input.createdAt,
  });

  return {
    ok: true,
    mode: "mock",
    mockResult,
    traceRecord,
  };
}

async function createRealBoundaryResult(
  input: CapabilityInvocationBoundaryInput,
): Promise<RealLlmCapabilityInvocationResult> {
  if (input.enableRealLlm !== true) {
    throw new Error("real mode requires enableRealLlm: true");
  }

  const llmAdapter = input.llmAdapter ?? input.realLlmAdapter;

  if (typeof llmAdapter !== "function") {
    throw new Error("real mode requires a llmAdapter");
  }

  const mockResult = invokeMockCapability(input.capabilityId, input.payload);
  const adapterInput: LlmCapabilityAdapterInput = {
    capabilityId: mockResult.capabilityId,
    capabilityName: mockResult.capabilityName,
    capabilityVersion: mockResult.capabilityVersion,
    capabilityKind: mockResult.capabilityKind,
    payload: mockResult.payload,
  };

  return llmAdapter(adapterInput);
}

export async function invokeCapabilityWithRealLlmBoundary(
  input: CapabilityInvocationBoundaryInput,
): Promise<CapabilityInvocationBoundaryResult> {
  if (!input || typeof input !== "object") {
    throw new Error("boundary input is required");
  }

  if (isRealMode(input)) {
    return createRealBoundaryResult(input);
  }

  return createMockBoundaryResult(input);
}
