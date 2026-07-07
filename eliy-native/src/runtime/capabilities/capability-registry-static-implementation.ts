import type { CapabilityManifest } from "./capability-contract";

type StaticCapabilityEntry = CapabilityManifest;

function cloneCapability(entry: StaticCapabilityEntry): CapabilityManifest {
  return {
    ...entry,
    invocationModes: [...entry.invocationModes],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertCapabilityId(id: unknown): string {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Empty capability id");
  }

  return id;
}

function assertRequiredStringField(
  entry: Record<string, unknown>,
  fieldName: keyof CapabilityManifest,
): string {
  const value = entry[fieldName];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${String(fieldName)}`);
  }

  return value;
}

function assertRequiredBooleanField(
  entry: Record<string, unknown>,
  fieldName: "requiresApproval" | "requiresConfirmation",
): boolean {
  const value = entry[fieldName];

  if (typeof value !== "boolean") {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return value;
}

function assertRequiredStringArrayField(
  entry: Record<string, unknown>,
  fieldName: "invocationModes",
): CapabilityManifest["invocationModes"] {
  const value = entry[fieldName];

  if (!Array.isArray(value)) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
  }

  return [...value] as CapabilityManifest["invocationModes"];
}

function normalizeCapabilityEntry(
  entry: unknown,
  index: number,
): CapabilityManifest {
  if (entry === null) {
    throw new Error(`Capability entry at index ${index} is null`);
  }

  if (entry === undefined) {
    throw new Error(`Capability entry at index ${index} is undefined`);
  }

  if (!isRecord(entry)) {
    throw new Error(`Capability entry at index ${index} is invalid`);
  }

  const id = assertCapabilityId(entry.id);

  return {
    id,
    name: assertRequiredStringField(entry, "name"),
    kind: assertRequiredStringField(entry, "kind") as CapabilityManifest["kind"],
    composition: assertRequiredStringField(
      entry,
      "composition",
    ) as CapabilityManifest["composition"],
    decompositionStatus: assertRequiredStringField(
      entry,
      "decompositionStatus",
    ) as CapabilityManifest["decompositionStatus"],
    description: assertRequiredStringField(entry, "description"),
    assetPath:
      typeof entry.assetPath === "string" ? entry.assetPath : undefined,
    entrypoint:
      typeof entry.entrypoint === "string" ? entry.entrypoint : undefined,
    referencesPath:
      typeof entry.referencesPath === "string"
        ? entry.referencesPath
        : undefined,
    visibility: assertRequiredStringField(
      entry,
      "visibility",
    ) as CapabilityManifest["visibility"],
    invocationModes: assertRequiredStringArrayField(entry, "invocationModes"),
    requiresApproval: assertRequiredBooleanField(entry, "requiresApproval"),
    requiresConfirmation: assertRequiredBooleanField(
      entry,
      "requiresConfirmation",
    ),
    status: assertRequiredStringField(entry, "status") as CapabilityManifest["status"],
    version: assertRequiredStringField(entry, "version"),
  };
}

export function createStaticCapabilityRegistry(entries: readonly CapabilityManifest[]) {
  if (!Array.isArray(entries)) {
    throw new Error("Capability entries must be an array");
  }

  const canonicalEntries = new Map<string, CapabilityManifest>();

  entries.forEach((entry, index) => {
    const normalizedEntry = normalizeCapabilityEntry(entry, index);

    if (canonicalEntries.has(normalizedEntry.id)) {
      throw new Error(`Duplicate capability id: ${normalizedEntry.id}`);
    }

    canonicalEntries.set(normalizedEntry.id, cloneCapability(normalizedEntry));
  });

  const sortedIds = [...canonicalEntries.keys()].sort((left, right) =>
    left.localeCompare(right),
  );

  return {
    list(): CapabilityManifest[] {
      return sortedIds.map((id) => cloneCapability(canonicalEntries.get(id)!));
    },

    get(id: string): CapabilityManifest | undefined {
      const capabilityId = assertCapabilityId(id);
      const entry = canonicalEntries.get(capabilityId);

      return entry ? cloneCapability(entry) : undefined;
    },

    has(id: string): boolean {
      const capabilityId = assertCapabilityId(id);

      return canonicalEntries.has(capabilityId);
    },

    resolve(id: string): CapabilityManifest {
      const capabilityId = assertCapabilityId(id);
      const entry = canonicalEntries.get(capabilityId);

      if (!entry) {
        throw new Error(`Capability not found: ${capabilityId}`);
      }

      return cloneCapability(entry);
    },
  };
}
