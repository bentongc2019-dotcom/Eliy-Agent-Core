import type {
  EvidenceItem,
  HumanDecision,
  LoopActionProposal,
  OperationalState
} from "./operational-state.js";
import type { HacActionReceipt } from "./hac-action-receipt.js";

export type AgentStateSnapshot = {
  loopId: string;
  version: number;
  updatedAt: string;
  status: OperationalState["status"];
  currentObjective: string;
  successCriteria: string[];
  facts: EvidenceItem[];
  assumptions: EvidenceItem[];
  openQuestions: string[];
  humanDecisions: HumanDecision[];
  actionReceipts: HacActionReceipt[];
  nextCandidateAction?: LoopActionProposal;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createAgentStateSnapshot(state: OperationalState): AgentStateSnapshot {
  return deepClone({
    loopId: state.loopId,
    version: state.version,
    updatedAt: state.updatedAt,
    status: state.status,
    currentObjective: state.intent.goal,
    successCriteria: state.intent.successCriteria,
    facts: state.facts,
    assumptions: state.assumptions,
    openQuestions: state.openQuestions,
    humanDecisions: state.humanDecisions,
    actionReceipts: state.actionReceipts,
    ...(state.nextCandidateAction ? { nextCandidateAction: state.nextCandidateAction } : {})
  });
}
