export type HumanIntentContract = {
  version: number;
  goal: string;
  successCriteria: string[];
  delegatedScope: string[];
  nonDelegableJudgments: string[];
  stopConditions: string[];
  interactionPreference?: "concise" | "guided";
  confirmedByHuman: boolean;
};

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

export function createInteractionPreferenceCandidate(
  current: HumanIntentContract,
  interactionPreference: "concise" | "guided"
): HumanIntentContract {
  return {
    ...current,
    version: current.version + 1,
    interactionPreference,
    confirmedByHuman: false
  };
}

export function confirmIntentCandidate(candidate: HumanIntentContract): HumanIntentContract {
  return {
    ...candidate,
    confirmedByHuman: true
  };
}
