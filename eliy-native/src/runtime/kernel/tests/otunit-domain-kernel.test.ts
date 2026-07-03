import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OBJECTIVE_STATUSES,
  validateObjective
} from "../../../domain/objective.js";
import {
  OTUNIT_STATUSES,
  type EvidenceRef,
  type OTUnit,
  type OTUnitDraftInput,
  type OTUnitRevisionInput,
  type OTUnitReviewInput,
  confirmOTUnit,
  createOTUnitReviewIntent,
  createProposedOTUnitFromDraft,
  validateEvidenceRefs,
  reviseOTUnit,
  validateOTUnitTransition,
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
  const validEvidenceRefs: EvidenceRef[] = ["evidence-1", "evidence-2"];

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
      evidenceRefs: validEvidenceRefs,
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    });

    expect(OTUNIT_STATUSES).toEqual(["proposed", "confirmed", "in_progress", "blocked", "closed"]);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("validates evidence refs that are non-empty string ids", () => {
    expect(validateEvidenceRefs(validEvidenceRefs)).toEqual({ valid: true, errors: [] });
    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: validEvidenceRefs,
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ["object evidence content", [{ id: "evidence-1", content: "do not store content here" }]],
    ["number ref", [123]],
    ["null ref", [null]],
    ["boolean ref", [true]],
    ["empty string ref", [""]],
    ["whitespace-only ref", ["   "]],
    ["mixed empty string ref", ["evidence-1", ""]],
    ["mixed whitespace-only ref", ["evidence-1", "   "]],
    ["mixed non-string ref", ["evidence-1", 123]]
  ] as const)("rejects invalid evidence refs: %s", (_name, evidenceRefs) => {
    expect(validateEvidenceRefs(evidenceRefs)).toEqual({
      valid: false,
      errors: [
        {
          field: "evidenceRefs",
          message: "evidenceRefs must be an array of non-empty string ids."
        }
      ]
    });
  });

  it.each([
    ["single duplicate", ["evidence-1", "evidence-1"]],
    ["duplicate after distinct ref", ["evidence-1", "evidence-2", "evidence-1"]]
  ] as const)("rejects duplicate evidence refs: %s", (_name, evidenceRefs) => {
    expect(() => validateEvidenceRefs(evidenceRefs)).not.toThrow();
    expect(validateEvidenceRefs(evidenceRefs)).toEqual({
      valid: false,
      errors: [
        {
          field: "evidenceRefs",
          message: "evidenceRefs must not contain duplicate refs."
        }
      ]
    });
  });

  it("keeps a requires-confirmation OTUnit in proposed state before confirmation", () => {
    const otunit: OTUnit = {
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    } as const;

    expect(otunit.status).toBe("proposed");
    expect(otunit.requiresConfirmation).toBe(true);
    expect(validateOTUnit(otunit)).toEqual({ valid: true, errors: [] });
  });

  it("moves a requires-confirmation OTUnit from proposed to confirmed", () => {
    const otunit: OTUnit = {
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    } as const;

    const result = confirmOTUnit(otunit);

    expect(result).toEqual({
      valid: true,
      otunit: {
        ...otunit,
        status: "confirmed",
        requiresConfirmation: false
      },
      errors: []
    });
    expect(otunit).toEqual({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    });
  });

  it("keeps an already confirmed OTUnit stable", () => {
    const otunit: OTUnit = {
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "confirmed",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: false,
      createdAt: "2026-07-02T00:00:00.000Z"
    } as const;

    expect(confirmOTUnit(otunit)).toEqual({
      valid: true,
      otunit,
      errors: []
    });
  });

  it.each([
    {
      status: "proposed",
      requiresConfirmation: false
    },
    {
      status: "confirmed",
      requiresConfirmation: true
    },
    {
      status: "in_progress",
      requiresConfirmation: true
    },
    {
      status: "in_progress",
      requiresConfirmation: false
    },
    {
      status: "blocked",
      requiresConfirmation: true
    },
    {
      status: "closed",
      requiresConfirmation: false
    }
  ] as const)(
    "rejects OTUnit confirmation for %s with requiresConfirmation %s",
    ({ status, requiresConfirmation }) => {
      const otunit: OTUnit = {
        id: "otunit-1",
        objectiveId: "objective-1",
        title: "Identify next operating constraint",
        owner: "user",
        dueDate: "2026-07-09",
        status,
        evidenceRefs: ["evidence-1"],
        requiresConfirmation,
        createdAt: "2026-07-02T00:00:00.000Z"
      } as const;

      expect(confirmOTUnit(otunit)).toEqual({
        valid: false,
        otunit,
        errors: [
          {
            field: "requiresConfirmation",
            message: `OTUnit confirmation is not allowed for status ${status} with requiresConfirmation ${String(requiresConfirmation)}.`
          }
        ]
      });
    }
  );

  it.each([
    ["proposed", "confirmed"],
    ["confirmed", "in_progress"],
    ["in_progress", "blocked"],
    ["blocked", "in_progress"],
    ["in_progress", "closed"],
    ["confirmed", "closed"]
  ] as const)("allows OTUnit transition %s -> %s", (from, to) => {
    expect(validateOTUnitTransition(from, to)).toEqual({
      valid: true,
      from,
      to,
      errors: []
    });
  });

  it.each([
    ["proposed", "in_progress"],
    ["proposed", "closed"],
    ["blocked", "closed"],
    ["closed", "in_progress"],
    ["closed", "proposed"],
    ["in_progress", "proposed"],
    ["confirmed", "proposed"]
  ] as const)("rejects OTUnit transition %s -> %s", (from, to) => {
    expect(validateOTUnitTransition(from, to)).toEqual({
      valid: false,
      from,
      to,
      errors: [
        {
          field: "status",
          message: `OTUnit transition from ${from} to ${to} is not allowed.`
        }
      ]
    });
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
      errors: [{ field: "evidenceRefs", message: "evidenceRefs must be an array of non-empty string ids." }]
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
      errors: [{ field: "evidenceRefs", message: "evidenceRefs must be an array of non-empty string ids." }]
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
      errors: [{ field: "evidenceRefs", message: "evidenceRefs must be an array of non-empty string ids." }]
    });

    expect(validateOTUnit({
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next operating constraint",
      owner: "user",
      dueDate: "2026-07-09",
      status: "proposed",
      evidenceRefs: ["evidence-1", "evidence-1"],
      requiresConfirmation: true,
      createdAt: "2026-07-02T00:00:00.000Z"
    })).toEqual({
      valid: false,
      errors: [{ field: "evidenceRefs", message: "evidenceRefs must not contain duplicate refs." }]
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

describe("OTUnit AI-to-OTUnit draft boundary", () => {
  const validDraft: OTUnitDraftInput = {
    id: "otunit-1",
    objectiveId: "objective-1",
    title: "Identify next operating constraint",
    owner: "user",
    dueDate: "2026-07-09",
    evidenceRefs: ["evidence-1"]
  };

  it("creates a proposed OTUnit from a valid draft input", () => {
    const result = createProposedOTUnitFromDraft(validDraft);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error("expected valid draft result");
    }

    expect(result).toEqual({
      valid: true,
      otunit: {
        id: "otunit-1",
        objectiveId: "objective-1",
        title: "Identify next operating constraint",
        owner: "user",
        dueDate: "2026-07-09",
        status: "proposed",
        evidenceRefs: ["evidence-1"],
        requiresConfirmation: true,
        createdAt: "draft-created-at"
      },
      errors: []
    });
    expect(validateOTUnit(result.otunit)).toEqual({ valid: true, errors: [] });
  });

  it.each(["confirmed", "in_progress", "blocked", "closed"] as const)(
    "rejects draft input that attempts to set status %s",
    (status) => {
      const result = createProposedOTUnitFromDraft({ ...validDraft, status });

      expect(result).toEqual({
        valid: false,
        otunit: null,
        errors: [
          { field: "status", message: "OTUnit draft input cannot set status." }
        ]
      });
    }
  );

  it("rejects draft input that attempts to set requiresConfirmation false", () => {
    const result = createProposedOTUnitFromDraft({ ...validDraft, requiresConfirmation: false });

    expect(result).toEqual({
      valid: false,
      otunit: null,
      errors: [
        { field: "requiresConfirmation", message: "OTUnit draft input cannot set requiresConfirmation." }
      ]
    });
  });

  it("rejects draft input that attempts to set requiresConfirmation true", () => {
    const result = createProposedOTUnitFromDraft({ ...validDraft, requiresConfirmation: true });

    expect(result).toEqual({
      valid: false,
      otunit: null,
      errors: [
        { field: "requiresConfirmation", message: "OTUnit draft input cannot set requiresConfirmation." }
      ]
    });
  });

  it.each([
    ["null", null, "draft"],
    ["non-object string", "not-an-object", "draft"],
    ["missing id", { objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1"] }, "id"],
    ["empty id", { id: "  ", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1"] }, "id"],
    ["missing objectiveId", { id: "otunit-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1"] }, "objectiveId"],
    ["missing title", { id: "otunit-1", objectiveId: "objective-1", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1"] }, "title"],
    ["missing owner", { id: "otunit-1", objectiveId: "objective-1", title: "t", dueDate: "2026-07-09", evidenceRefs: ["evidence-1"] }, "owner"],
    ["missing dueDate", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", evidenceRefs: ["evidence-1"] }, "dueDate"],
    ["missing evidenceRefs", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09" }, "evidenceRefs"],
    ["evidenceRefs not array", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: "evidence-1" }, "evidenceRefs"],
    ["evidenceRefs contains empty string", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1", ""] }, "evidenceRefs"],
    ["evidenceRefs contains whitespace-only string", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1", "   "] }, "evidenceRefs"],
    ["evidenceRefs contains non-string value", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1", 123] }, "evidenceRefs"],
    ["evidenceRefs contains duplicate ref", { id: "otunit-1", objectiveId: "objective-1", title: "t", owner: "u", dueDate: "2026-07-09", evidenceRefs: ["evidence-1", "evidence-1"] }, "evidenceRefs"]
  ] as const)("rejects invalid draft input: %s", (_name, input, field) => {
    const result = createProposedOTUnitFromDraft(input);

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid draft result");
    }
    expect(result.otunit).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((error) => error.field === field)).toBe(true);
  });

  it.each([
    ["empty string", { ...validDraft, evidenceRefs: [""] }],
    ["whitespace-only string", { ...validDraft, evidenceRefs: ["   "] }],
    ["non-string value", { ...validDraft, evidenceRefs: ["evidence-1", 123] }],
    ["duplicate refs", { ...validDraft, evidenceRefs: ["evidence-1", "evidence-1"] }]
  ] as const)(
    "returns deterministic evidenceRefs errors for invalid draft evidence refs: %s",
    (_name, input) => {
      expect(createProposedOTUnitFromDraft(input)).toEqual({
        valid: false,
        otunit: null,
        errors: [
          {
            field: "evidenceRefs",
            message: input.evidenceRefs[0] === "evidence-1" && input.evidenceRefs[1] === "evidence-1"
              ? "evidenceRefs must not contain duplicate refs."
              : "evidenceRefs must be an array of non-empty string ids."
          }
        ]
      });
    }
  );
});

describe("OTUnit review / revision boundary", () => {
  const otunit: OTUnit = {
    id: "otunit-1",
    objectiveId: "objective-1",
    title: "Identify next operating constraint",
    owner: "user",
    dueDate: "2026-07-09",
    status: "proposed",
    evidenceRefs: ["evidence-1"],
    requiresConfirmation: true,
    createdAt: "2026-07-02T00:00:00.000Z"
  } as const;

  const reviewInput: OTUnitReviewInput = {
    otunitId: "otunit-1",
    reviewNote: "Review next operating constraint",
    difference: "Need clearer owner and due date",
    action: "revise"
  };

  const revisionInput: OTUnitRevisionInput = {
    otunitId: "otunit-1",
    title: "Revised OTUnit title",
    owner: "user",
    dueDate: "2026-07-16",
    evidenceRefs: ["evidence-1", "evidence-2"],
    requiresConfirmation: true
  };

  it("creates a valid OTUnit review intent", () => {
    expect(createOTUnitReviewIntent(reviewInput)).toEqual({
      valid: true,
      review: reviewInput,
      errors: []
    });
  });

  it.each([
    ["null", null],
    ["non-object", "review"]
  ] as const)("rejects invalid OTUnit review input shape: %s", (_name, input) => {
    expect(createOTUnitReviewIntent(input)).toEqual({
      valid: false,
      review: null,
      errors: [
        {
          field: "otunitId",
          message: "OTUnit review otunitId must be a non-empty string."
        }
      ]
    });
  });

  it.each([
    ["null", null, "otunitId", "OTUnit review otunitId must be a non-empty string."],
    ["non-object", "review", "otunitId", "OTUnit review otunitId must be a non-empty string."],
    ["missing otunitId", { reviewNote: "Review next operating constraint", difference: "Need clearer owner and due date", action: "revise" }, "otunitId", "OTUnit review otunitId must be a non-empty string."],
    ["empty otunitId", { ...reviewInput, otunitId: "  " }, "otunitId", "OTUnit review otunitId must be a non-empty string."],
    ["whitespace-only reviewNote", { ...reviewInput, reviewNote: "   " }, "reviewNote", "OTUnit review reviewNote must be a non-empty string."],
    ["missing difference", { otunitId: "otunit-1", reviewNote: "Review next operating constraint", action: "revise" }, "difference", "OTUnit review difference must be a non-empty string."],
    ["empty action", { ...reviewInput, action: "" }, "action", "OTUnit review action must be a non-empty string."]
  ] as const)(
    "rejects invalid OTUnit review input: %s",
    (_name, input, field, message) => {
      const result = createOTUnitReviewIntent(input);

      expect(result).toEqual({
        valid: false,
        review: null,
        errors: [{ field, message }]
      });
    }
  );

  it("creates a revised OTUnit copy while preserving identity and confirmation boundaries", () => {
    const original = { ...otunit };
    const result = reviseOTUnit(otunit, revisionInput);

    expect(result).toEqual({
      valid: true,
      otunit: {
        ...otunit,
        title: "Revised OTUnit title",
        owner: "user",
        dueDate: "2026-07-16",
        evidenceRefs: ["evidence-1", "evidence-2"],
        status: "proposed",
        requiresConfirmation: true
      },
      errors: []
    });

    if (!result.valid) {
      throw new Error("expected valid revision result");
    }

    expect(validateOTUnit(result.otunit)).toEqual({ valid: true, errors: [] });
    expect(otunit).toEqual(original);
  });

  it("rejects revision input when the target OTUnit id does not match", () => {
    const result = reviseOTUnit(otunit, { ...revisionInput, otunitId: "otunit-2" });

    expect(result).toEqual({
      valid: false,
      otunit: null,
      errors: [
        {
          field: "otunitId",
          message: "OTUnit revision otunitId must match the target OTUnit id."
        }
      ]
    });
  });

  it.each([
    ["null", null],
    ["non-object", "revision"]
  ] as const)("rejects invalid OTUnit revision input shape: %s", (_name, input) => {
    expect(reviseOTUnit(otunit, input)).toEqual({
      valid: false,
      otunit: null,
      errors: [
        {
          field: "otunit",
          message: "OTUnit revision input must be an object."
        }
      ]
    });
  });

  it.each([
    ["id", { ...revisionInput, id: "otunit-2" }],
    ["objectiveId", { ...revisionInput, objectiveId: "objective-2" }],
    ["status", { ...revisionInput, status: "confirmed" }],
    ["createdAt", { ...revisionInput, createdAt: "2026-07-03T00:00:00.000Z" }]
  ] as const)("rejects injected OTUnit revision field: %s", (field, input) => {
    expect(reviseOTUnit(otunit, input)).toEqual({
      valid: false,
      otunit: null,
      errors: [
        {
          field,
          message: `OTUnit revision cannot set ${field}.`
        }
      ]
    });
  });

  it.each([
    ["empty string", { ...revisionInput, evidenceRefs: [""] }, "evidenceRefs must be an array of non-empty string ids."],
    ["whitespace-only string", { ...revisionInput, evidenceRefs: ["   "] }, "evidenceRefs must be an array of non-empty string ids."],
    ["non-string value", { ...revisionInput, evidenceRefs: ["evidence-1", 123] }, "evidenceRefs must be an array of non-empty string ids."],
    ["duplicate refs", { ...revisionInput, evidenceRefs: ["evidence-1", "evidence-1"] }, "evidenceRefs must not contain duplicate refs."],
    ["evidence content object", { ...revisionInput, evidenceRefs: [{ id: "evidence-1", content: "do not store content here" }] }, "evidenceRefs must be an array of non-empty string ids."]
  ] as const)("rejects invalid revision evidence refs: %s", (_name, input, expectedMessage) => {
    expect(reviseOTUnit(otunit, input)).toEqual({
      valid: false,
      otunit: null,
      errors: [
        {
          field: "evidenceRefs",
          message: expectedMessage
        }
      ]
    });
  });

  it("rejects revision input that disables confirmation", () => {
    expect(reviseOTUnit(otunit, { ...revisionInput, requiresConfirmation: false })).toEqual({
      valid: false,
      otunit: null,
      errors: [
        {
          field: "requiresConfirmation",
          message: "OTUnit revision requiresConfirmation must be true."
        }
      ]
    });
  });
});
