import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OBJECTIVE_STATUSES,
  validateObjective
} from "../../../domain/objective.js";
import {
  OTUNIT_STATUSES,
  validateOTUnit
} from "../../../domain/otunit.js";

const projectRoot = resolve(__dirname, "../../../..");
const domainFiles = [
  "src/domain/index.ts",
  "src/domain/objective.ts",
  "src/domain/otunit.ts",
  "src/domain/validation.ts"
];
const forbiddenPatterns = [
  /node:fs/,
  /\bfs\b/,
  /node:fs\/promises/,
  /process\.env/,
  /\bfetch\b/,
  /Date\.now/,
  /new Date/,
  /Math\.random/,
  /randomUUID/
];

function expectNoForbiddenText(text: string): void {
  for (const pattern of forbiddenPatterns) {
    expect(text).not.toMatch(pattern);
  }
}

describe("OTUnit domain kernel skeleton", () => {
  it("validates a minimal Objective", () => {
    const result = validateObjective({
      id: "objective-1",
      title: "Clarify operating objective",
      status: "active",
      createdAt: "2026-07-02T00:00:00.000Z"
    });

    expect(OBJECTIVE_STATUSES).toEqual(["draft", "active", "completed", "archived"]);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects invalid Objective values", () => {
    expect(validateObjective({
      title: "Clarify operating objective",
      status: "active",
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "id", message: "Objective id is required." }]
    });

    expect(validateObjective({
      id: "objective-1",
      title: "   ",
      status: "active",
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "title", message: "Objective title is required." }]
    });

    expect(validateObjective({
      id: "objective-1",
      title: "Clarify operating objective",
      status: "unexpected",
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "status", message: "Objective status is invalid." }]
    });

    expect(validateObjective({
      id: "objective-1",
      title: "Clarify operating objective",
      status: "active"
    })).toEqual({
      valid: false,
      errors: [{ field: "createdAt", message: "Objective createdAt is required." }]
    });
  });

  it("validates a minimal OTUnit", () => {
    const result = validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1", "evidence-2"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    });

    expect(OTUNIT_STATUSES).toEqual(["proposed", "confirmed", "in_progress", "blocked", "closed"]);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects invalid OTUnit values", () => {
    expect(validateOTUnit({
      id: "otunit-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "objectiveId", message: "OTUnit objectiveId is required." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "   ",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "owner", message: "OTUnit owner is required." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "dueDate", message: "OTUnit dueDate is required." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "unexpected",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "status", message: "OTUnit status is invalid." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "evidenceRefs", message: "OTUnit evidenceRefs must be a string id array." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1", { id: "evidence-2" } as never],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "evidenceRefs", message: "OTUnit evidenceRefs must be a string id array." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1", ""],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "evidenceRefs", message: "OTUnit evidenceRefs must be a string id array." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "requiresConfirmation", message: "OTUnit requiresConfirmation is required." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: "yes" as never,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "requiresConfirmation", message: "OTUnit requiresConfirmation is required." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true
    })).toEqual({
      valid: false,
      errors: [{ field: "createdAt", message: "OTUnit createdAt is required." }]
    });
  });

  it("keeps the domain kernel pure and deterministic", () => {
    for (const relativePath of domainFiles) {
      const content = readFileSync(join(projectRoot, relativePath), "utf8");
      expectNoForbiddenText(content);
    }
  });
});
