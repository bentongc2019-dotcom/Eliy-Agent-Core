import type { CapabilityManifest } from "./capability-contract";

export interface LlmCapabilityMetadataForAdapter {
  capabilityId: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityKind: CapabilityManifest["kind"];
}

export interface LlmCapabilityAdapterInput
  extends LlmCapabilityMetadataForAdapter {
  payload: Record<string, unknown>;
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
