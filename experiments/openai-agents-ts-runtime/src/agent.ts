import { Agent, setTracingDisabled, type RunToolApprovalItem } from "@openai/agents";
import { prepareRefundTool } from "./tool.js";

export const DEFAULT_MODEL_NOTE = "SDK default model when OPENAI_MODEL is absent";

export function disableTracingExport(): void {
  setTracingDisabled(true);
}

export function createRefundAgent(model?: string): Agent {
  return new Agent({
    name: "HAC Runtime Spine Candidate",
    instructions:
      "You are a minimal runtime proof agent. When the user asks to prepare a refund, call the prepare_refund tool exactly once with a numeric amount and reason. Do not use hosted tools, MCP, handoffs, conversations sessions, or external data.",
    tools: [prepareRefundTool],
    ...(model ? { model } : {})
  });
}

export function approvalIdentity(item: RunToolApprovalItem): {
  toolName: string | undefined;
  callId: string | undefined;
  arguments: string | undefined;
  rawType: string | undefined;
} {
  const raw = item.rawItem as { callId?: string; type?: string };
  return {
    toolName: item.name,
    callId: raw.callId,
    arguments: item.arguments,
    rawType: raw.type
  };
}
