import { describe, expect, it } from "vitest";

import type { CapabilityManifest } from "../capability-contract";
import { createMinimalCapabilityLoader } from "../capability-loader-minimal-implementation";
import { createStaticCapabilityRegistry } from "../capability-registry-static-implementation";
import {
  createMockCapabilityInvoker,
  invokeMockCapability,
  type MockCapabilityInvocationPayload,
  type MockCapabilityInvocationResult,
} from "../capability-invocation-mock-execution";
import { opdcaSkillPackCapabilityManifests } from "../../../../skills/opdca/opdca-skill-pack-capability-manifests";

const opdcaCapabilityId = opdcaSkillPackCapabilityManifests[0].id;

const mockInvocationPayload = {
  requestId: "mock-request-001",
  nested: {
    attempt: 1,
    tags: ["alpha", "beta"],
  },
} satisfies MockCapabilityInvocationPayload;

function expectRegistryShape(
  registry: ReturnType<typeof createStaticCapabilityRegistry>,
) {
  expect(registry.list).toBeTypeOf("function");
  expect(registry.get).toBeTypeOf("function");
  expect(registry.has).toBeTypeOf("function");
  expect(registry.resolve).toBeTypeOf("function");
}

function expectMockInvocationResultShape(
  result: MockCapabilityInvocationResult,
  manifest: CapabilityManifest,
) {
  expect(result.ok).toBe(true);
  expect(result.mode).toBe("mock");
  expect(result.capabilityId).toBe(manifest.id);
  expect(result.capabilityName).toBe(manifest.name);
  expect(result.capabilityVersion).toBe(manifest.version);
  expect(result.capabilityKind).toBe(manifest.kind);
  expect(result.handler).toBe("deterministic-mock-capability-handler:v1");
  expect(result.payload).toEqual(mockInvocationPayload);
}

describe("capability-invocation-mock-execution.ts", () => {
  it("exports the mock invocation API", () => {
    expect(createMockCapabilityInvoker).toBeTypeOf("function");
    expect(invokeMockCapability).toBeTypeOf("function");
  });

  it("reuses the existing CapabilityManifest contract type", () => {
    const listing = opdcaSkillPackCapabilityManifests satisfies readonly CapabilityManifest[];
    const loader = createMinimalCapabilityLoader(listing);

    expect(listing).toHaveLength(opdcaSkillPackCapabilityManifests.length);
    expect(loader.loadRegistry().list()).toHaveLength(listing.length);
  });

  it("can resolve the existing O’PDCA capability through the loader and registry", () => {
    const loader = createMinimalCapabilityLoader(opdcaSkillPackCapabilityManifests);
    const registry = loader.loadRegistry();
    const invoker = createMockCapabilityInvoker(loader);
    const manifest = registry.resolve(opdcaCapabilityId);

    expectRegistryShape(registry);
    expect(manifest).toEqual(opdcaSkillPackCapabilityManifests[0]);

    const result = invoker.invokeCapability(opdcaCapabilityId, mockInvocationPayload);

    expectMockInvocationResultShape(result, manifest);
  });

  it("returns a deterministic mock execution result for the same capability id and payload", () => {
    const first = invokeMockCapability(opdcaCapabilityId, mockInvocationPayload);
    const second = invokeMockCapability(opdcaCapabilityId, mockInvocationPayload);

    expect(first).toEqual(second);
    expectMockInvocationResultShape(first, opdcaSkillPackCapabilityManifests[0]);
    expectMockInvocationResultShape(second, opdcaSkillPackCapabilityManifests[0]);
  });

  it("keeps returned payload copies isolated across repeated invocations", () => {
    const first = invokeMockCapability(opdcaCapabilityId, mockInvocationPayload);
    const second = invokeMockCapability(opdcaCapabilityId, mockInvocationPayload);

    expect(first.payload).toEqual(mockInvocationPayload);
    expect(second.payload).toEqual(mockInvocationPayload);

    const mutatedFirstPayload = first.payload as {
      nested?: { attempt?: number; tags?: string[] };
    };

    mutatedFirstPayload.nested?.tags?.push("mutated");
    if (mutatedFirstPayload.nested) {
      mutatedFirstPayload.nested.attempt = 99;
    }

    expect(second.payload).toEqual(mockInvocationPayload);
    expect(invokeMockCapability(opdcaCapabilityId, mockInvocationPayload).payload).toEqual(
      mockInvocationPayload,
    );
  });

  it("does not mutate the input payload", () => {
    const payload = {
      requestId: "mock-request-002",
      nested: {
        attempt: 1,
        tags: ["gamma", "delta"],
      },
    } satisfies MockCapabilityInvocationPayload;
    const snapshot = JSON.parse(JSON.stringify(payload)) as typeof payload;

    invokeMockCapability(opdcaCapabilityId, payload);

    expect(payload).toEqual(snapshot);
  });

  it("throws a clear error when the capability id is missing", () => {
    expect(() =>
      invokeMockCapability("missing-capability", mockInvocationPayload),
    ).toThrow("Capability not found: missing-capability");
  });

  it("does not execute a real capability or depend on forbidden runtime integrations", () => {
    const sourceSnapshots = [
      createMockCapabilityInvoker.toString(),
      invokeMockCapability.toString(),
      createMinimalCapabilityLoader.toString(),
      createStaticCapabilityRegistry.toString(),
    ];
    const forbiddenTerms = [
      ["pro", "cess", ".", "env"].join(""),
      ["do", "tenv"].join(""),
      ["node", ":", "fs"].join(""),
      ["re", "ad", "File", "Sync"].join(""),
      ["re", "addir"].join(""),
      ["op", "endir"].join(""),
      ["g", "lob"].join(""),
      ["pro", "vider"].join(""),
      ["work", "space"].join(""),
      ["ker", "nel"].join(""),
      ["s", "ki", "lls"].join(""),
      ["c", "li"].join(""),
      ["com", "mander"].join(""),
      ["in", "quirer"].join(""),
      ["an", "si"].join(""),
      ["rea", "l_", "llm"].join(""),
    ];

    for (const source of sourceSnapshots) {
      for (const term of forbiddenTerms) {
        expect(source).not.toContain(term);
      }
    }

    expect(sourceSnapshots[0]).toContain("createMinimalCapabilityLoader");
    expect(sourceSnapshots[0]).toContain("opdcaSkillPackCapabilityManifests");
  });
});
