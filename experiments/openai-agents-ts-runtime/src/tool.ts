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

export const SendReleaseStatusUpdateInput = z.object({
  audience: z.string(),
  status: z.string(),
  message: z.string()
});

export type SendReleaseStatusUpdateArgs = z.infer<typeof SendReleaseStatusUpdateInput>;

export type ToolExecutionRecord = {
  toolName: "prepare_refund" | "send_release_status_update";
  callId?: string;
  arguments: PrepareRefundArgs | SendReleaseStatusUpdateArgs;
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

export async function getToolExecutionCountByName(
  toolName: ToolExecutionRecord["toolName"]
): Promise<number> {
  const existing = await readJson<ToolExecutionRecord[]>(executionLogPath).catch(() => []);
  return existing.filter((record) => record.toolName === toolName).length;
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
  needsApproval: async (_context, _input, callId) =>
    evaluateHacGate({
      actionId: callId ?? "prepare_refund",
      actionType: "prepare_refund",
      hasExternalSideEffect: true,
      requiresHumanValueJudgment: false,
      prohibited: false
    }).requiresHumanApproval,
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

export const sendReleaseStatusUpdateTool = tool({
  name: "send_release_status_update",
  description:
    "Send a mock release status update to a predefined external audience. This spike tool never sends a real message and only writes a local execution log.",
  parameters: SendReleaseStatusUpdateInput,
  strict: true,
  needsApproval: async (_context, _input, callId) =>
    evaluateHacGate({
      actionId: callId ?? "send_release_status_update",
      actionType: "send_release_status_update",
      hasExternalSideEffect: true,
      requiresHumanValueJudgment: false,
      prohibited: false
    }).requiresHumanApproval,
  execute: async (input, _context, details) => {
    const args = SendReleaseStatusUpdateInput.parse(input);
    await recordToolExecution({
      toolName: "send_release_status_update",
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
      message: `Mock release status update prepared for ${args.audience}: ${args.status}`
    };
  }
});
