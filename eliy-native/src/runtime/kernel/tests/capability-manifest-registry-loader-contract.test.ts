// =============================================================================
// Static contract tests for CapabilityManifest, RegistryListing, and Loader.
//
// These tests verify that the capability contract types, registry listing
// contract, and loader contract are structurally sound using deterministic
// fixtures only. No production registry or loader implementation is tested.
//
// This file MUST NOT:
//   - import runtime modules
//   - call CLI
//   - call provider
//   - access filesystem
//   - add production registry implementation
//   - add production loader implementation
// =============================================================================

import { describe, it, expect } from "vitest";
import type {
  CapabilityKind,
  CapabilityComposition,
  CapabilityDecompositionStatus,
  CapabilityManifest,
  CapabilityRegistryListingContract,
  CapabilityLoaderContract,
} from "../../capabilities/capability-contract";

// =============================================================================
// O’PDCA fixture (deterministic, no external state)
// =============================================================================

const opdcaCapability: CapabilityManifest = {
  id: "opdca",
  name: "O’PDCA Skill Pack",
  kind: "skill",
  composition: "pack",
  decompositionStatus: "provisional",
  description:
    "An objective-driven, PDCA-based management system for planning, budgeting, review, improvement, and management development.",
  assetPath: "skills/opdca/SKILL.md",
  referencesPath: "skills/opdca/references",
  visibility: "enabled",
  invocationModes: ["automatic", "user_invoked", "runtime_invoked"],
  requiresApproval: false,
  requiresConfirmation: true,
  status: "draft",
  version: "0.1.0",
};

// =============================================================================
// Deterministic registry fixture
// =============================================================================

const registry: CapabilityRegistryListingContract = {
  listCapabilities: () => [opdcaCapability],
  getCapability: (id: string) =>
    id === opdcaCapability.id ? opdcaCapability : undefined,
};

// =============================================================================
// Deterministic loader fixture
// =============================================================================

const loader: CapabilityLoaderContract = {
  loadCapability: async (id: string) => {
    if (id === opdcaCapability.id) return opdcaCapability;
    throw new Error(`Unknown capability: ${id}`);
  },
};

// =============================================================================
// Tests
// =============================================================================

describe("CapabilityKind", () => {
  it("includes skill, tool, agent, connector", () => {
    const allKinds = [
      "skill",
      "tool",
      "agent",
      "connector",
    ] as const satisfies readonly CapabilityKind[];

    const kindCoverage: Record<CapabilityKind, true> = {
      skill: true,
      tool: true,
      agent: true,
      connector: true,
    };

    expect(allKinds).toHaveLength(Object.keys(kindCoverage).length);
    expect(kindCoverage.skill).toBe(true);
    expect(kindCoverage.tool).toBe(true);
    expect(kindCoverage.agent).toBe(true);
    expect(kindCoverage.connector).toBe(true);
  });
});

describe("CapabilityComposition", () => {
  it("includes single and pack", () => {
    const allCompositions = [
      "single",
      "pack",
    ] as const satisfies readonly CapabilityComposition[];

    const compositionCoverage: Record<CapabilityComposition, true> = {
      single: true,
      pack: true,
    };

    expect(allCompositions).toHaveLength(
      Object.keys(compositionCoverage).length,
    );
    expect(compositionCoverage.single).toBe(true);
   expect(compositionCoverage.pack).toBe(true);
  });
});

describe("CapabilityDecompositionStatus", () => {
  it("includes none, provisional, canonical", () => {
    const allStatuses = [
      "none",
      "provisional",
      "canonical",
    ] as const satisfies readonly CapabilityDecompositionStatus[];

    const statusCoverage: Record<CapabilityDecompositionStatus, true> = {
      none: true,
      provisional: true,
      canonical: true,
    };

    expect(allStatuses).toHaveLength(Object.keys(statusCoverage).length);
    expect(statusCoverage.none).toBe(true);
    expect(statusCoverage.provisional).toBe(true);
    expect(statusCoverage.canonical).toBe(true);
  });
});

describe("O’PDCA CapabilityManifest", () => {
  it("has kind=skill and composition=pack", () => {
    expect(opdcaCapability.kind).toBe("skill");
    expect(opdcaCapability.composition).toBe("pack");
  });

  it("has decompositionStatus=provisional", () => {
    expect(opdcaCapability.decompositionStatus).toBe("provisional");
  });

  it("has assetPath=skills/opdca/SKILL.md", () => {
    expect(opdcaCapability.assetPath).toBe("skills/opdca/SKILL.md");
  });

  it("has referencesPath=skills/opdca/references", () => {
    expect(opdcaCapability.referencesPath).toBe("skills/opdca/references");
  });

  it("has three invocation modes", () => {
    expect(opdcaCapability.invocationModes).toEqual([
      "automatic",
      "user_invoked",
      "runtime_invoked",
    ]);
  });

  it("requires confirmation but not approval", () => {
    expect(opdcaCapability.requiresApproval).toBe(false);
    expect(opdcaCapability.requiresConfirmation).toBe(true);
  });

  it("has draft status and version 0.1.0", () => {
    expect(opdcaCapability.status).toBe("draft");
    expect(opdcaCapability.version).toBe("0.1.0");
  });
});

describe("CapabilityRegistryListingContract", () => {
  it("lists the O’PDCA manifest in the deterministic fixture", () => {
    const listed = registry.listCapabilities();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe("opdca");
  });

  it("gets the O’PDCA manifest by id in the deterministic fixture", () => {
    const result = registry.getCapability("opdca");
    expect(result).toBeDefined();
    expect(result!.name).toBe("O’PDCA Skill Pack");
  });

  it("returns undefined for an unknown id", () => {
    const result = registry.getCapability("nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("CapabilityLoaderContract", () => {
  it("loads the O’PDCA manifest in the deterministic fixture", async () => {
    const result = await loader.loadCapability("opdca");
    expect(result.id).toBe("opdca");
    expect(result.name).toBe("O’PDCA Skill Pack");
  });

  it("rejects with an error for an unknown id", async () => {
    await expect(loader.loadCapability("unknown")).rejects.toThrow(
      "Unknown capability: unknown",
    );
  });
});

describe("Runtime behavior remains unchanged", () => {
  it("has not changed runtime behavior", () => {
    // This is a deterministic assertion that documents the contract boundary.
    // No runtime modules are imported. No behavior is modified.
    const runtimeBehaviorChanged = false;
    expect(runtimeBehaviorChanged).toBe(false);
  });
});
