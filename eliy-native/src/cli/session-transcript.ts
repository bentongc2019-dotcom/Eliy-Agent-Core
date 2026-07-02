import { randomUUID } from "node:crypto";

export type SessionTranscriptRole = "user" | "assistant";

export type SessionTranscriptTurn = {
  role: SessionTranscriptRole;
  content: string;
};

export type SessionTranscript = {
  sessionId: string;
  turns: SessionTranscriptTurn[];
};

export function createSessionTranscript(): SessionTranscript {
  return {
    sessionId: randomUUID(),
    turns: []
  };
}

export function recordSessionTranscriptTurn(
  transcript: SessionTranscript,
  turn: SessionTranscriptTurn
): void {
  transcript.turns.push({
    role: turn.role,
    content: turn.content
  });
}

export function formatSessionTranscriptDebugSummary(transcript: SessionTranscript): string {
  const lines = [
    "Eliy session transcript debug summary",
    `session_id: ${transcript.sessionId}`,
    `turn_count: ${transcript.turns.length}`
  ];

  transcript.turns.forEach((turn, index) => {
    lines.push(`${index + 1}. ${turn.role}: ${turn.content}`);
  });

  return lines.join("\n");
}
