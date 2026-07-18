import type { CapabilityManifest } from "./capability-contract";
import type { CapabilityExecutionContext } from "./capability-execution-context-contract";

export interface LlmCapabilityMetadataForAdapter {
  capabilityId: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityKind: CapabilityManifest["kind"];
}

export interface LlmCapabilityAdapterInput
  extends LlmCapabilityMetadataForAdapter {
  payload: Record<string, unknown>;
  executionContext?: CapabilityExecutionContext;
}

export interface LlmCapabilityInvocationEvidence {
  stableContextInjected: boolean;
  assetInstructionsInjected: boolean;
  hlamtInjectionVerified: boolean;
  outputBoundaryInjected: boolean;
  requestFingerprint: string;
  thinkingMode: "disabled" | "provider_default";
  finishReason:
    | "stop"
    | "length"
    | "content_filter"
    | "tool_calls"
    | "insufficient_system_resource";
  contentPresent: boolean;
  contentLength: number;
  reasoningContentPresent: boolean;
  reasoningContentLength?: number;
  providerUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
  };
}

export interface LlmCapabilityAdapterResult {
  ok: true;
  mode: "real";
  capabilityId: string;
  handler: string;
  resultText: string;
  metadata?: LlmCapabilityMetadataForAdapter;
  invocationEvidence?: LlmCapabilityInvocationEvidence;
}

export type LlmCapabilityAdapter = (
  input: Readonly<LlmCapabilityAdapterInput>,
) =>
  | LlmCapabilityAdapterResult
  | Promise<LlmCapabilityAdapterResult>;
