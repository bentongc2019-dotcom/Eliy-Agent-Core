import { describe, expect, it } from "vitest";

import {
  AGENT_TURN_CAPABILITY_INPUT_MAX_LENGTH,
  AGENT_TURN_ORDINARY_CONTENT_MAX_LENGTH,
  parseAgentTurnResult,
} from "../../agent/agent-turn-result";

describe("AgentTurnResult", () => {
  it("accepts a bounded ordinary response as the final model output", () => {
    expect(
      parseAgentTurnResult(
        JSON.stringify({
          kind: "ordinary_response",
          content: "Here is the concise rewrite.",
        }),
      ),
    ).toEqual({
      kind: "ordinary_response",
      content: "Here is the concise rewrite.",
    });
  });

  it("accepts only an evidence-extract capability call", () => {
    expect(
      parseAgentTurnResult(
        JSON.stringify({
          kind: "capability_call",
          capabilityId: "evidence-extract",
          input: "Separate this report, inference, and recommendation.",
        }),
      ),
    ).toEqual({
      kind: "capability_call",
      capabilityId: "evidence-extract",
      input: "Separate this report, inference, and recommendation.",
    });
  });

  it("rejects an unknown result kind", () => {
    expect(() =>
      parseAgentTurnResult(
        JSON.stringify({ kind: "route_decision", content: "hidden" }),
      ),
    ).toThrow("Invalid AgentTurnResult");
  });

  it("rejects an unknown capability", () => {
    expect(() =>
      parseAgentTurnResult(
        JSON.stringify({
          kind: "capability_call",
          capabilityId: "unknown-skill",
          input: "bounded input",
        }),
      ),
    ).toThrow("Invalid AgentTurnResult");
  });

  it("rejects malformed or extra decision fields", () => {
    expect(() => parseAgentTurnResult("not-json")).toThrow(
      "Invalid AgentTurnResult",
    );
    expect(() =>
      parseAgentTurnResult(
        JSON.stringify({
          kind: "ordinary_response",
          content: "bounded response",
          reasonCode: "clear_low_risk_request",
        }),
      ),
    ).toThrow("Invalid AgentTurnResult");
  });

  it("enforces explicit content and capability input length boundaries", () => {
    expect(() =>
      parseAgentTurnResult(
        JSON.stringify({
          kind: "ordinary_response",
          content: "x".repeat(AGENT_TURN_ORDINARY_CONTENT_MAX_LENGTH + 1),
        }),
      ),
    ).toThrow("Invalid AgentTurnResult");
    expect(() =>
      parseAgentTurnResult(
        JSON.stringify({
          kind: "capability_call",
          capabilityId: "evidence-extract",
          input: "x".repeat(AGENT_TURN_CAPABILITY_INPUT_MAX_LENGTH + 1),
        }),
      ),
    ).toThrow("Invalid AgentTurnResult");
  });
});
