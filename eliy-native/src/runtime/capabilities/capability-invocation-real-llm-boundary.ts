import {
  invokeMockCapability,
  type MockCapabilityInvocationPayload,
  type MockCapabilityInvocationResult,
} from "./capability-invocation-mock-execution";
import {
  createCapabilityInvocationTraceRecord,
  type CapabilityInvocationTraceRecord,
} from "./capability-invocation-trace-record";

export interface CapabilityInvocationBoundaryInput {
  invocationId: string;
  capabilityId: string;
  payload: MockCapabilityInvocationPayload;
  createdAt: string;
  mode?: "mock" | "real";
  enableRealLlm?: boolean;
  realLlmAdapter?: RealLlmCapabilityInvocationAdapter;
}

export interface RealLlmCapabilityInvocationResult {
  ok: true;
  mode: "real";
  capabilityId: string;
  resultText: string;
  handler: string;
  traceRecordCompatible: true;
}

export type RealLlmCapabilityInvocationAdapter = (
  input: Readonly<{
    invocationId: string;
    capabilityId: string;
    payload: MockCapabilityInvocationPayload;
    createdAt: string;
  }>,
) => RealLlmCapabilityInvocationResult | Promise<RealLlmCapabilityInvocationResult>;

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

  if (typeof input.realLlmAdapter !== "function") {
    throw new Error("real mode requires a realLlmAdapter");
  }

  return input.realLlmAdapter({
    invocationId: input.invocationId,
    capabilityId: input.capabilityId,
    payload: input.payload,
    createdAt: input.createdAt,
  });
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
