import { describe, expect, it } from "vitest";

import type { CapabilityManifest } from "../capability-contract";
import { createStaticCapabilityRegistry } from "../capability-registry-static-implementation";

const alphaCapability = {
  id: "alpha",
  name: "Alpha Capability",
  kind: "skill",
  composition: "single",
  decompositionStatus: "none",
  description: "Deterministic alpha capability fixture.",
  visibility: "enabled",
  invocationModes: ["automatic"],
  requiresApproval: false,
  requiresConfirmation: false,
  status: "active",
  version: "1.0.0",
} satisfies CapabilityManifest;

const betaCapability = {
  id: "beta",
  name: "Beta Capability",
  kind: "tool",
  composition: "single",
  decompositionStatus: "none",
  description: "Deterministic beta capability fixture.",
  assetPath: "capabilities/beta/asset.md",
  entrypoint: "capabilities/beta/index.ts",
  referencesPath: "capabilities/beta/references",
  visibility: "user_invocable_only",
  invocationModes: ["user_invoked", "runtime_invoked"],
  requiresApproval: true,
  requiresConfirmation: true,
  status: "draft",
  version: "2.0.0",
} satisfies CapabilityManifest;

const gammaCapability = {
  id: "gamma",
  name: "Gamma Capability",
  kind: "agent",
  composition: "single",
  decompositionStatus: "none",
  description: "Deterministic gamma capability fixture.",
  visibility: "disabled",
  invocationModes: ["runtime_invoked"],
  requiresApproval: false,
  requiresConfirmation: true,
  status: "deprecated",
  version: "3.0.0",
} satisfies CapabilityManifest;

function createRegistryFixture() {
  return createStaticCapabilityRegistry([
    betaCapability,
    alphaCapability,
    gammaCapability,
  ]);
}

describe("capability-registry-static-implementation.ts", () => {
  it("exports createStaticCapabilityRegistry", () => {
    expect(createStaticCapabilityRegistry).toBeTypeOf("function");
  });

  it("reuses the existing CapabilityManifest contract type", () => {
    const entries = [betaCapability, alphaCapability, gammaCapability] satisfies readonly CapabilityManifest[];
    const registry = createStaticCapabilityRegistry(entries);

    expect(registry.list()).toHaveLength(3);
    expect(entries[0].id).toBe("beta");
  });

  it("creates a registry from valid capability entries", () => {
    const registry = createRegistryFixture();

    expect(registry.list()).toHaveLength(3);
    expect(registry.has("alpha")).toBe(true);
    expect(registry.has("missing")).toBe(false);
  });

  it("lists all entries", () => {
    const registry = createRegistryFixture();

    expect(registry.list().map((entry) => entry.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("lists entries in deterministic id order regardless of input order", () => {
    const forward = createStaticCapabilityRegistry([
      alphaCapability,
      betaCapability,
      gammaCapability,
    ]);
    const reversed = createStaticCapabilityRegistry([
      gammaCapability,
      betaCapability,
      alphaCapability,
    ]);

    expect(forward.list().map((entry) => entry.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(reversed.list().map((entry) => entry.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("get returns matching entry", () => {
    const registry = createRegistryFixture();

    expect(registry.get("beta")).toEqual(betaCapability);
  });

  it("get returns undefined for a missing id", () => {
    const registry = createRegistryFixture();

    expect(registry.get("missing")).toBeUndefined();
  });

  it("has returns true for an existing id", () => {
    const registry = createRegistryFixture();

    expect(registry.has("gamma")).toBe(true);
  });

  it("has returns false for a missing id", () => {
    const registry = createRegistryFixture();

    expect(registry.has("missing")).toBe(false);
  });

  it("resolve returns matching entry", () => {
    const registry = createRegistryFixture();

    expect(registry.resolve("alpha")).toEqual(alphaCapability);
  });

  it("resolve throws a deterministic error for a missing id", () => {
    const registry = createRegistryFixture();

    expect(() => registry.resolve("missing")).toThrow(
      "Capability not found: missing",
    );
  });

  it("rejects an empty id", () => {
    expect(() =>
      createStaticCapabilityRegistry([
        {
          ...alphaCapability,
          id: "",
        },
      ]),
    ).toThrow("Empty capability id");
  });

  it("rejects a missing required field", () => {
    const missingName = {
      ...alphaCapability,
    } as Partial<CapabilityManifest>;
    delete missingName.name;

    expect(() =>
      createStaticCapabilityRegistry([missingName as CapabilityManifest]),
    ).toThrow("Missing required field: name");
  });

  it("rejects a duplicate id", () => {
    expect(() =>
      createStaticCapabilityRegistry([
        alphaCapability,
        {
          ...betaCapability,
          id: "alpha",
        },
      ]),
    ).toThrow("Duplicate capability id: alpha");
  });

  it("rejects a null entry", () => {
    expect(() =>
      createStaticCapabilityRegistry([
        alphaCapability,
        null as unknown as CapabilityManifest,
      ]),
    ).toThrow("Capability entry at index 1 is null");
  });

  it("rejects an undefined entry", () => {
    expect(() =>
      createStaticCapabilityRegistry([
        alphaCapability,
        undefined as unknown as CapabilityManifest,
      ]),
    ).toThrow("Capability entry at index 1 is undefined");
  });

  it("does not mutate the input entries", () => {
    const entries = [betaCapability, alphaCapability, gammaCapability];
    const snapshot = JSON.parse(JSON.stringify(entries)) as typeof entries;

    createStaticCapabilityRegistry(entries);

    expect(entries).toEqual(snapshot);
  });

  it("returns list copies that cannot mutate registry state", () => {
    const registry = createRegistryFixture();
    const listed = registry.list();

    listed[0].name = "Mutated Alpha";
    listed[0].invocationModes.push("automatic");

    expect(registry.get("alpha")).toEqual(alphaCapability);
    expect(registry.list()).toEqual([
      alphaCapability,
      betaCapability,
      gammaCapability,
    ]);
  });

  it("returns get copies that cannot mutate registry state", () => {
    const registry = createRegistryFixture();
    const entry = registry.get("beta");

    expect(entry).toBeDefined();
    if (!entry) {
      return;
    }

    entry.name = "Mutated Beta";
    entry.invocationModes.push("automatic");

    expect(registry.get("beta")).toEqual(betaCapability);
  });

  it("returns resolve copies that cannot mutate registry state", () => {
    const registry = createRegistryFixture();
    const entry = registry.resolve("gamma");

    entry.name = "Mutated Gamma";
    entry.invocationModes.push("automatic");

    expect(registry.resolve("gamma")).toEqual(gammaCapability);
  });

  it("repeats list, get, has, and resolve deterministically", () => {
    const registry = createRegistryFixture();

    expect(registry.list()).toEqual(registry.list());
    expect(registry.get("alpha")).toEqual(registry.get("alpha"));
    expect(registry.has("alpha")).toBe(registry.has("alpha"));
    expect(registry.resolve("beta")).toEqual(registry.resolve("beta"));
  });

  it("does not reference forbidden runtime integrations in the implementation source", () => {
    const source = createStaticCapabilityRegistry.toString();
    const forbiddenTerms = [
      ["pro", "cess", ".", "env"].join(""),
      ["do", "tenv"].join(""),
      ["node", ":", "fs"].join(""),
      ["c", "li"].join(""),
      ["pro", "vider"].join(""),
      ["work", "space"].join(""),
      ["ski", "lls"].join(""),
      ["ker", "nel"].join(""),
    ];

    for (const term of forbiddenTerms) {
      expect(source).not.toContain(term);
    }
  });
});
