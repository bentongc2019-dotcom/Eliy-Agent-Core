import type { CapabilityManifest } from "./capability-contract";
import {
  createMinimalCapabilityLoader,
  type MinimalCapabilityLoader,
} from "./capability-loader-minimal-implementation";
import { opdcaSkillPackCapabilityManifests } from "../../../skills/opdca/opdca-skill-pack-capability-manifests";

export type MockCapabilityInvocationPayload = Record<string, unknown>;

export interface MockCapabilityInvocationResult {
  ok: true;
  mode: "mock";
  capabilityId: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityKind: CapabilityManifest["kind"];
  payload: MockCapabilityInvocationPayload;
  handler: string;
}

export interface MockCapabilityInvoker {
  invokeCapability(
    capabilityId: string,
    payload: MockCapabilityInvocationPayload,
  ): MockCapabilityInvocationResult;
}

const MOCK_CAPABILITY_HANDLER = "deterministic-mock-capability-handler:v1";

function cloneMockPayloadValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneMockPayloadValue(item));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const clonedRecord: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    clonedRecord[key] = cloneMockPayloadValue(nestedValue);
  }

  return clonedRecord;
}

function cloneMockPayload(payload: MockCapabilityInvocationPayload): MockCapabilityInvocationPayload {
  return cloneMockPayloadValue(payload) as MockCapabilityInvocationPayload;
}

function createMockCapabilityExecutionResult(
  capability: CapabilityManifest,
  payload: MockCapabilityInvocationPayload,
): MockCapabilityInvocationResult {
  return {
    ok: true,
    mode: "mock",
    capabilityId: capability.id,
    capabilityName: capability.name,
    capabilityVersion: capability.version,
    capabilityKind: capability.kind,
    payload: cloneMockPayload(payload),
    handler: MOCK_CAPABILITY_HANDLER,
  };
}

export function createMockCapabilityInvoker(
  loader: MinimalCapabilityLoader = createMinimalCapabilityLoader(
    opdcaSkillPackCapabilityManifests,
  ),
): MockCapabilityInvoker {
  const registry = loader.loadRegistry();

  return {
    invokeCapability(
      capabilityId: string,
      payload: MockCapabilityInvocationPayload,
    ): MockCapabilityInvocationResult {
      const capability = registry.resolve(capabilityId);

      return createMockCapabilityExecutionResult(capability, payload);
    },
  };
}

export function invokeMockCapability(
  capabilityId: string,
  payload: MockCapabilityInvocationPayload,
  loader: MinimalCapabilityLoader = createMinimalCapabilityLoader(
    opdcaSkillPackCapabilityManifests,
  ),
): MockCapabilityInvocationResult {
  return createMockCapabilityInvoker(loader).invokeCapability(
    capabilityId,
    payload,
  );
}
