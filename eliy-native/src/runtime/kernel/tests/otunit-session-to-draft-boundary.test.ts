import { describe, expect, it } from "vitest";
import {
  createOTUnitDraftFromSession,
  createProposedOTUnitFromDraft,
  type SessionToOTUnitDraftInput
} from "../../../domain/index.js";

describe("Session-to-OTUnit draft boundary", () => {
  const validSessionInput: SessionToOTUnitDraftInput = {
    sessionId: "session-1",
    objectiveId: "objective-1",
    userText: "We need a clearer owner split.",
    assistantText: "\n  Draft next OTUnit line 1  \nline 2",
    owner: "user",
    dueDate: "2026-07-24",
    evidenceRefs: ["evidence-1", "evidence-2"]
  };

  it("creates an OTUnit draft input from valid session data", () => {
    const result = createOTUnitDraftFromSession(validSessionInput);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.draft).toEqual({
      id: "session-session-1-otunit-draft",
      objectiveId: "objective-1",
      title: "Draft next OTUnit line 1",
      owner: "user",
      dueDate: "2026-07-24",
      evidenceRefs: ["evidence-1", "evidence-2"]
    });
    expect(result.draft).not.toHaveProperty("status");
    expect(result.draft).not.toHaveProperty("requiresConfirmation");
  });

  it("feeds the draft into the existing proposed OTUnit boundary", () => {
    const draftResult = createOTUnitDraftFromSession(validSessionInput);

    expect(draftResult.valid).toBe(true);
    expect(draftResult.draft).not.toBeNull();

    const proposed = createProposedOTUnitFromDraft(draftResult.draft!);

    expect(proposed.valid).toBe(true);
    expect(proposed.otunit).not.toBeNull();
    expect(proposed.otunit?.status).toBe("proposed");
    expect(proposed.otunit?.requiresConfirmation).toBe(true);
  });

  it("ignores mutation-oriented injection fields and still returns a draft input only", () => {
    const result = createOTUnitDraftFromSession({
      ...validSessionInput,
      id: "injected-id",
      status: "confirmed",
      requiresConfirmation: false,
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(result.valid).toBe(true);
    expect(result.draft).toEqual({
      id: "session-session-1-otunit-draft",
      objectiveId: "objective-1",
      title: "Draft next OTUnit line 1",
      owner: "user",
      dueDate: "2026-07-24",
      evidenceRefs: ["evidence-1", "evidence-2"]
    });

    const proposed = createProposedOTUnitFromDraft(result.draft!);
    expect(proposed.valid).toBe(true);
    expect(proposed.otunit?.status).toBe("proposed");
    expect(proposed.otunit?.requiresConfirmation).toBe(true);
  });

  it.each([
    [
      "sessionId",
      { ...validSessionInput, sessionId: "   " },
      {
        field: "sessionId",
        message: "Session-to-OTUnit draft sessionId must be a non-empty string."
      }
    ],
    [
      "objectiveId",
      { ...validSessionInput, objectiveId: "" },
      {
        field: "objectiveId",
        message: "Session-to-OTUnit draft objectiveId must be a non-empty string."
      }
    ],
    [
      "userText",
      { ...validSessionInput, userText: " " },
      {
        field: "userText",
        message: "Session-to-OTUnit draft userText must be a non-empty string."
      }
    ],
    [
      "assistantText",
      { ...validSessionInput, assistantText: "   " },
      {
        field: "assistantText",
        message: "Session-to-OTUnit draft assistantText must be a non-empty string."
      }
    ],
    [
      "owner",
      { ...validSessionInput, owner: "" },
      {
        field: "owner",
        message: "Session-to-OTUnit draft owner must be a non-empty string."
      }
    ],
    [
      "dueDate",
      { ...validSessionInput, dueDate: "   " },
      {
        field: "dueDate",
        message: "Session-to-OTUnit draft dueDate must be a non-empty string."
      }
    ]
  ] as const)("rejects invalid %s values", (_field, input, expectedError) => {
    const result = createOTUnitDraftFromSession(input);

    expect(result.valid).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.errors).toEqual([expectedError]);
  });

  it.each([
    [
      "invalid evidence content",
      { ...validSessionInput, evidenceRefs: [{ id: "evidence-1", content: "do not store content here" }] },
      {
        field: "evidenceRefs",
        message: "evidenceRefs must be an array of non-empty string ids."
      }
    ],
    [
      "duplicate refs",
      { ...validSessionInput, evidenceRefs: ["evidence-1", "evidence-1"] },
      {
        field: "evidenceRefs",
        message: "evidenceRefs must not contain duplicate refs."
      }
    ]
  ] as const)("rejects %s", (_label, input, expectedError) => {
    const result = createOTUnitDraftFromSession(input);

    expect(result.valid).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.errors).toEqual([expectedError]);
  });
});
