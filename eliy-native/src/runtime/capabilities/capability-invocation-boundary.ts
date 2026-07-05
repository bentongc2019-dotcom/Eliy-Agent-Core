// =============================================================================
// Eliy Capability Invocation Boundary Contract
//
// This file defines the Runtime-to-Capability invocation boundary contract.
// The boundary separates capability requests, previews, confirmations, and
// invocation records. Capability previews do not mutate Runtime state.
//
// This file is a contract scaffold only:
//   - No runtime invocation implemented
//   - No persistence implemented
//   - No provider integration
//   - No UI
//   - No command registration
//   - No side effects
//   - Type-only exports
//
// This file MUST NOT:
//   - implement runtime functions
//   - use default exports
//   - produce side effects
//   - implement persistence
//   - integrate providers
//   - register commands
// =============================================================================

import type { CapabilityInvocationMode } from "./capability-contract";

// ---------------------------------------------------------------------------
// Actor — who initiates the invocation
// ---------------------------------------------------------------------------

export type CapabilityInvocationActor =
  | "user"
  | "runtime"
  | "agent";

// ---------------------------------------------------------------------------
// Effect kind — what the invocation would do to the system
// ---------------------------------------------------------------------------

export type CapabilityInvocationEffectKind =
  | "read"
  | "draft"
  | "propose_record"
  | "propose_state_change"
  | "external_action";

// ---------------------------------------------------------------------------
// Boundary status — lifecycle of a single invocation request
// ---------------------------------------------------------------------------

export type CapabilityInvocationBoundaryStatus =
  | "requested"
  | "previewed"
  | "requires_confirmation"
  | "confirmed"
  | "rejected";

// ---------------------------------------------------------------------------
// Invocation request — a proposed capability invocation
// ---------------------------------------------------------------------------

export interface CapabilityInvocationRequest {
  id: string;
  capabilityId: string;
  invocationMode: CapabilityInvocationMode;
  actor: CapabilityInvocationActor;
  inputSummary: string;
  contextRefs: readonly string[];
  requiresConfirmation: boolean;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Invocation preview — a dry-run / preview of what would happen
// ---------------------------------------------------------------------------

export interface CapabilityInvocationPreview {
  requestId: string;
  capabilityId: string;
  effectKind: CapabilityInvocationEffectKind;
  status: CapabilityInvocationBoundaryStatus;
  previewSummary: string;
  proposedOutputRefs: readonly string[];
  requiresConfirmation: boolean;
  runtimeMutationAllowed: false;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Invocation confirmation — explicit user or runtime confirmation
// ---------------------------------------------------------------------------

export interface CapabilityInvocationConfirmation {
  requestId: string;
  capabilityId: string;
  status: Extract<CapabilityInvocationBoundaryStatus, "confirmed" | "rejected">;
  confirmedBy: CapabilityInvocationActor;
  reason?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Boundary record — the full lifecycle envelope
// ---------------------------------------------------------------------------

export interface CapabilityInvocationBoundaryRecord {
  id: string;
  request: CapabilityInvocationRequest;
  preview: CapabilityInvocationPreview;
  confirmation?: CapabilityInvocationConfirmation;
  status: CapabilityInvocationBoundaryStatus;
}
