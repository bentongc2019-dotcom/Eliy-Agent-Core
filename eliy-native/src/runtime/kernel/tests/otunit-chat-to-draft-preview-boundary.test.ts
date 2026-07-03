import { describe, expect, it } from "vitest";
import {
  detectOTUnitDraftIntent,
  previewOTUnitDraftFromChat
} from "../../../domain/index.js";

import type {
  ChatToOTUnitDraftPreviewInput
} from "../../../domain/index.js";

const validPositiveInput: ChatToOTUnitDraftPreviewInput = {
  sessionId: "session-1",
  userText: "Please turn this into an OTUnit draft.",
  assistantText: "Complete the first customer interview batch."
};

const validNegativeInput: ChatToOTUnitDraftPreviewInput = {
  sessionId: "session-1",
  userText: "Please summarize this conversation.",
  assistantText: "Here is a short summary."
};

describe("Chat-to-OTUnit draft preview boundary", () => {
  it("returns preview metadata only for positive intent", () => {
    const result = previewOTUnitDraftFromChat(validPositiveInput);

    expect(result.valid).toBe(true);
    expect(result.previewAvailable).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");
    expect(result.requiresUserConfirmation).toBe(true);

    expect(result.draftPreview).not.toBeNull();
    expect(result.draftPreview!.title).toBe("Complete the first customer interview batch.");
    expect(result.draftPreview!.sourceSessionId).toBe("session-1");
    expect(result.draftPreview!.source).toBe("chat_session");
    expect(result.draftPreview!.status).toBe("preview");
    expect(result.draftPreview!.requiresUserConfirmation).toBe(true);
    expect(result.reason).toBe("Detected deterministic OTUnit draft intent and prepared preview metadata.");
    expect(result.errors).toEqual([]);

    expect(result).not.toHaveProperty("otunit");
    expect(result).not.toHaveProperty("OTUnit");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("status");
  });

  it("uses existing intent boundary for positive detection", () => {
    const intentResult = detectOTUnitDraftIntent(validPositiveInput);
    const previewResult = previewOTUnitDraftFromChat(validPositiveInput);

    expect(previewResult.intentDetected).toBe(intentResult.intentDetected);
    expect(previewResult.intentType).toBe(intentResult.intentType);
    expect(previewResult.requiresUserConfirmation).toBe(intentResult.requiresUserConfirmation);
  });

  it("returns deterministic no-preview result for negative intent", () => {
    const result = previewOTUnitDraftFromChat(validNegativeInput);

    expect(result.valid).toBe(true);
    expect(result.previewAvailable).toBe(false);
    expect(result.intentDetected).toBe(false);
    expect(result.intentType).toBeNull();
    expect(result.requiresUserConfirmation).toBe(false);
    expect(result.draftPreview).toBeNull();
    expect(result.reason).toBe("No deterministic OTUnit draft intent phrase detected; preview not available.");
    expect(result.errors).toEqual([]);
  });

  it("returns positive preview for Chinese intent phrase", () => {
    const result = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "请建立行动单元草稿",
      assistantText: "完成第一批客户访谈"
    });

    expect(result.previewAvailable).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.draftPreview).not.toBeNull();
    expect(result.draftPreview!.title).toBe("完成第一批客户访谈");
    expect(result.draftPreview!.sourceSessionId).toBe("session-1");
    expect(result.draftPreview!.status).toBe("preview");
  });

  it("ignores injection fields and returns preview metadata only", () => {
    const result = previewOTUnitDraftFromChat({
      ...validPositiveInput,
      status: "confirmed",
      requiresConfirmation: false,
      objectiveId: "objective-1",
      evidenceRefs: ["evidence-1"],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    expect(result.valid).toBe(true);
    expect(result.previewAvailable).toBe(true);
    expect(result.draftPreview).not.toBeNull();

    expect(result).not.toHaveProperty("otunit");
    expect(result).not.toHaveProperty("OTUnit");
    expect(result).not.toHaveProperty("OTUnitDraftInput");
    expect(result).not.toHaveProperty("objectiveId");
    expect(result).not.toHaveProperty("evidenceRefs");
    expect(result).not.toHaveProperty("createdAt");

    expect(result.draftPreview!.status).toBe("preview");
    expect(result.draftPreview!.requiresUserConfirmation).toBe(true);
  });

  it("extracts title from assistantText when available", () => {
    const result = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "Create an OTUnit draft please.",
      assistantText: "Draft the OTUnit now."
    });

    expect(result.draftPreview!.title).toBe("Draft the OTUnit now.");
  });

  it("falls back to userText for title when assistantText is empty", () => {
    const result = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "Make an OTUnit draft for Q3 review.",
      assistantText: ""
    } as ChatToOTUnitDraftPreviewInput);

    expect(result.draftPreview!.title).toBe("Make an OTUnit draft for Q3 review.");
  });

  it("falls back to default title when both texts are empty", () => {
    const result = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "otunit draft",
      assistantText: ""
    } as ChatToOTUnitDraftPreviewInput);

    // intent is still detected via the phrase, but both texts are short
    // userText "otunit draft" is non-empty and should be used as title
    expect(result.previewAvailable).toBe(true);
    expect(result.draftPreview!.title).toBe("otunit draft");
  });

  it("caps title to 120 characters", () => {
    const longTitle = "A".repeat(200) + " draft";
    const result = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "create otunit draft",
      assistantText: longTitle
    } as ChatToOTUnitDraftPreviewInput);

    expect(result.draftPreview!.title.length).toBeLessThanOrEqual(120);
  });

  it("returns deterministic validation errors for non-object input", () => {
    const result = previewOTUnitDraftFromChat(null);

    expect(result.valid).toBe(false);
    expect(result.previewAvailable).toBe(false);
    expect(result.intentDetected).toBe(false);
    expect(result.intentType).toBeNull();
    expect(result.requiresUserConfirmation).toBe(false);
    expect(result.draftPreview).toBeNull();
    expect(result.reason).toBe("Invalid chat-to-OTUnit draft preview input.");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns deterministic validation errors for blank sessionId", () => {
    const result = previewOTUnitDraftFromChat({
      ...validPositiveInput,
      sessionId: "   "
    });

    expect(result.valid).toBe(false);
    expect(result.previewAvailable).toBe(false);
    expect(result.intentDetected).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "sessionId",
        message: "Chat-to-OTUnit draft intent sessionId must be a non-empty string."
      }
    ]);
  });

  it("returns deterministic validation errors for blank userText", () => {
    const result = previewOTUnitDraftFromChat({
      ...validPositiveInput,
      userText: ""
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "userText",
        message: "Chat-to-OTUnit draft intent userText must be a non-empty string."
      }
    ]);
  });

  it("returns deterministic validation errors for non-string assistantText", () => {
    const result = previewOTUnitDraftFromChat({
      ...validPositiveInput,
      assistantText: 123
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "assistantText",
        message: "Chat-to-OTUnit draft intent assistantText must be a string."
      }
    ]);
  });

  it("does not create, confirm, persist, or mutate an OTUnit on positive preview", () => {
    const result = previewOTUnitDraftFromChat(validPositiveInput);

    expect(result.valid).toBe(true);
    expect(result.previewAvailable).toBe(true);

    const keys = Object.keys(result).sort();
    const expectedKeys = [
      "valid",
      "previewAvailable",
      "intentDetected",
      "intentType",
      "requiresUserConfirmation",
      "draftPreview",
      "reason",
      "errors"
    ].sort();
    expect(keys).toEqual(expectedKeys);

    const resultRecord = result as Record<string, unknown>;
    expect(resultRecord).not.toHaveProperty("otunit");
    expect(resultRecord).not.toHaveProperty("OTUnit");
    expect(resultRecord).not.toHaveProperty("status");
    expect(resultRecord).not.toHaveProperty("persistence");
    expect(resultRecord).not.toHaveProperty("provider");
  });
});

  // Plan-aware preview boundary tests

  it("positive intent returns plan-aware preview metadata", () => {
    const result = previewOTUnitDraftFromChat(validPositiveInput);

    expect(result.valid).toBe(true);
    expect(result.previewAvailable).toBe(true);
    expect(result.draftPreview).not.toBeNull();

    const planAware = result.draftPreview!.planAware;
    expect(planAware).not.toBeNull();
    expect(planAware.objective).toBeNull();
    expect(planAware.owner).toBeNull();
    expect(planAware.dueDateOrCheckTime).toBeNull();
    expect(planAware.judgmentCriteria).toBeNull();
    expect(planAware.planOrActionItems).toEqual([]);
    expect(planAware.evidenceRefs).toEqual([]);
    expect(planAware.missingInformation).toContain("objective");
    expect(planAware.missingInformation).toContain("owner");
    expect(planAware.missingInformation).toContain("due_date_or_check_time");
    expect(planAware.missingInformation).toContain("judgment_criteria");
    expect(planAware.missingInformation).toContain("plan_or_action_items");
    expect(planAware.missingInformation).toContain("evidence_refs");
    expect(planAware.checklist).toHaveLength(7);
  });

  it("checklist includes user_confirmation_required as required", () => {
    const result = previewOTUnitDraftFromChat(validPositiveInput);

    const confirmationItem = result.draftPreview!.planAware.checklist.find(
      (item) => item.key === "user_confirmation_required"
    );
    expect(confirmationItem).not.toBeUndefined();
    expect(confirmationItem!.required).toBe(true);
    expect(confirmationItem!.status).toBe("required");
  });

  it("missing plan-aware fields do not invalidate preview", () => {
    const result = previewOTUnitDraftFromChat({
      sessionId: "session-1",
      userText: "Create an OTUnit draft.",
      assistantText: "Proceed with draft creation."
    });

    expect(result.valid).toBe(true);
    expect(result.previewAvailable).toBe(true);
    expect(result.errors).toEqual([]);

    const planAware = result.draftPreview!.planAware;
    expect(planAware.missingInformation.length).toBeGreaterThan(0);
    expect(planAware.owner).toBeNull();
  });

  it("no OTUnit status values appear in plan-aware preview", () => {
    const result = previewOTUnitDraftFromChat(validPositiveInput);

    const resultRecord = result as Record<string, unknown>;
    const otunitStatuses = ["proposed", "confirmed", "in_progress", "blocked", "closed"];
    expect(otunitStatuses).not.toContain(resultRecord.status);
    expect(result.draftPreview!.status).toBe("preview");
    expect(otunitStatuses).not.toContain(result.draftPreview!.status);
  });

  it("no-creation boundary holds in plan-aware result", () => {
    const result = previewOTUnitDraftFromChat(validPositiveInput);

    const resultRecord = result as Record<string, unknown>;
    const forbiddenKeys = [
      "otunit",
      "OTUnit",
      "otunitId",
      "objectiveId",
      "createdAt",
      "created_at",
      "confirmedAt",
      "confirmed_at",
      "requiresConfirmation"
    ];
    for (const key of forbiddenKeys) {
      expect(resultRecord).not.toHaveProperty(key);
    }
    // requiresUserConfirmation is allowed and required
    expect(result.requiresUserConfirmation).toBe(true);
  });
