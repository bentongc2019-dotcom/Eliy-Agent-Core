import { describe, expect, it } from "vitest";

import type { CapabilityManifest } from "../capability-contract";
import { createMinimalCapabilityLoader } from "../capability-loader-minimal-implementation";
import { createStaticCapabilityRegistry } from "../capability-registry-static-implementation";
import { opdcaSkillPackCapabilityManifests } from "../../../../skills/opdca/opdca-skill-pack-capability-manifests";

function expectRegistryShape(
  registry: ReturnType<typeof createStaticCapabilityRegistry>,
) {
  expect(registry.list).toBeTypeOf("function");
  expect(registry.get).toBeTypeOf("function");
  expect(registry.has).toBeTypeOf("function");
  expect(registry.resolve).toBeTypeOf("function");
}

function expectCapabilityShape(manifest: CapabilityManifest) {
  expect(manifest.id).toBeTypeOf("string");
  expect(manifest.id.trim()).not.toBe("");
  expect(manifest.name).toBeTypeOf("string");
  expect(manifest.name.trim()).not.toBe("");
  expect(manifest.kind).toBeTypeOf("string");
  expect(manifest.version).toBeTypeOf("string");
  expect(manifest.version.trim()).not.toBe("");
  expect(manifest.composition).toBeTypeOf("string");
  expect(manifest.decompositionStatus).toBeTypeOf("string");
  expect(manifest.description).toBeTypeOf("string");
  expect(manifest.visibility).toBeTypeOf("string");
  expect(Array.isArray(manifest.invocationModes)).toBe(true);
  expect(manifest.requiresApproval).toBeTypeOf("boolean");
  expect(manifest.requiresConfirmation).toBeTypeOf("boolean");
  expect(manifest.status).toBeTypeOf("string");
}

describe("opdca-skill-pack-capability-listing-contract.ts", () => {
  it("exports the O’PDCA capability listing as a readonly array", () => {
    const readonlyListing: readonly CapabilityManifest[] =
      opdcaSkillPackCapabilityManifests;

    expect(Array.isArray(readonlyListing)).toBe(true);
    expect(readonlyListing.length).toBeGreaterThan(0);
  });

  it("reuses the existing CapabilityManifest contract type", () => {
    const listing = opdcaSkillPackCapabilityManifests satisfies readonly CapabilityManifest[];

    expect(listing).toHaveLength(opdcaSkillPackCapabilityManifests.length);
    expect(listing[0].id).toBeTypeOf("string");
  });

  it("contains a non-empty, unique, static manifest list", () => {
    const ids = opdcaSkillPackCapabilityManifests.map((manifest) => manifest.id);

    expect(opdcaSkillPackCapabilityManifests.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(id.trim()).not.toBe("");
    }
  });

  it("includes the complete required manifest fields for each entry", () => {
    for (const manifest of opdcaSkillPackCapabilityManifests) {
      expectCapabilityShape(manifest);
    }
  });

  it("can be passed to createMinimalCapabilityLoader", () => {
    const loader = createMinimalCapabilityLoader(
      opdcaSkillPackCapabilityManifests,
    );

    expect(loader.load).toBeTypeOf("function");
    expect(loader.loadRegistry).toBeTypeOf("function");
  });

  it("load and loadRegistry return deterministic registries", () => {
    const loader = createMinimalCapabilityLoader(
      opdcaSkillPackCapabilityManifests,
    );

    const loadedRegistry = loader.load();
    const loadedRegistryViaLoadRegistry = loader.loadRegistry();

    expectRegistryShape(loadedRegistry);
    expectRegistryShape(loadedRegistryViaLoadRegistry);
    expect(loadedRegistry.list().map((entry) => entry.id)).toEqual(
      loadedRegistryViaLoadRegistry.list().map((entry) => entry.id),
    );
    expect(loadedRegistry.list()).toEqual(loadedRegistry.list());
    expect(loadedRegistryViaLoadRegistry.list()).toEqual(
      loadedRegistryViaLoadRegistry.list(),
    );
  });

  it("supports list, get, has, and resolve for every manifest", () => {
    const loader = createMinimalCapabilityLoader(
      opdcaSkillPackCapabilityManifests,
    );
    const registry = loader.loadRegistry();

    expectRegistryShape(registry);
    expect(registry.list().map((entry) => entry.id)).toEqual(
      opdcaSkillPackCapabilityManifests.map((manifest) => manifest.id),
    );

    for (const manifest of opdcaSkillPackCapabilityManifests) {
      expect(registry.has(manifest.id)).toBe(true);
      expect(registry.get(manifest.id)).toEqual(manifest);
      expect(registry.resolve(manifest.id)).toEqual(manifest);
    }
  });

  it("preserves determinism and protects the source listing from mutation", () => {
    const loader = createMinimalCapabilityLoader(
      opdcaSkillPackCapabilityManifests,
    );
    const firstRegistry = loader.load();
    const secondRegistry = loader.loadRegistry();
    const originalSnapshot = JSON.parse(
      JSON.stringify(opdcaSkillPackCapabilityManifests),
    ) as typeof opdcaSkillPackCapabilityManifests;

    const listed = firstRegistry.list();
    const firstEntry = firstRegistry.get(opdcaSkillPackCapabilityManifests[0].id);
    const resolvedEntry = firstRegistry.resolve(
      opdcaSkillPackCapabilityManifests[0].id,
    );

    listed[0].name = "Mutated O’PDCA";
    listed[0].invocationModes.push("automatic");

    expect(firstEntry).toBeDefined();
    expect(resolvedEntry).toBeDefined();

    if (!firstEntry || !resolvedEntry) {
      return;
    }

    firstEntry.name = "Mutated from get";
    firstEntry.invocationModes.push("runtime_invoked");
    resolvedEntry.name = "Mutated from resolve";
    resolvedEntry.invocationModes.push("user_invoked");

    expect(opdcaSkillPackCapabilityManifests).toEqual(originalSnapshot);
    expect(secondRegistry.list()).toEqual(originalSnapshot);
    expect(loader.load().list()).toEqual(originalSnapshot);
    expect(loader.loadRegistry().list()).toEqual(originalSnapshot);
  });

  it("does not reference forbidden runtime integrations", () => {
    const sourceSnapshots = [
      JSON.stringify(opdcaSkillPackCapabilityManifests),
      createMinimalCapabilityLoader.toString(),
      createStaticCapabilityRegistry.toString(),
    ];
    const forbiddenTerms = [
      ["pro", "cess", ".", "env"].join(""),
      ["do", "tenv"].join(""),
      ["node", ":", "fs"].join(""),
      ["re", "ad", "File", "Sync"].join(""),
      ["rea", "dFi", "le"].join(""),
      ["re", "addir"].join(""),
      ["g", "lob"].join(""),
      ["op", "endir"].join(""),
      ["c", "li"].join(""),
      ["pro", "vider"].join(""),
      ["work", "space"].join(""),
      ["ker", "nel"].join(""),
      ["com", "mander"].join(""),
      ["in", "quirer"].join(""),
      ["an", "si"].join(""),
      ["rea", "l_", "llm"].join(""),
      ["do", "tenv"].join(""),
    ];

    for (const source of sourceSnapshots) {
      for (const term of forbiddenTerms) {
        expect(source).not.toContain(term);
      }
    }
  });
});
