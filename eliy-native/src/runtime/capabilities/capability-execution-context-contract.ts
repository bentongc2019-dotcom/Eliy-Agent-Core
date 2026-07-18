import type {
  CapabilityInvocationMode,
  CapabilityKind,
} from "./capability-contract";
import type { HlamtRuntimeProjection } from "../agent/hlamt-runtime-projection";

export type CapabilityExecutionOutputKind =
  | "candidate"
  | "draft"
  | "proposal"
  | "question"
  | "judgment";

export type CapabilityExecutionActor =
  | "user"
  | "runtime"
  | "agent";

export interface CapabilityExecutionMetadata {
  id: string;
  name: string;
  version: string;
  kind: CapabilityKind;
}

export interface ResolvedCapabilityAsset {
  capabilityId: string;
  capabilityVersion: string;
  assetPath: string;
  instructions: string;
  referenceSources: readonly string[];
  assetFingerprint: string;
}

export interface HlamtInvocationSnapshot {
  sourcePath: string;
  summary: string;
  fingerprint: string;
  injectionRequested: boolean;
}

export interface CapabilityExecutionOutputBoundary {
  allowedOutputKinds: readonly CapabilityExecutionOutputKind[];
  requiresConfirmation: boolean;
  canonicalMutationAllowed: boolean;
}

export interface CapabilityExecutionInvocationMetadata {
  invocationId: string;
  createdAt: string;
  actor: CapabilityExecutionActor;
  invocationMode: CapabilityInvocationMode;
}

export interface CapabilityExecutionContext {
  capability: CapabilityExecutionMetadata;
  stableContext: HlamtRuntimeProjection;
  asset: ResolvedCapabilityAsset;
  hlamt: HlamtInvocationSnapshot;
  payload: Record<string, unknown>;
  outputBoundary: CapabilityExecutionOutputBoundary;
  invocationMetadata: CapabilityExecutionInvocationMetadata;
}
