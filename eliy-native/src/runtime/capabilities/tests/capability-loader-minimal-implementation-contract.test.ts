import { describe, expect, it } from "vitest";

import type { CapabilityManifest } from "../capability-contract";
import { createStaticCapabilityRegistry } from "../capability-registry-static-implementation";
import { createMinimalCapabilityLoader } from "../capability-loader-minimal-implementation";

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

function createLoaderFixture() {
  return createMinimalCapabilityLoader([
    betaCapability,
    alphaCapability,
    gammaCapability,
  ]);
}

function expectRegistryShape(registry: ReturnType<typeof createStaticCapabilityRegistry>) {
  expect(registry.list).toBeTypeOf("function");
  expect(registry.get).toBeTypeOf("function");
  expect(registry.has).toBeTypeOf("function");
  expect(registry.resolve).toBeTypeOf("function");
}

describe("capability-loader-minimal-implementation.ts", () => {
  it("exports createMinimalCapabilityLoader", () => {
    expect(createMinimalCapabilityLoader).toBeTypeOf("function");
  });

  it("reuses the existing CapabilityManifest contract type", () => {
    const entries = [betaCapability, alphaCapability, gammaCapability] satisfies readonly CapabilityManifest[];
    const loader = createMinimalCapabilityLoader(entries);

    expect(loader.loadRegistry().list()).toHaveLength(3);
    expect(entries[0].id).toBe("beta");
  });

  it("creates a loader from valid capability manifests", () => {
    const loader = createLoaderFixture();

    expect(loader).toBeDefined();
    expect(loader.load).toBeTypeOf("function");
    expect(loader.loadRegistry).toBeTypeOf("function");
  });

  it("load returns a usable registry", () => {
    const registry = createLoaderFixture().load();

    expectRegistryShape(registry);
    expect(registry.list().map((entry) => entry.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(registry.get("beta")).toEqual(betaCapability);
    expect(registry.has("gamma")).toBe(true);
    expect(registry.resolve("alpha")).toEqual(alphaCapability);
  });

  it("loadRegistry returns a usable registry", () => {
    const registry = createLoaderFixture().loadRegistry();

    expectRegistryShape(registry);
    expect(registry.list().map((entry) => entry.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(registry.get("beta")).toEqual(betaCapability);
    expect(registry.has("gamma")).toBe(true);
    expect(registry.resolve("alpha")).toEqual(alphaCapability);
  });

  it("forwards empty id rejection from the static registry", () => {
    expect(() =>
      createMinimalCapabilityLoader([
        {
          ...alphaCapability,
          id: "",
        },
      ]).load(),
    ).toThrow("Empty capability id");
  });

  it("forwards duplicate id rejection from the static registry", () => {
    expect(() =>
      createMinimalCapabilityLoader([
        alphaCapability,
        {
          ...betaCapability,
          id: "alpha",
        },
      ]).loadRegistry(),
    ).toThrow("Duplicate capability id: alpha");
  });

  it("forwards null and undefined entry rejection from the static registry", () => {
    expect(() =>
      createMinimalCapabilityLoader([
        alphaCapability,
        null as unknown as CapabilityManifest,
      ]).load(),
    ).toThrow("Capability entry at index 1 is null");

    expect(() =>
      createMinimalCapabilityLoader([
        alphaCapability,
        undefined as unknown as CapabilityManifest,
      ]).loadRegistry(),
    ).toThrow("Capability entry at index 1 is undefined");
  });

  it("forwards missing required field rejection from the static registry", () => {
    const missingName = {
      ...alphaCapability,
    } as Partial<CapabilityManifest>;
    delete missingName.name;

    expect(() =>
      createMinimalCapabilityLoader([
        missingName as CapabilityManifest,
      ]).load(),
    ).toThrow("Missing required field: name");
  });

  it("produces deterministic registries across repeated load calls", () => {
    const loader = createLoaderFixture();

    expect(loader.load().list()).toEqual(loader.load().list());
    expect(loader.loadRegistry().list()).toEqual(loader.loadRegistry().list());
    expect(loader.load().list()).toEqual(loader.loadRegistry().list());
  });

  it("does not mutate loader input during creation or loading", () => {
    const entries = [betaCapability, alphaCapability, gammaCapability];
    const snapshot = JSON.parse(JSON.stringify(entries)) as typeof entries;

    const loader = createMinimalCapabilityLoader(entries);

    expect(entries).toEqual(snapshot);

    loader.load();
    loader.loadRegistry();

    expect(entries).toEqual(snapshot);
  });

  it("returns registry copies that cannot mutate later loader output", () => {
    const loader = createLoaderFixture();
    const loadedRegistry = loader.load();
    const listed = loadedRegistry.list();
    const betaEntry = loadedRegistry.get("beta");

    listed[0].name = "Mutated Alpha";
    listed[0].invocationModes.push("automatic");

    expect(betaEntry).toBeDefined();
    if (!betaEntry) {
      return;
    }

    betaEntry.name = "Mutated Beta";
    betaEntry.invocationModes.push("automatic");

    expect(loader.load().get("alpha")).toEqual(alphaCapability);
    expect(loader.loadRegistry().get("beta")).toEqual(betaCapability);
    expect(loader.load().list()).toEqual([
      alphaCapability,
      betaCapability,
      gammaCapability,
    ]);
  });

  it("does not reference forbidden runtime integrations in the implementation source", () => {
    const source = createMinimalCapabilityLoader.toString();
    const forbiddenTerms = [
      ["pro", "cess", ".", "env"].join(""),
      ["do", "tenv"].join(""),
      ["node", ":", "fs"].join(""),
      ["c", "li"].join(""),
      ["pro", "vider"].join(""),
      ["work", "space"].join(""),
      ["ski", "lls"].join(""),
      ["ker", "nel"].join(""),
      ["com", "mander"].join(""),
      ["in", "quirer"].join(""),
      ["an", "si"].join(""),
      ["rea", "l_", "llm"].join(""),
    ];

    for (const term of forbiddenTerms) {
      expect(source).not.toContain(term);
    }

    expect(source).toContain("createStaticCapabilityRegistry");
    expect(source).toContain("loadRegistry");
  });
});
