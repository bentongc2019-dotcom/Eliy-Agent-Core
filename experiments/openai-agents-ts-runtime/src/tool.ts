import { join } from "node:path";
import { tool } from "@openai/agents";
import { z } from "zod";
import { evaluateHacGate } from "./hac-gate.js";
import { appendJsonl, logsDir, nowIso, readJson, writeJson } from "./storage.js";

export const PrepareRefundInput = z.object({
  amount: z.number(),
  reason: z.string()
});

export type PrepareRefundArgs = z.infer<typeof PrepareRefundInput>;

export type ToolExecutionRecord = {
  toolName: "prepare_refund";
  callId?: string;
  arguments: PrepareRefundArgs;
  timestamp: string;
  currentTurn?: unknown;
  resumeState?: string;
  fromApproveResume: boolean;
};

const executionLogPath = join(logsDir, "tool-executions.json");

export async function resetToolExecutions(): Promise<void> {
  await writeJson(executionLogPath, []);
}

export async function getToolExecutionCount(): Promise<number> {
  const existing = await readJson<ToolExecutionRecord[]>(executionLogPath).catch(() => []);
  return existing.length;
}

export async function recordToolExecution(record: ToolExecutionRecord): Promise<void> {
  const existing = await readJson<ToolExecutionRecord[]>(executionLogPath).catch(() => []);
  await writeJson(executionLogPath, [...existing, record]);
  await appendJsonl(join(logsDir, "events.jsonl"), {
    type: "tool_started",
    toolName: record.toolName,
    callId: record.callId,
    timestamp: record.timestamp
  });
  await appendJsonl(join(logsDir, "events.jsonl"), {
    type: "tool_result",
    toolName: record.toolName,
    callId: record.callId,
    timestamp: nowIso()
  });
}

export const prepareRefundTool = tool({
  name: "prepare_refund",
  description:
    "Prepare a mock refund proposal. This spike tool never issues a real refund and only writes a local execution log.",
  parameters: PrepareRefundInput,
  strict: true,
  needsApproval: async () => evaluateHacGate("prepare_refund").requiresHumanApproval,
  execute: async (input, _context, details) => {
    const args = PrepareRefundInput.parse(input);
    await recordToolExecution({
      toolName: "prepare_refund",
      callId: details?.toolCall?.callId,
      arguments: args,
      timestamp: nowIso(),
      currentTurn: undefined,
      resumeState: details?.resumeState,
      fromApproveResume: Boolean(details?.resumeState)
    });
    return {
      ok: true,
      effect: "mock-only",
      message: `Mock refund prepared for ${args.amount}: ${args.reason}`
    };
  }
});
