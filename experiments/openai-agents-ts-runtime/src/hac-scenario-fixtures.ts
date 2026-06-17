import { createHacActionReceipt } from "./hac-action-receipt.js";
import { decideHacAction } from "./hac-decision-model.js";
import type { HumanIntentContract } from "./human-intent-contract.js";
import { createLoopBoundsState } from "./loop-bounds.js";
import type { EvidenceItem, OperationalState } from "./operational-state.js";
import { addActionReceipt, addEvidence, addHumanDecision } from "./operational-state.js";
import {
  getToolExecutionCount,
  getToolExecutionCountByName,
  prepareRefundTool,
  resetToolExecutions,
  sendReleaseStatusUpdateTool
} from "./tool.js";
import { nowIso } from "./storage.js";

export function createInitialComplaintIntent(): HumanIntentContract {
  return {
    version: 1,
    goal:
      "在不回避交付延误责任的前提下，尽量修复客户关系，并形成可以实际执行的回应。",
    successCriteria: [
      "明确承认交付延误责任",
      "提供可执行的客户回应",
      "补偿方案由人最终决定",
      "任何退款行动必须经过明确批准",
      "实际行动结果必须由 Action Receipt 确认"
    ],
    delegatedScope: [
      "整理客户投诉事实",
      "识别缺失信息",
      "提出候选回应方案",
      "根据人类选择准备回应草稿"
    ],
    nonDelegableJudgments: [
      "选择最终补偿方案",
      "批准或拒绝退款行动",
      "修改目标或成功标准"
    ],
    stopConditions: [
      "用户要求暂停、改向或接管",
      "连续无进展达到边界",
      "现实证据与关键假设方向性冲突",
      "需要修改已确认目标或成功标准"
    ],
    interactionPreference: "concise",
    confirmedByHuman: true
  };
}

export function createProductLaunchIntent(): HumanIntentContract {
  return {
    version: 1,
    goal: "决定是否按期发布，并形成可执行的后续安排",
    successCriteria: [
      "已识别影响发布决定的关键事实和不确定性",
      "已形成两个以上真实可选方案",
      "已由人作出 Go / No-Go 或条件式发布决定",
      "已明确后续质量、回滚和沟通行动",
      "对外通知只有在明确授权后才能发送"
    ],
    delegatedScope: [
      "整理现有证据",
      "识别缺失信息",
      "比较方案和后果",
      "草拟发布状态通知",
      "提出下一候选动作"
    ],
    nonDelegableJudgments: [
      "是否按期发布",
      "可接受的剩余质量风险",
      "是否发送对外状态通知"
    ],
    stopConditions: [
      "用户要求暂停、改向或接管",
      "连续无进展达到边界",
      "现实证据与关键假设方向性冲突",
      "需要修改已确认目标或成功标准"
    ],
    interactionPreference: "guided",
    confirmedByHuman: true
  };
}

export function createProductLaunchState(loopId: string): OperationalState {
  const now = nowIso();
  return {
    loopId,
    version: 1,
    updatedAt: now,
    intent: createProductLaunchIntent(),
    iteration: 0,
    status: "running",
    facts: [],
    assumptions: [],
    openQuestions: [],
    humanDecisions: [
      {
        id: "decision-launch-intent-confirmed",
        kind: "intent_confirmed",
        content: "Human confirmed product launch goal, success criteria, delegated scope, and non-delegable judgments.",
        timestamp: now,
        explicit: true,
        evidenceRefs: ["intent:confirmed"]
      }
    ],
    actionReceipts: [],
    currentStep: "intent_confirmed",
    bounds: createLoopBoundsState(now)
  };
}

export function readComplaintMaterials(state: OperationalState): OperationalState {
  const items: EvidenceItem[] = [
    {
      id: "fact-complaint-delayed-delivery",
      kind: "fact",
      content: "客户投诉内容确认存在交付延误。",
      source: "customer_complaint_material",
      status: "confirmed"
    },
    {
      id: "fact-delivery-responsibility",
      kind: "fact",
      content: "商家需要在回应中明确承认交付延误责任。",
      source: "human_intent_contract",
      status: "confirmed",
      evidenceRefs: ["criterion:明确承认交付延误责任"]
    },
    {
      id: "inference-relationship-risk",
      kind: "inference",
      content: "如果回应回避责任，客户关系修复概率会下降。",
      source: "loop_reasoning",
      status: "unverified"
    },
    {
      id: "assumption-delay-duration-unknown",
      kind: "assumption",
      content: "交付延误天数尚未确认，补偿力度可能受影响。",
      source: "missing_complaint_detail",
      status: "unverified"
    }
  ];

  const next = items.reduce((current, item) => addEvidence(current, item), state);
  return {
    ...next,
    openQuestions: ["delivery_delay_days"],
    currentStep: "complaint_materials_read"
  };
}

export function provideDelayDays(state: OperationalState, days: number): OperationalState {
  return addEvidence(
    {
      ...addHumanDecision(state, {
        id: "decision-delay-days",
        kind: "information_provided",
        content: `用户确认交付延误 ${days} 天。`,
        timestamp: nowIso(),
        explicit: true
      }),
      status: "running",
      openQuestions: state.openQuestions.filter((question) => question !== "delivery_delay_days")
    },
    {
      id: "fact-delay-days",
      kind: "fact",
      content: `交付延误 ${days} 天。`,
      source: "human_input",
      status: "confirmed"
    }
  );
}

export function selectCompensation(state: OperationalState, content: string, requiresRefund = true): OperationalState {
  return addHumanDecision(
    { ...state, status: "running" },
    {
      id: `decision-compensation-${state.humanDecisions.length + 1}`,
      kind: "judgment_made",
      label: "compensation_choice",
      actionIntent: requiresRefund
        ? {
            actionType: "customer_response",
            externalActionType: "prepare_refund",
            requiresAuthorization: true
          }
        : {
            actionType: "customer_response",
            requiresAuthorization: false
          },
      content,
      timestamp: nowIso(),
      explicit: true,
      evidenceRefs: ["criterion:补偿方案由人最终决定", "judgment:选择最终补偿方案"]
    }
  );
}

export async function authorizeRefundPath(state: OperationalState, approve: boolean): Promise<{
  state: OperationalState;
  beforeApprovalCount: number;
  afterDecisionCount: number;
  receiptMessage: string;
}> {
  await resetToolExecutions();
  const facts = {
    actionId: "loop-prepare-refund",
    actionType: "prepare_refund",
    hasExternalSideEffect: true,
    requiresHumanValueJudgment: false,
    prohibited: false
  };
  const decision = decideHacAction(facts);
  if (decision.mode !== "AUTHORIZE") {
    throw new Error("prepare_refund must be AUTHORIZE.");
  }
  const approvalRequired = await prepareRefundTool.needsApproval(
    {} as never,
    { amount: 12.34, reason: "delayed delivery" },
    facts.actionId
  );
  if (!approvalRequired) {
    throw new Error("prepare_refund must require approval before execution.");
  }
  const beforeApprovalCount = await getToolExecutionCount();

  if (!approve) {
    const receipt = createHacActionReceipt({
      toolCallId: facts.actionId,
      toolName: "prepare_refund",
      humanDecision: "rejected",
      runtimeOutcome: { status: "not_executed" }
    });
    return {
      state: addActionReceipt(
        addHumanDecision(state, {
          id: "decision-refund-rejected",
          kind: "action_rejected",
          label: "external_action_decision",
          actionIntent: {
            externalActionType: "prepare_refund",
            requiresAuthorization: true
          },
          content: "用户拒绝退款行动。",
          timestamp: nowIso(),
          explicit: true,
          evidenceRefs: ["criterion:任何退款行动必须经过明确批准"]
        }),
        receipt
      ),
      beforeApprovalCount,
      afterDecisionCount: await getToolExecutionCount(),
      receiptMessage: receipt.authoritativeMessage
    };
  }

  const result = await prepareRefundTool.invoke(
    {} as never,
    JSON.stringify({ amount: 12.34, reason: "delayed delivery" }),
    {
      toolCall: {
        type: "function_call",
        callId: facts.actionId,
        name: "prepare_refund",
        arguments: JSON.stringify({ amount: 12.34, reason: "delayed delivery" })
      } as never,
      resumeState: "minimum-loop-approved-runstate"
    }
  );
  const resultMessage =
    typeof result === "string"
      ? result
      : typeof result === "object" && result !== null && "message" in result
        ? String((result as { message: unknown }).message)
        : JSON.stringify(result);
  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: "prepare_refund",
    humanDecision: "approved",
    runtimeOutcome: { status: "succeeded", resultMessage }
  });
  return {
    state: addActionReceipt(
      addHumanDecision(state, {
        id: "decision-refund-approved",
        kind: "action_approved",
        label: "external_action_decision",
        actionIntent: {
          externalActionType: "prepare_refund",
          requiresAuthorization: true
        },
        content: "用户明确批准退款准备行动。",
        timestamp: nowIso(),
        explicit: true,
        evidenceRefs: ["criterion:任何退款行动必须经过明确批准"]
      }),
      receipt
    ),
    beforeApprovalCount,
    afterDecisionCount: await getToolExecutionCount(),
    receiptMessage: receipt.authoritativeMessage
  };
}

export function addResponseDraftEvidence(state: OperationalState, content: string): OperationalState {
  return addEvidence(state, {
    id: `fact-response-draft-${state.facts.length + 1}`,
    kind: "fact",
    content: `可执行回应：${content}`,
    source: "loop_output",
    status: "confirmed",
    evidenceRefs: ["criterion:提供可执行的客户回应", "criterion:实际行动结果必须由 Action Receipt 确认"]
  });
}

export function readProductLaunchMaterials(state: OperationalState): OperationalState {
  const items: EvidenceItem[] = [
    {
      id: "fact-launch-quality-issues",
      kind: "fact",
      content: "发布前发现若干质量问题。",
      source: "product_launch_fixture",
      status: "confirmed"
    },
    {
      id: "fact-launch-critical-path",
      kind: "fact",
      content: "关键证据需要包含阻断级缺陷数量、关键路径测试覆盖率、回滚能力和延期成本。",
      source: "human_intent_contract",
      status: "confirmed"
    },
    {
      id: "inference-customer-trust-risk",
      kind: "inference",
      content: "如果带着未知阻断缺陷发布，客户信任风险会上升。",
      source: "loop_reasoning",
      status: "unverified"
    },
    {
      id: "assumption-release-blocker-count-unknown",
      kind: "assumption",
      content: "当前阻断级缺陷数量尚未确认，不能作为事实使用。",
      source: "missing_launch_detail",
      status: "unverified"
    }
  ];
  return {
    ...items.reduce((current, item) => addEvidence(current, item), state),
    openQuestions: ["release_blocker_count"],
    currentStep: "product_launch_materials_read"
  };
}

export function provideLaunchFacts(state: OperationalState): OperationalState {
  return {
    ...addEvidence(
      addEvidence(
        addHumanDecision(state, {
          id: "decision-launch-facts-provided",
          kind: "information_provided",
          content: "用户确认仍有 2 个阻断级缺陷，关键路径测试覆盖率 86%，可用回滚方案已经演练。",
          timestamp: nowIso(),
          explicit: true
        }),
        {
          id: "fact-release-blocker-count",
          kind: "fact",
          content: "当前有 2 个阻断级缺陷。",
          source: "human_input",
          status: "confirmed",
          evidenceRefs: ["criterion:已识别影响发布决定的关键事实和不确定性"]
        }
      ),
      {
        id: "fact-release-rollback-ready",
        kind: "fact",
        content: "关键路径测试覆盖率 86%，回滚方案已经演练，延期成本可控。",
        source: "human_input",
        status: "confirmed",
        evidenceRefs: ["criterion:已识别影响发布决定的关键事实和不确定性"]
      }
    ),
    status: "running",
    openQuestions: []
  };
}

export function addLaunchOptions(state: OperationalState): OperationalState {
  return addEvidence(state, {
    id: "fact-launch-options",
    kind: "fact",
    content:
      "真实可选方案：A 延期发布并完成关键缺陷修复；B 限定范围发布，并设置监控、回滚条件和扩大范围前验证要求。",
    source: "loop_output",
    status: "confirmed",
    evidenceRefs: ["criterion:已形成两个以上真实可选方案"]
  });
}

export function recordReleaseDecision(
  state: OperationalState,
  content: string,
  shouldNotify: boolean
): OperationalState {
  return addHumanDecision(state, {
    id: `decision-release-${state.humanDecisions.length + 1}`,
    kind: "judgment_made",
    label: "release_decision",
    actionIntent: shouldNotify
      ? {
          actionType: "launch_plan",
          externalActionType: "send_release_status_update",
          requiresAuthorization: true
        }
      : {
          actionType: "launch_plan",
          requiresAuthorization: false
        },
    content,
    timestamp: nowIso(),
    explicit: true,
    evidenceRefs: ["criterion:已由人作出 Go / No-Go 或条件式发布决定", "judgment:是否按期发布"]
  });
}

export async function authorizeReleaseStatusUpdate(state: OperationalState, approve: boolean): Promise<{
  state: OperationalState;
  beforeAuthorizationCount: number;
  afterDecisionCount: number;
  receiptMessage: string;
}> {
  await resetToolExecutions();
  const facts = {
    actionId: "loop-send-release-status-update",
    actionType: "send_release_status_update",
    hasExternalSideEffect: true,
    requiresHumanValueJudgment: false,
    prohibited: false
  };
  const decision = decideHacAction(facts);
  if (decision.mode !== "AUTHORIZE") {
    throw new Error("send_release_status_update must use AUTHORIZE facts.");
  }
  const approvalRequired = await sendReleaseStatusUpdateTool.needsApproval(
    {} as never,
    {
      audience: "external stakeholders",
      status: "delayed",
      message: "Release delayed to repair blocker defects."
    },
    facts.actionId
  );
  if (!approvalRequired) {
    throw new Error("send_release_status_update must require approval.");
  }
  const beforeAuthorizationCount = await getToolExecutionCountByName("send_release_status_update");

  if (!approve) {
    const receipt = createHacActionReceipt({
      toolCallId: facts.actionId,
      toolName: "send_release_status_update",
      humanDecision: "rejected",
      runtimeOutcome: { status: "not_executed" }
    });
    return {
      state: addActionReceipt(
        addHumanDecision(state, {
          id: "decision-status-update-rejected",
          kind: "action_rejected",
          label: "external_action_decision",
          actionIntent: {
            externalActionType: "send_release_status_update",
            requiresAuthorization: true
          },
          content: "用户拒绝发送对外发布状态通知。",
          timestamp: nowIso(),
          explicit: true,
          evidenceRefs: ["criterion:对外通知只有在明确授权后才能发送"]
        }),
        receipt
      ),
      beforeAuthorizationCount,
      afterDecisionCount: await getToolExecutionCountByName("send_release_status_update"),
      receiptMessage: receipt.authoritativeMessage
    };
  }

  const result = await sendReleaseStatusUpdateTool.invoke(
    {} as never,
    JSON.stringify({
      audience: "external stakeholders",
      status: "delayed",
      message: "Release delayed to repair blocker defects."
    }),
    {
      toolCall: {
        type: "function_call",
        callId: facts.actionId,
        name: "send_release_status_update",
        arguments: JSON.stringify({
          audience: "external stakeholders",
          status: "delayed",
          message: "Release delayed to repair blocker defects."
        })
      } as never,
      resumeState: "cross-task-release-update-approved"
    }
  );
  const resultMessage =
    typeof result === "string"
      ? result
      : typeof result === "object" && result !== null && "message" in result
        ? String((result as { message: unknown }).message)
        : JSON.stringify(result);
  const receipt = createHacActionReceipt({
    toolCallId: facts.actionId,
    toolName: "send_release_status_update",
    humanDecision: "approved",
    runtimeOutcome: { status: "succeeded", resultMessage }
  });
  return {
    state: addActionReceipt(
      addHumanDecision(state, {
        id: "decision-status-update-approved",
        kind: "action_approved",
        label: "external_action_decision",
        actionIntent: {
          externalActionType: "send_release_status_update",
          requiresAuthorization: true
        },
        content: "用户明确批准发送对外发布状态通知。",
        timestamp: nowIso(),
        explicit: true,
        evidenceRefs: ["criterion:对外通知只有在明确授权后才能发送"]
      }),
      receipt
    ),
    beforeAuthorizationCount,
    afterDecisionCount: await getToolExecutionCountByName("send_release_status_update"),
    receiptMessage: receipt.authoritativeMessage
  };
}
