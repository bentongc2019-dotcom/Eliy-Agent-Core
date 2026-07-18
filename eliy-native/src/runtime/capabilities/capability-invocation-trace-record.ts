import { createHash } from "node:crypto";

import type { CapabilityExecutionContext } from "./capability-execution-context-contract";
import type {
  LlmCapabilityAdapterResult,
  LlmCapabilityInvocationEvidence,
} from "./llm-capability-adapter-contract";
import type { MockCapabilityInvocationResult } from "./capability-invocation-mock-execution";

export interface CapabilityInvocationTraceRecordInput {
  invocationId: string;
  capabilityId: string;
  result: MockCapabilityInvocationResult;
  createdAt: string;
}

export interface MockCapabilityInvocationTraceRecord {
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

export interface RealCapabilityInvocationTraceRecordInput {
  executionContext: CapabilityExecutionContext;
  result: LlmCapabilityAdapterResult & {
    router?: { providerId: string; model: string };
  };
}

export interface RealCapabilityInvocationTraceRecord {
  invocationId: string;
  capabilityId: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityKind: CapabilityExecutionContext["capability"]["kind"];
  mode: "real";
  status: "real_completed";
  handler: string;
  providerId?: string;
  model?: string;
  stableContextVersion: string;
  stableContextFingerprint: string;
  stableContextInjectionVerified: boolean;
  assetFingerprint: string;
  hlamtFingerprint: string;
  hlamtInjectionRequested: boolean;
  hlamtInjectionVerified: boolean;
  assetInstructionsInjectionVerified: boolean;
  outputBoundaryInjectionVerified: boolean;
  outputBoundary: CapabilityExecutionContext["outputBoundary"];
  requestFingerprint: string;
  thinkingMode: "disabled" | "provider_default";
  finishReason: LlmCapabilityInvocationEvidence["finishReason"];
  contentPresent: boolean;
  contentLength: number;
  reasoningContentPresent: boolean;
  reasoningContentLength?: number;
  providerUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
    promptCacheHit?: number;
    promptCacheMiss?: number;
  };
  resultFingerprint: string;
  resultLength: number;
  createdAt: string;
}

export type CapabilityInvocationTraceRecord =
  | MockCapabilityInvocationTraceRecord
  | RealCapabilityInvocationTraceRecord;

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
): MockCapabilityInvocationTraceRecord {
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

function fingerprint(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export function createRealCapabilityInvocationTraceRecord(
  input: RealCapabilityInvocationTraceRecordInput,
): RealCapabilityInvocationTraceRecord {
  const { executionContext, result } = input;
  const evidence = result.invocationEvidence;

  if (!evidence) {
    throw new Error("real trace requires invocation evidence");
  }

  if (result.capabilityId !== executionContext.capability.id) {
    throw new Error("real trace capabilityId mismatch");
  }

  return {
    invocationId: executionContext.invocationMetadata.invocationId,
    capabilityId: executionContext.capability.id,
    capabilityName: executionContext.capability.name,
    capabilityVersion: executionContext.capability.version,
    capabilityKind: executionContext.capability.kind,
    mode: "real",
    status: "real_completed",
    handler: result.handler,
    providerId: result.router?.providerId,
    model: result.router?.model,
    stableContextVersion: executionContext.stableContext.version,
    stableContextFingerprint: executionContext.stableContext.fingerprint,
    stableContextInjectionVerified: evidence.stableContextInjected,
    assetFingerprint: executionContext.asset.assetFingerprint,
    hlamtFingerprint: executionContext.hlamt.fingerprint,
    hlamtInjectionRequested: executionContext.hlamt.injectionRequested,
    hlamtInjectionVerified: evidence.hlamtInjectionVerified,
    assetInstructionsInjectionVerified: evidence.assetInstructionsInjected,
    outputBoundaryInjectionVerified: evidence.outputBoundaryInjected,
    outputBoundary: structuredClone(executionContext.outputBoundary),
    requestFingerprint: evidence.requestFingerprint,
    thinkingMode: evidence.thinkingMode,
    finishReason: evidence.finishReason,
    contentPresent: evidence.contentPresent,
    contentLength: evidence.contentLength,
    reasoningContentPresent: evidence.reasoningContentPresent,
    ...(evidence.reasoningContentLength === undefined
      ? {}
      : { reasoningContentLength: evidence.reasoningContentLength }),
    ...(evidence.providerUsage === undefined
      ? {}
      : {
          providerUsage: {
            prompt: evidence.providerUsage.promptTokens,
            completion: evidence.providerUsage.completionTokens,
            total: evidence.providerUsage.totalTokens,
            promptCacheHit: evidence.providerUsage.promptCacheHitTokens,
            promptCacheMiss: evidence.providerUsage.promptCacheMissTokens,
          },
        }),
    resultFingerprint: fingerprint(result.resultText),
    resultLength: result.resultText.length,
    createdAt: executionContext.invocationMetadata.createdAt,
  };
}
