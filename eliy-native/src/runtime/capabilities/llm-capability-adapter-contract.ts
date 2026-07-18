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

export interface LlmCapabilityAdapterResult {
  ok: true;
  mode: "real";
  capabilityId: string;
  handler: string;
  resultText: string;
  metadata?: LlmCapabilityMetadataForAdapter;
}

export type LlmCapabilityAdapter = (
  input: Readonly<LlmCapabilityAdapterInput>,
) =>
  | LlmCapabilityAdapterResult
  | Promise<LlmCapabilityAdapterResult>;
