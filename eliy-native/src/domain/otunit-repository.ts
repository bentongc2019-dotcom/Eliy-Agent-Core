// OTUnit Repository Boundary.
// Provides a deterministic process-local in-memory repository for OTUnits.
// No database. No filesystem persistence. No network storage.
// No AI generation. No chat behavior change.

import { createValidResult, type DomainValidationResult } from "./validation.js";
import { validateOTUnit, type OTUnit } from "./otunit.js";

// --- Repository type ---

export type OTUnitRepository = {
  /** Save or upsert an OTUnit. Validates the OTUnit before storing. */
  save(otunit: OTUnit): DomainValidationResult;

  /** Get an OTUnit by id. Returns a cloned copy or undefined if not found. */
  getById(id: string): OTUnit | undefined;

  /** List OTUnits by objectiveId. Returns cloned copies sorted by id. */
  listByObjectiveId(objectiveId: string): OTUnit[];

  /** Clear all stored OTUnits. Useful for tests. */
  clear(): void;
};

// --- In-memory implementation ---

export function createInMemoryOTUnitRepository(): OTUnitRepository {
  const store = new Map<string, OTUnit>();

  return {
    save(otunit: OTUnit): DomainValidationResult {
      const validation = validateOTUnit(otunit);
      if (!validation.valid) {
        return validation;
      }

      // Store a deep clone to prevent external mutation.
      store.set(otunit.id, structuredClone(otunit));

      return createValidResult();
    },

    getById(id: string): OTUnit | undefined {
      const stored = store.get(id);
      if (stored === undefined) {
        return undefined;
      }

      // Return a cloned copy to prevent external mutation of stored state.
      return structuredClone(stored);
    },

    listByObjectiveId(objectiveId: string): OTUnit[] {
      const results: OTUnit[] = [];

      for (const otunit of store.values()) {
        if (otunit.objectiveId === objectiveId) {
          results.push(structuredClone(otunit));
        }
      }

      // Deterministic ordering by id.
      results.sort((a, b) => a.id.localeCompare(b.id));

      return results;
    },

    clear(): void {
      store.clear();
    }
  };
}
