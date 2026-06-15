export type HacActionReceipt = {
  toolCallId: string;
  toolName: string;
  humanDecision: "approved" | "rejected";
  executionStatus: "not_executed" | "succeeded" | "failed";
  authoritativeMessage: string;
};

export type HacRuntimeExecutionOutcome =
  | {
      status: "not_executed";
    }
  | {
      status: "succeeded";
      resultMessage: string;
    }
  | {
      status: "failed";
      errorMessage: string;
    };

export type HacFinalOutcome = {
  receipt: HacActionReceipt;
  truthMismatch: boolean;
  userVisibleMessage: string;
  nonAuthoritativeAgentNarrative?: string;
};

const COMPLETION_CLAIM_PATTERN =
  /(已提交|已处理|已完成|已准备退款|退款已完成|refund (submitted|processed|completed)|submitted the refund|processed the refund|completed the refund)/i;

export function createHacActionReceipt(args: {
  toolCallId: string;
  toolName: string;
  humanDecision: "approved" | "rejected";
  runtimeOutcome: HacRuntimeExecutionOutcome;
}): HacActionReceipt {
  if (args.humanDecision === "rejected") {
    return {
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      humanDecision: "rejected",
      executionStatus: "not_executed",
      authoritativeMessage: "用户已拒绝，本次退款准备未执行。"
    };
  }

  if (args.runtimeOutcome.status === "succeeded") {
    return {
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      humanDecision: "approved",
      executionStatus: "succeeded",
      authoritativeMessage: `用户已批准，${args.toolName} 已成功执行。${args.runtimeOutcome.resultMessage}`
    };
  }

  if (args.runtimeOutcome.status === "failed") {
    return {
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      humanDecision: "approved",
      executionStatus: "failed",
      authoritativeMessage: `用户已批准，但 ${args.toolName} 执行失败：${args.runtimeOutcome.errorMessage}`
    };
  }

  return {
    toolCallId: args.toolCallId,
    toolName: args.toolName,
    humanDecision: "approved",
    executionStatus: "failed",
    authoritativeMessage: `用户已批准，但 ${args.toolName} 未返回可确认的执行结果。`
  };
}

export function detectTruthMismatch(receipt: HacActionReceipt, agentNarrative: string): boolean {
  if (!agentNarrative.trim()) {
    return false;
  }

  if (receipt.executionStatus === "not_executed" || receipt.executionStatus === "failed") {
    return COMPLETION_CLAIM_PATTERN.test(agentNarrative);
  }

  return /退款已完成|refund completed|processed the refund/i.test(agentNarrative);
}

export function renderAuthoritativeOutcome(args: {
  receipt: HacActionReceipt;
  agentNarrative?: string;
}): HacFinalOutcome {
  const agentNarrative = args.agentNarrative ?? "";
  const truthMismatch = detectTruthMismatch(args.receipt, agentNarrative);
  return {
    receipt: args.receipt,
    truthMismatch,
    userVisibleMessage: args.receipt.authoritativeMessage,
    ...(agentNarrative
      ? {
          nonAuthoritativeAgentNarrative: truthMismatch
            ? `Non-authoritative narrative conflicted with Action Receipt and was suppressed: ${agentNarrative}`
            : agentNarrative
        }
      : {})
  };
}
