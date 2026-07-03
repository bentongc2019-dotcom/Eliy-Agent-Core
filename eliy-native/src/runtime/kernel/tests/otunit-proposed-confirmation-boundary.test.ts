import { describe, expect, it } from "vitest";
import { confirmProposedOTUnit } from "../../../domain/index.js";

import type { OTUnit, ConfirmProposedOTUnitInput } from "../../../domain/index.js";

function validProposedOTUnit(): OTUnit {
  return {
    id: "otunit-1",
    objectiveId: "objective-1",
    title: "Identify next constraint",
    owner: "user",
    dueDate: "2026-07-10",
    status: "proposed",
    evidenceRefs: ["evidence-1"],
    requiresConfirmation: true,
    createdAt: "2026-07-03T00:00:00.000Z"
  };
}

function validConfirmationInput(): ConfirmProposedOTUnitInput {
  return {
    otunit: validProposedOTUnit(),
    userConfirmationSignal: "confirmed",
    confirmedAt: "2026-07-03T12:00:00.000Z"
  };
}

describe("Proposed OTUnit confirmation boundary", () => {
  it("confirms a proposed OTUnit with explicit confirmation signal", () => {
    const result = confirmProposedOTUnit(validConfirmationInput());

    expect(result.valid).toBe(true);
    expect(result.otunit).not.toBeNull();
    expect(result.otunit!.status).toBe("confirmed");
    expect(result.otunit!.requiresConfirmation).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("preserves existing OTUnit fields after confirmation", () => {
    const result = confirmProposedOTUnit(validConfirmationInput());

    expect(result.otunit!.id).toBe("otunit-1");
    expect(result.otunit!.objectiveId).toBe("objective-1");
    expect(result.otunit!.title).toBe("Identify next constraint");
    expect(result.otunit!.owner).toBe("user");
    expect(result.otunit!.dueDate).toBe("2026-07-10");
    expect(result.otunit!.evidenceRefs).toEqual(["evidence-1"]);
    expect(result.otunit!.createdAt).toBe("2026-07-03T00:00:00.000Z");
  });

  it("rejects ambiguous confirmation signals", () => {
    const ambiguousSignals = [
      "差不多",
      "应该可以",
      "你看着办",
      "大概这样",
      "之后再说",
      "maybe",
      "probably",
      "looks good"
    ];

    for (const signal of ambiguousSignals) {
      const input = { ...validConfirmationInput(), userConfirmationSignal: signal };
      const result = confirmProposedOTUnit(input);

      expect(result.valid).toBe(false);
      expect(result.otunit).toBeNull();
      expect(result.errors[0].field).toBe("userConfirmationSignal");
    }
  });

  it("rejects unrecognized confirmation signals", () => {
    const result = confirmProposedOTUnit({
      ...validConfirmationInput(),
      userConfirmationSignal: "unclear"
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("userConfirmationSignal");
  });

  it("rejects missing OTUnit", () => {
    const result = confirmProposedOTUnit(null);

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("otunit");
  });

  it("rejects null OTUnit", () => {
    const result = confirmProposedOTUnit({
      otunit: null,
      userConfirmationSignal: "confirmed",
      confirmedAt: "2026-07-03T12:00:00.000Z"
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("otunit");
  });

  it("rejects missing userConfirmationSignal", () => {
    const result = confirmProposedOTUnit({
      otunit: validProposedOTUnit(),
      userConfirmationSignal: "",
      confirmedAt: "2026-07-03T12:00:00.000Z"
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors.some((e) => e.field === "userConfirmationSignal")).toBe(true);
  });

  it("rejects missing confirmedAt", () => {
    const result = confirmProposedOTUnit({
      otunit: validProposedOTUnit(),
      userConfirmationSignal: "confirmed",
      confirmedAt: ""
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors.some((e) => e.field === "confirmedAt")).toBe(true);
  });

  it("rejects non-proposed OTUnit statuses", () => {
    const statuses = ["confirmed", "in_progress", "blocked", "closed"];

    for (const status of statuses) {
      const otunit: OTUnit = {
        ...validProposedOTUnit(),
        status: status as OTUnit["status"]
      };
      const result = confirmProposedOTUnit({
        otunit,
        userConfirmationSignal: "confirmed",
        confirmedAt: "2026-07-03T12:00:00.000Z"
      });

      expect(result.valid).toBe(false);
      expect(result.otunit).toBeNull();
      expect(result.errors[0].field).toBe("otunit.status");
    }
  });

  it("rejects already-confirmed OTUnit", () => {
    const otunit: OTUnit = {
      ...validProposedOTUnit(),
      status: "confirmed",
      requiresConfirmation: false
    };
    const result = confirmProposedOTUnit({
      otunit,
      userConfirmationSignal: "confirmed",
      confirmedAt: "2026-07-03T12:00:00.000Z"
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("otunit.status");
  });

  it("does not call confirmOTUnit with invalid OTUnit states", () => {
    // An already-confirmed OTUnit should not reach confirmOTUnit
    const input: ConfirmProposedOTUnitInput = {
      ...validConfirmationInput(),
      otunit: {
        ...validProposedOTUnit(),
        status: "confirmed",
        requiresConfirmation: false
      }
    };
    const result = confirmProposedOTUnit(input);

    expect(result.valid).toBe(false);
  });

  it("accepts Chinese explicit confirmation signals", () => {
    const signals = ["确认", "我确认", "明确确认"];

    for (const signal of signals) {
      const result = confirmProposedOTUnit({
        ...validConfirmationInput(),
        userConfirmationSignal: signal
      });

      expect(result.valid).toBe(true);
      expect(result.otunit!.status).toBe("confirmed");
      expect(result.otunit!.requiresConfirmation).toBe(false);
    }
  });
});
