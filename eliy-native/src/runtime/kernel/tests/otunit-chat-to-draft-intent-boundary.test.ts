import { describe, expect, it } from "vitest";
import { detectOTUnitDraftIntent } from "../../../domain/index.js";

import type {
  ChatToOTUnitDraftIntentInput,
  ChatToOTUnitDraftIntentResult
} from "../../../domain/index.js";

const validPositiveInput: ChatToOTUnitDraftIntentInput = {
  sessionId: "session-1",
  userText: "Please turn this into an OTUnit draft.",
  assistantText: "We identified a next action."
};

const validNegativeInput: ChatToOTUnitDraftIntentInput = {
  sessionId: "session-1",
  userText: "Please summarize this conversation.",
  assistantText: "Here is a short summary."
};

describe("Chat-to-OTUnit draft intent boundary", () => {
  it("returns positive intent metadata only for user intent phrase", () => {
    const result = detectOTUnitDraftIntent(validPositiveInput);

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");
    expect(result.confidenceLevel).toBe("high");
    expect(result.reason).toBe("Detected deterministic OTUnit draft intent phrase.");
    expect(result.requiresUserConfirmation).toBe(true);
    expect(result.errors).toEqual([]);

    expect(result).not.toHaveProperty("draft");
    expect(result).not.toHaveProperty("otunit");
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("requiresConfirmation");
  });

  it("returns positive intent metadata only for assistant intent phrase", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "What should we do next?",
      assistantText: "We can prepare an OTUnit draft."
    });

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");
    expect(result.confidenceLevel).toBe("high");
    expect(result.requiresUserConfirmation).toBe(true);
    expect(result.errors).toEqual([]);

    expect(result).not.toHaveProperty("draft");
    expect(result).not.toHaveProperty("otunit");
  });

  it("detects intent phrase 'create otunit draft' in user text", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "I want to create OTUnit draft from this session.",
      assistantText: "Session context noted."
    });

    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");
  });

  it("detects intent phrase 'draft an otunit' in user text", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "Can you draft an OTUnit please?",
      assistantText: "OK."
    });

    expect(result.intentDetected).toBe(true);
  });

  it("detects Chinese intent phrase 行动单元草稿", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "请建立行动单元草稿",
      assistantText: ""
    });

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");
    expect(result.confidenceLevel).toBe("high");
    expect(result.requiresUserConfirmation).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("detects traditional Chinese intent phrase 產生行動單元草稿", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "請產生行動單元草稿",
      assistantText: ""
    });

    expect(result.intentDetected).toBe(true);
  });

  it("returns deterministic no-intent result for unrelated conversation", () => {
    const result = detectOTUnitDraftIntent(validNegativeInput);

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(false);
    expect(result.intentType).toBeNull();
    expect(result.confidenceLevel).toBe("none");
    expect(result.reason).toBe("No deterministic OTUnit draft intent phrase detected.");
    expect(result.requiresUserConfirmation).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("ignores injection fields and still returns intent metadata only", () => {
    const result = detectOTUnitDraftIntent({
      ...validPositiveInput,
      status: "confirmed",
      requiresConfirmation: false,
      objectiveId: "objective-1",
      evidenceRefs: ["evidence-1"]
    });

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");

    expect(result).not.toHaveProperty("draft");
    expect(result).not.toHaveProperty("otunit");
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("requiresConfirmation");
    expect(result).not.toHaveProperty("OTUnitDraftInput");
    expect(result).not.toHaveProperty("OTUnit");
  });

  it("returns deterministic validation errors for non-object input", () => {
    const result = detectOTUnitDraftIntent(null);

    expect(result.valid).toBe(false);
    expect(result.intentDetected).toBe(false);
    expect(result.intentType).toBeNull();
    expect(result.confidenceLevel).toBe("none");
    expect(result.reason).toBe("Invalid chat-to-OTUnit draft intent input.");
    expect(result.requiresUserConfirmation).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "sessionId",
        message: "Chat-to-OTUnit draft intent sessionId must be a non-empty string."
      }
    ]);
  });

  it("returns deterministic validation errors for blank sessionId", () => {
    const result = detectOTUnitDraftIntent({
      ...validPositiveInput,
      sessionId: "   "
    });

    expect(result.valid).toBe(false);
    expect(result.intentDetected).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "sessionId",
        message: "Chat-to-OTUnit draft intent sessionId must be a non-empty string."
      }
    ]);
  });

  it("returns deterministic validation errors for blank userText", () => {
    const result = detectOTUnitDraftIntent({
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
    const result = detectOTUnitDraftIntent({
      ...validPositiveInput,
      assistantText: 123
    });

    expect(result.valid).toBe(false);
    expect(result.intentDetected).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "assistantText",
        message: "Chat-to-OTUnit draft intent assistantText must be a string."
      }
    ]);
  });

  it("returns deterministic validation errors for empty string userText (whitespace-only)", () => {
    const result = detectOTUnitDraftIntent({
      ...validPositiveInput,
      userText: "   "
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "userText",
        message: "Chat-to-OTUnit draft intent userText must be a non-empty string."
      }
    ]);
  });

  it("returns positive intent even when assistantText is empty string (intent in userText only)", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "Create an OTUnit draft please.",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(true);
    expect(result.intentType).toBe("otunit_draft");
    expect(result.requiresUserConfirmation).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns positive intent for 'turn this into an otunit draft'", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "Let's turn this into an otunit draft now.",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(true);
  });

  it("returns positive intent for 'convert this session into an otunit draft'", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "Please convert this session into an otunit draft.",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(true);
  });

  it("returns positive intent for 'prepare otunit draft'", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "Let's prepare OTUnit draft for this.",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(true);
  });

  it("returns positive intent for 'make otunit draft'", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "Make otunit draft please.",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(true);
  });

  it("returns positive intent for Chinese 创建行动单元草稿", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "请创建行动单元草稿",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(true);
  });

  it("does not create, confirm, persist, or mutate an OTUnit on positive intent", () => {
    const result = detectOTUnitDraftIntent(validPositiveInput);

    expect(result.valid).toBe(true);
    expect(result.intentDetected).toBe(true);

    const keys = Object.keys(result);
    const expectedKeys = [
      "valid",
      "intentDetected",
      "intentType",
      "confidenceLevel",
      "reason",
      "requiresUserConfirmation",
      "errors"
    ].sort();
    expect(keys.sort()).toEqual(expectedKeys);

    // Confirm no mutation-oriented fields
    const resultRecord = result as Record<string, unknown>;
    expect(resultRecord).not.toHaveProperty("draft");
    expect(resultRecord).not.toHaveProperty("otunit");
    expect(resultRecord).not.toHaveProperty("status");
    expect(resultRecord).not.toHaveProperty("requiresConfirmation");
    expect(resultRecord).not.toHaveProperty("persistence");
    expect(resultRecord).not.toHaveProperty("provider");
  });

  it("normalizes whitespace and case in intent detection", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "   CREATE   OTUNIT   DRAFT   ",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(true);
  });

  it("does not detect intent for partial phrase match", () => {
    const result = detectOTUnitDraftIntent({
      sessionId: "session-1",
      userText: "I need to draft something for the otunit.",
      assistantText: ""
    } as ChatToOTUnitDraftIntentInput);

    expect(result.intentDetected).toBe(false);
  });
});
