import { describe, expect, it } from "vitest";
import {
  createSessionTranscript,
  formatSessionTranscriptDebugSummary,
  recordSessionTranscriptTurn
} from "../../../cli/session-transcript.js";

describe("Session transcript boundary", () => {
  it("creates transient session ids and starts with no turns", () => {
    const first = createSessionTranscript();
    const second = createSessionTranscript();

    expect(first.sessionId).toBeTruthy();
    expect(second.sessionId).toBeTruthy();
    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first.turns).toEqual([]);
    expect(second.turns).toEqual([]);
  });

  it("records user and assistant turns in memory and formats a debug summary", () => {
    const transcript = createSessionTranscript();
    recordSessionTranscriptTurn(transcript, { role: "user", content: "hello" });
    recordSessionTranscriptTurn(transcript, { role: "assistant", content: "skeleton response received: hello" });

    expect(transcript.turns).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "skeleton response received: hello" }
    ]);

    const summary = formatSessionTranscriptDebugSummary(transcript);
    expect(summary).toMatch(/Eliy session transcript debug summary/);
    expect(summary).toMatch(new RegExp(`session_id: ${transcript.sessionId}`));
    expect(summary).toMatch(/turn_count: 2/);
    expect(summary).toMatch(/1\. user: hello/);
    expect(summary).toMatch(/2\. assistant: skeleton response received: hello/);
  });
});
