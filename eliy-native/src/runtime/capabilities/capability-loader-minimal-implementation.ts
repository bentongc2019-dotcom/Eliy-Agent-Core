import type { CapabilityManifest } from "./capability-contract";
import { createStaticCapabilityRegistry } from "./capability-registry-static-implementation";

export type MinimalCapabilityRegistry = ReturnType<
  typeof createStaticCapabilityRegistry
>;

export interface MinimalCapabilityLoader {
  load(): MinimalCapabilityRegistry;
  loadRegistry(): MinimalCapabilityRegistry;
}

function cloneCapabilityManifest(
  manifest: CapabilityManifest,
): CapabilityManifest {
  return {
    ...manifest,
    invocationModes: [...manifest.invocationModes],
  };
}

function snapshotCapabilityManifest(
  manifest: CapabilityManifest | null | undefined,
): CapabilityManifest | null | undefined {
  if (manifest === null || manifest === undefined) {
    return manifest;
  }

  return cloneCapabilityManifest(manifest);
}

export function createMinimalCapabilityLoader(
  manifests: readonly CapabilityManifest[],
): MinimalCapabilityLoader {
  const manifestSnapshot: Array<CapabilityManifest | null | undefined> =
    manifests.map(snapshotCapabilityManifest);

  const loadRegistry = (): MinimalCapabilityRegistry =>
    createStaticCapabilityRegistry(
      manifestSnapshot as readonly CapabilityManifest[],
    );

  return {
    load: loadRegistry,
    loadRegistry,
  };
}
