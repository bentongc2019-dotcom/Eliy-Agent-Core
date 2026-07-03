import { describe, expect, it } from "vitest";
import {
  createProposedOTUnitFromConfirmedPreview,
  previewOTUnitDraftFromChat
} from "../../../domain/index.js";

function buildValidPreviewInput() {
  return {
    sessionId: "session-1",
    userText: "Please turn this into an OTUnit draft.",
    assistantText: "Complete the first customer interview batch."
  };
}

function buildValidConfirmationInput() {
  const preview = previewOTUnitDraftFromChat(buildValidPreviewInput());
  return {
    draftPreview: preview.draftPreview,
    userConfirmationSignal: "confirmed",
    objectiveId: "objective-1",
    owner: "rich",
    dueDate: "2026-07-31",
    createdAt: "2026-07-03T00:00:00.000Z"
  };
}

describe("Confirmed preview to proposed OTUnit boundary", () => {
  it("explicit confirmation creates only proposed OTUnit", () => {
    const result = createProposedOTUnitFromConfirmedPreview(
      buildValidConfirmationInput()
    );

    expect(result.valid).toBe(true);
    expect(result.otunit).not.toBeNull();
    expect(result.otunit!.status).toBe("proposed");
    expect(result.otunit!.requiresConfirmation).toBe(true);
    expect(result.otunit!.objectiveId).toBe("objective-1");
    expect(result.otunit!.owner).toBe("rich");
    expect(result.errors).toEqual([]);
  });

  it("explicit preview confirmation does not confirm OTUnit", () => {
    const result = createProposedOTUnitFromConfirmedPreview(
      buildValidConfirmationInput()
    );

    expect(result.otunit!.status).toBe("proposed");
    expect(result.otunit!.requiresConfirmation).toBe(true);
    expect(result.otunit!.status).not.toBe("confirmed");
    expect(result.otunit!).not.toHaveProperty("confirmedAt");
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
      const input = { ...buildValidConfirmationInput(), userConfirmationSignal: signal };
      const result = createProposedOTUnitFromConfirmedPreview(input);

      expect(result.valid).toBe(false);
      expect(result.otunit).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe("userConfirmationSignal");
    }
  });

  it("missing draftPreview returns deterministic errors", () => {
    const input = {
      userConfirmationSignal: "confirmed",
      objectiveId: "objective-1",
      owner: "rich",
      dueDate: "2026-07-31",
      createdAt: "2026-07-03T00:00:00.000Z"
    };
    const result = createProposedOTUnitFromConfirmedPreview(input);

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("draftPreview");
  });

  it("missing required fields return deterministic errors", () => {
    const fields: [string, Record<string, unknown>][] = [
      ["userConfirmationSignal", { ...buildValidConfirmationInput(), userConfirmationSignal: "" }],
      ["objectiveId", { ...buildValidConfirmationInput(), objectiveId: "" }],
      ["owner", { ...buildValidConfirmationInput(), owner: "  " }],
      ["dueDate", { ...buildValidConfirmationInput(), dueDate: "   " }],
      ["createdAt", { ...buildValidConfirmationInput(), createdAt: "" }]
    ];

    for (const [field, input] of fields) {
      const result = createProposedOTUnitFromConfirmedPreview(input);

      expect(result.valid).toBe(false);
      expect(result.otunit).toBeNull();
      expect(result.errors.some((e) => e.field === field)).toBe(true);
    }
  });

  it("no-intent input does not create OTUnit", () => {
    const preview = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "Please summarize this conversation.",
      assistantText: "Here is a summary."
    });

    const result = createProposedOTUnitFromConfirmedPreview({
      draftPreview: preview.draftPreview,
      userConfirmationSignal: "confirmed",
      objectiveId: "objective-1",
      owner: "rich",
      dueDate: "2026-07-31",
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("draftPreview");
  });

  it("injection fields cannot override status or confirmation", () => {
    const result = createProposedOTUnitFromConfirmedPreview({
      ...buildValidConfirmationInput(),
      status: "confirmed",
      requiresConfirmation: false,
      confirmedAt: "2026-07-03T00:00:00.000Z"
    } as unknown as Parameters<typeof createProposedOTUnitFromConfirmedPreview>[0]);

    expect(result.otunit!.status).toBe("proposed");
    expect(result.otunit!.requiresConfirmation).toBe(true);
    expect(result.otunit!).not.toHaveProperty("confirmedAt");
  });

  it("non-object input returns deterministic errors", () => {
    const result = createProposedOTUnitFromConfirmedPreview(null);

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("draftPreview");
  });

  it("non-null draftPreview input returns deterministic errors", () => {
    const result = createProposedOTUnitFromConfirmedPreview({
      draftPreview: null,
      userConfirmationSignal: "confirmed",
      objectiveId: "objective-1",
      owner: "rich",
      dueDate: "2026-07-31",
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(result.valid).toBe(false);
    expect(result.otunit).toBeNull();
    expect(result.errors[0].field).toBe("draftPreview");
  });
});
