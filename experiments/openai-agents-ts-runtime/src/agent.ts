import { Agent, setTracingDisabled, type RunToolApprovalItem } from "@openai/agents";
import { prepareRefundTool } from "./tool.js";

export const FIXED_TEST_MODEL = "gpt-5.4-mini";

export function disableTracingExport(): void {
  setTracingDisabled(true);
}

export function getConfiguredModel(): string {
  return process.env.OPENAI_DEFAULT_MODEL || FIXED_TEST_MODEL;
}

export function createRefundAgent(model?: string): Agent {
  return new Agent({
    name: "HAC Runtime Spine Candidate",
    instructions:
      "You are a minimal runtime proof agent. For the fixed validation task, call the prepare_refund tool exactly once with amount 12.34 and reason delayed delivery. Do not use hosted tools, MCP, handoffs, conversations sessions, web search, external data, or any other tools.",
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
