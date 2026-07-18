import { isDeepStrictEqual } from "node:util";

import type { CapabilityExecutionContext } from "./capability-execution-context-contract";
import {
  invokeMockCapability,
  type MockCapabilityInvocationPayload,
  type MockCapabilityInvocationResult,
} from "./capability-invocation-mock-execution";
import {
  createCapabilityInvocationTraceRecord,
  createRealCapabilityInvocationTraceRecord,
  type CapabilityInvocationTraceRecord,
  type RealCapabilityInvocationTraceRecord,
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
  executionContext?: CapabilityExecutionContext;
}

export type RealLlmCapabilityInvocationResult = LlmCapabilityAdapterResult & {
  traceRecord?: RealCapabilityInvocationTraceRecord;
};
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

  if (input.executionContext) {
    const context = input.executionContext;

    if (context.capability.id !== input.capabilityId) {
      throw new Error("real executionContext capabilityId mismatch");
    }
    if (context.invocationMetadata.invocationId !== input.invocationId) {
      throw new Error("real executionContext invocationId mismatch");
    }
    if (context.invocationMetadata.createdAt !== input.createdAt) {
      throw new Error("real executionContext createdAt mismatch");
    }
    if (!isDeepStrictEqual(context.payload, input.payload)) {
      throw new Error("real executionContext payload mismatch");
    }
    if (context.asset.capabilityId !== context.capability.id) {
      throw new Error("real executionContext asset capabilityId mismatch");
    }
    if (context.asset.capabilityVersion !== context.capability.version) {
      throw new Error("real executionContext asset capabilityVersion mismatch");
    }
    if (
      context.outputBoundary.allowedOutputKinds.length !== 1 ||
      context.outputBoundary.allowedOutputKinds[0] !== "candidate" ||
      context.outputBoundary.requiresConfirmation !== true ||
      context.outputBoundary.canonicalMutationAllowed !== false
    ) {
      throw new Error(
        "real executionContext requires candidate-only output boundary",
      );
    }

    const result = await llmAdapter({
      capabilityId: context.capability.id,
      capabilityName: context.capability.name,
      capabilityVersion: context.capability.version,
      capabilityKind: context.capability.kind,
      payload: context.payload,
      executionContext: context,
    });
    const evidence = result.invocationEvidence;

    if (!evidence) {
      throw new Error("real executionContext requires invocation evidence");
    }
    if (!evidence.assetInstructionsInjected) {
      throw new Error("real executionContext asset injection not verified");
    }
    if (!evidence.stableContextInjected) {
      throw new Error("real executionContext stable context injection not verified");
    }
    if (!evidence.outputBoundaryInjected) {
      throw new Error("real executionContext output boundary injection not verified");
    }
    if (
      evidence.hlamtInjectionVerified !== context.hlamt.injectionRequested
    ) {
      throw new Error(
        "real executionContext HLAMT injection evidence mismatch",
      );
    }
    const traceRecord = createRealCapabilityInvocationTraceRecord({
      executionContext: context,
      result,
    });

    return { ...result, traceRecord };
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
