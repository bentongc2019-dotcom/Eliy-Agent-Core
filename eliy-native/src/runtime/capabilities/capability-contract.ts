// =============================================================================
// Eliy Capability Contract
//
// This file defines the shared types and interfaces for all Eliy capability
// contracts. Capabilities describe skills, tools, agents, and connectors
// before runtime invocation. This file is a contract-only skeleton.
//
// This file MUST NOT:
//   - export runtime registry instances
//   - export runtime loader instances
//   - import provider, runtime, or kernel modules
//   - contain side effects
//   - access the filesystem
// =============================================================================

// ---------------------------------------------------------------------------
// Capability type aliases
// ---------------------------------------------------------------------------

/** The kind of a capability. */
export type CapabilityKind = "skill" | "tool" | "agent" | "connector";

/** Whether the capability is a single unit or a pack of sub-capabilities. */
export type CapabilityComposition = "single" | "pack";

/**
 * The decomposition status tells callers whether a pack has been broken down
 * into its constituent sub-capabilities.
 */
export type CapabilityDecompositionStatus =
  | "none"
  | "provisional"
  | "canonical";

/** Visibility controls how a capability appears to users and the runtime. */
export type CapabilityVisibility =
  | "enabled"
  | "name_only"
  | "user_invocable_only"
  | "disabled";

/** How a capability can be triggered. */
export type CapabilityInvocationMode =
  | "automatic"
  | "user_invoked"
  | "runtime_invoked";

/** Lifecycle status of a capability definition. */
export type CapabilityStatus =
  | "draft"
  | "active"
  | "deprecated";

// ---------------------------------------------------------------------------
// CapabilityManifest
// ---------------------------------------------------------------------------

/**
 * Lightweight descriptor for a single capability.
 *
 * A manifest tells consumers what a capability is, where to find it, and how
 * it can be used. It does not provide runtime invocation logic.
 */
export interface CapabilityManifest {
  /** Unique identifier for this capability (e.g. "opdca"). */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** The kind — skill, tool, agent, or connector. */
  kind: CapabilityKind;

  /** Whether this capability is a single unit or a pack. */
  composition: CapabilityComposition;

  /** Decomposition status for packs. "none" for single capabilities. */
  decompositionStatus: CapabilityDecompositionStatus;

  /** Short description of what this capability does. */
  description: string;

  /** Relative path to the capability's primary asset file. */
  assetPath?: string;

  /** Relative path to the capability's entrypoint module. */
  entrypoint?: string;

  /** Relative path to the capability's reference documents directory. */
  referencesPath?: string;

  /** Visibility level. */
  visibility: CapabilityVisibility;

  /** All invocation modes supported by this capability. */
  invocationModes: CapabilityInvocationMode[];

  /** Whether user approval is required before invocation. */
  requiresApproval: boolean;

  /** Whether user confirmation is required before invocation. */
  requiresConfirmation: boolean;

  /** Lifecycle status. */
  status: CapabilityStatus;

  /** Semantic version string (e.g. "0.1.0"). */
  version: string;
}

// ---------------------------------------------------------------------------
// Registry listing contract
// ---------------------------------------------------------------------------

/**
 * Contract for listing and retrieving capability manifests.
 *
 * Implementations provide discovery — they do not handle loading or invocation.
 */
export interface CapabilityRegistryListingContract {
  /** Returns all registered capability manifests. */
  listCapabilities(): readonly CapabilityManifest[];

  /** Returns a single manifest by id, or undefined if not found. */
  getCapability(id: string): CapabilityManifest | undefined;
}

// ---------------------------------------------------------------------------
// Loader contract
// ---------------------------------------------------------------------------

/**
 * Contract for loading a capability by its identifier.
 *
 * A loader resolves the capability metadata (manifest) so the runtime can
 * decide whether and how to invoke it. Loading does NOT invoke.
 */
export interface CapabilityLoaderContract {
  /** Returns the manifest for the given capability id. */
  loadCapability(id: string): Promise<CapabilityManifest>;
}
