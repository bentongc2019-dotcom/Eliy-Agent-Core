import { describe, expect, it } from "vitest";
import {
  createInMemoryOTUnitRepository,
  createProposedOTUnitFromDraft,
  confirmOTUnit,
  validateOTUnit,
  OTUNIT_STATUSES,
  type OTUnit,
  type OTUnitRepository
} from "../../../domain/index.js";

describe("OTUnitRepository in-memory boundary", () => {
  const validProposedOTUnit: OTUnit = {
    id: "repo-otunit-1",
    objectiveId: "objective-1",
    title: "Test repository OTUnit",
    owner: "test-user",
    dueDate: "2026-07-15",
    status: "proposed",
    evidenceRefs: ["evidence-1"],
    requiresConfirmation: true,
    createdAt: "2026-07-04T00:00:00.000Z"
  };

  const validProposedOTUnit2: OTUnit = {
    id: "repo-otunit-2",
    objectiveId: "objective-1",
    title: "Second repository OTUnit",
    owner: "test-user",
    dueDate: "2026-07-20",
    status: "proposed",
    evidenceRefs: ["evidence-2"],
    requiresConfirmation: true,
    createdAt: "2026-07-04T00:00:00.000Z"
  };

  const validProposedOTUnit3: OTUnit = {
    id: "repo-otunit-3",
    objectiveId: "objective-2",
    title: "Third repository OTUnit",
    owner: "other-user",
    dueDate: "2026-07-25",
    status: "proposed",
    evidenceRefs: ["evidence-3"],
    requiresConfirmation: true,
    createdAt: "2026-07-04T00:00:00.000Z"
  };

  function createFreshRepository(): OTUnitRepository {
    return createInMemoryOTUnitRepository();
  }

  describe("save", () => {
    it("saves a valid proposed OTUnit", () => {
      const repo = createFreshRepository();
      const result = repo.save(validProposedOTUnit);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects an invalid OTUnit with deterministic errors", () => {
      const repo = createFreshRepository();
      const invalid = { id: "" } as unknown as OTUnit;
      const result = repo.save(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // All errors must have field and message.
      for (const err of result.errors) {
        expect(typeof err.field).toBe("string");
        expect(typeof err.message).toBe("string");
      }
    });

    it("rejects an empty object with deterministic errors", () => {
      const repo = createFreshRepository();
      const result = repo.save({} as OTUnit);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects null with deterministic errors", () => {
      const repo = createFreshRepository();
      const result = repo.save(null as unknown as OTUnit);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("duplicate id behavior", () => {
    it("upserts/replaces an existing OTUnit with the same id", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const updated = {
        ...validProposedOTUnit,
        title: "Updated title via upsert",
        owner: "updated-owner"
      };
      const upsertResult = repo.save(updated);
      expect(upsertResult.valid).toBe(true);

      const retrieved = repo.getById(validProposedOTUnit.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe("Updated title via upsert");
      expect(retrieved!.owner).toBe("updated-owner");
      // Only one OTUnit for this id.
      const allByObjective = repo.listByObjectiveId(validProposedOTUnit.objectiveId);
      const matching = allByObjective.filter((u) => u.id === validProposedOTUnit.id);
      expect(matching).toHaveLength(1);
    });

    it("does not create duplicates on save with existing id", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);
      repo.save(validProposedOTUnit);

      const all = repo.listByObjectiveId(validProposedOTUnit.objectiveId);
      const matching = all.filter((u) => u.id === validProposedOTUnit.id);
      expect(matching).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("returns the saved OTUnit by id", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const retrieved = repo.getById(validProposedOTUnit.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(validProposedOTUnit.id);
      expect(retrieved!.title).toBe(validProposedOTUnit.title);
    });

    it("returns undefined for a missing OTUnit", () => {
      const repo = createFreshRepository();
      const retrieved = repo.getById("non-existent-id");
      expect(retrieved).toBeUndefined();
    });

    it("returns a clone that does not mutate stored state", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const retrieved = repo.getById(validProposedOTUnit.id)!;
      retrieved.title = "Mutated title";

      // Re-retrieve to confirm stored state is unchanged.
      const retrievedAgain = repo.getById(validProposedOTUnit.id)!;
      expect(retrievedAgain.title).toBe(validProposedOTUnit.title);
    });
  });

  describe("listByObjectiveId", () => {
    it("returns OTUnits for the given objectiveId", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);
      repo.save(validProposedOTUnit2);
      repo.save(validProposedOTUnit3);

      const results = repo.listByObjectiveId("objective-1");
      expect(results).toHaveLength(2);
      const ids = results.map((u) => u.id).sort();
      expect(ids).toEqual(["repo-otunit-1", "repo-otunit-2"]);
    });

    it("returns cloned copies that do not mutate stored state", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const results = repo.listByObjectiveId("objective-1");
      results[0].title = "Mutated via list";

      const resultsAgain = repo.listByObjectiveId("objective-1");
      expect(resultsAgain[0].title).toBe(validProposedOTUnit.title);
    });

    it("returns results sorted by id deterministically", () => {
      const repo = createFreshRepository();
      // Save in reverse id order.
      repo.save(validProposedOTUnit2); // repo-otunit-2
      repo.save(validProposedOTUnit);  // repo-otunit-1

      const results = repo.listByObjectiveId("objective-1");
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("repo-otunit-1");
      expect(results[1].id).toBe("repo-otunit-2");
    });

    it("returns empty array when no OTUnits match", () => {
      const repo = createFreshRepository();
      const results = repo.listByObjectiveId("non-existent-objective");
      expect(results).toEqual([]);
    });
  });

  describe("clear", () => {
    it("removes all stored OTUnits", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);
      repo.save(validProposedOTUnit2);

      repo.clear();

      expect(repo.getById(validProposedOTUnit.id)).toBeUndefined();
      expect(repo.getById(validProposedOTUnit2.id)).toBeUndefined();
      expect(repo.listByObjectiveId("objective-1")).toEqual([]);
    });

    it("allows saves after clear", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);
      repo.clear();

      const result = repo.save(validProposedOTUnit2);
      expect(result.valid).toBe(true);
      expect(repo.getById(validProposedOTUnit2.id)).toBeDefined();
    });
  });

  describe("status preservation", () => {
    it("preserves stored status exactly as provided", () => {
      const repo = createFreshRepository();
      const statuses: OTUnit["status"][] = [
        "proposed",
        "confirmed",
        "in_progress",
        "blocked",
        "closed"
      ];

      for (const status of statuses) {
        const otunit: OTUnit = {
          id: `status-test-${status}`,
          objectiveId: "status-test-objective",
          title: `Test ${status} OTUnit`,
          owner: "test-user",
          dueDate: "2026-07-15",
          status,
          evidenceRefs: ["evidence-status"],
          requiresConfirmation: status === "proposed",
          createdAt: "2026-07-04T00:00:00.000Z"
        };

        const saveResult = repo.save(otunit);
        expect(saveResult.valid).toBe(true);

        const retrieved = repo.getById(`status-test-${status}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.status).toBe(status);
      }
    });

    it("preserves requiresConfirmation exactly as provided", () => {
      const repo = createFreshRepository();

      const otunitWithConfirmation: OTUnit = {
        ...validProposedOTUnit,
        id: "with-confirmation",
        requiresConfirmation: true
      };
      repo.save(otunitWithConfirmation);
      const retrievedWith = repo.getById("with-confirmation")!;
      expect(retrievedWith.requiresConfirmation).toBe(true);

      const otunitWithoutConfirmation: OTUnit = {
        ...validProposedOTUnit,
        id: "without-confirmation",
        status: "confirmed",
        requiresConfirmation: false
      };
      repo.save(otunitWithoutConfirmation);
      const retrievedWithout = repo.getById("without-confirmation")!;
      expect(retrievedWithout.requiresConfirmation).toBe(false);
    });

    it("does not auto-confirm a proposed OTUnit", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const retrieved = repo.getById(validProposedOTUnit.id)!;
      expect(retrieved.status).toBe("proposed");
      expect(retrieved.requiresConfirmation).toBe(true);
    });
  });

  describe("mutation safety", () => {
    it("getById returns a clone that does not affect stored state", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const retrieved = repo.getById(validProposedOTUnit.id)!;
      retrieved.title = "X";
      retrieved.owner = "Y";
      retrieved.dueDate = "Z";
      retrieved.evidenceRefs.push("fake-ref");

      const retrievedAgain = repo.getById(validProposedOTUnit.id)!;
      expect(retrievedAgain.title).toBe(validProposedOTUnit.title);
      expect(retrievedAgain.owner).toBe(validProposedOTUnit.owner);
      expect(retrievedAgain.dueDate).toBe(validProposedOTUnit.dueDate);
      expect(retrievedAgain.evidenceRefs).toEqual(validProposedOTUnit.evidenceRefs);
    });

    it("listByObjectiveId returns clones that do not affect stored state", () => {
      const repo = createFreshRepository();
      repo.save(validProposedOTUnit);

      const results = repo.listByObjectiveId(validProposedOTUnit.objectiveId);
      results[0].evidenceRefs.push("fake-ref");

      const resultsAgain = repo.listByObjectiveId(validProposedOTUnit.objectiveId);
      expect(resultsAgain[0].evidenceRefs).toEqual(validProposedOTUnit.evidenceRefs);
    });
  });

  describe("existing domain contracts remain preserved", () => {
    it("createProposedOTUnitFromDraft still produces proposed with requiresConfirmation", () => {
      const draft = {
        id: "draft-contract-1",
        objectiveId: "objective-contract",
        title: "Contract test draft",
        owner: "test-user",
        dueDate: "2026-07-15",
        evidenceRefs: ["evidence-contract"]
      };
      const result = createProposedOTUnitFromDraft(draft);
      expect(result.valid).toBe(true);
      expect(result.otunit!.requiresConfirmation).toBe(true);
      expect(result.otunit!.status).toBe("proposed");
    });

    it("confirmOTUnit still produces confirmed with requiresConfirmation false", () => {
      const result = confirmOTUnit(validProposedOTUnit);
      expect(result.valid).toBe(true);
      expect(result.otunit.status).toBe("confirmed");
      expect(result.otunit.requiresConfirmation).toBe(false);
    });

    it("validateOTUnit still rejects invalid OTUnits", () => {
      const result = validateOTUnit({} as unknown);
      expect(result.valid).toBe(false);
    });

    it("validateOTUnit still accepts valid OTUnits", () => {
      const result = validateOTUnit(validProposedOTUnit);
      expect(result.valid).toBe(true);
    });

    it("OTUNIT_STATUSES is unchanged", () => {
      expect(OTUNIT_STATUSES).toEqual([
        "proposed",
        "confirmed",
        "in_progress",
        "blocked",
        "closed"
      ]);
    });
  });

  describe("repository boundary contract", () => {
    it("exports createInMemoryOTUnitRepository", () => {
      expect(typeof createInMemoryOTUnitRepository).toBe("function");
    });

    it("returns a repository with the expected methods", () => {
      const repo = createFreshRepository();
      expect(typeof repo.save).toBe("function");
      expect(typeof repo.getById).toBe("function");
      expect(typeof repo.listByObjectiveId).toBe("function");
      expect(typeof repo.clear).toBe("function");
    });
  });
});
