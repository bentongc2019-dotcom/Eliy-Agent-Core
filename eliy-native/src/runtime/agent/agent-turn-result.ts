import { z } from "zod";

export const AGENT_TURN_ORDINARY_CONTENT_MAX_LENGTH = 4_000;
export const AGENT_TURN_CAPABILITY_INPUT_MAX_LENGTH = 4_000;

const AgentTurnResultSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ordinary_response"),
      content: z
        .string()
        .trim()
        .min(1)
        .max(AGENT_TURN_ORDINARY_CONTENT_MAX_LENGTH),
    })
    .strict(),
  z
    .object({
      kind: z.literal("capability_call"),
      capabilityId: z.literal("evidence-extract"),
      input: z
        .string()
        .trim()
        .min(1)
        .max(AGENT_TURN_CAPABILITY_INPUT_MAX_LENGTH),
    })
    .strict(),
]);

export type AgentTurnResult = z.infer<typeof AgentTurnResultSchema>;

export function parseAgentTurnResult(rawText: string): AgentTurnResult {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("Invalid AgentTurnResult: response must be strict JSON");
  }

  const parsed = AgentTurnResultSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error("Invalid AgentTurnResult: schema validation failed");
  }

  return parsed.data;
}
