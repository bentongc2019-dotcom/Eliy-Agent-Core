import type { MockCapabilityInvocationResult } from "./capability-invocation-mock-execution";

export interface CapabilityInvocationTraceRecordInput {
  invocationId: string;
  capabilityId: string;
  result: MockCapabilityInvocationResult;
  createdAt: string;
}

export interface CapabilityInvocationTraceRecord {
  invocationId: string;
  capabilityId: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityKind: MockCapabilityInvocationResult["capabilityKind"];
  mode: MockCapabilityInvocationResult["mode"];
  status: "mock_completed";
  handler: string;
  payloadSnapshot: MockCapabilityInvocationResult["payload"];
  createdAt: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function clonePayloadValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => clonePayloadValue(item));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const clonedRecord: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    clonedRecord[key] = clonePayloadValue(nestedValue);
  }

  return clonedRecord;
}

function clonePayload(
  payload: MockCapabilityInvocationResult["payload"],
): MockCapabilityInvocationResult["payload"] {
  return clonePayloadValue(payload) as MockCapabilityInvocationResult["payload"];
}

export function createCapabilityInvocationTraceRecord(
  input: CapabilityInvocationTraceRecordInput,
): CapabilityInvocationTraceRecord {
  if (!input || typeof input !== "object") {
    throw new Error("trace record input is required");
  }

  const { invocationId, capabilityId, result, createdAt } = input;

  if (!isNonEmptyString(invocationId)) {
    throw new Error("invocationId is required");
  }

  if (!isNonEmptyString(capabilityId)) {
    throw new Error("capabilityId is required");
  }

  if (!result || typeof result !== "object") {
    throw new Error("result is required");
  }

  if (!isNonEmptyString(createdAt)) {
    throw new Error("createdAt is required");
  }

  if (result.capabilityId !== capabilityId) {
    throw new Error(
      `capabilityId mismatch: expected ${capabilityId}, received ${result.capabilityId}`,
    );
  }

  return {
    invocationId,
    capabilityId,
    capabilityName: result.capabilityName,
    capabilityVersion: result.capabilityVersion,
    capabilityKind: result.capabilityKind,
    mode: result.mode,
    status: "mock_completed",
    handler: result.handler,
    payloadSnapshot: clonePayload(result.payload),
    createdAt,
  };
}
