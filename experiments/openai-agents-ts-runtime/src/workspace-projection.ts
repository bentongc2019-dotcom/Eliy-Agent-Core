import type {
  EvidenceItem,
  HumanDecision,
  LoopActionProposal,
  OperationalState
} from "./operational-state.js";
import type { HacActionReceipt } from "./hac-action-receipt.js";

export type WorkspaceProjection = {
  loopId: string;
  version: number;
  updatedAt: string;
  currentObjective: string;
  facts: EvidenceItem[];
  assumptions: EvidenceItem[];
  openQuestions: string[];
  humanDecisions: HumanDecision[];
  actionReceipts: HacActionReceipt[];
  currentStatus: OperationalState["status"];
  status: OperationalState["status"];
  nextCandidateAction?: LoopActionProposal;
  evidenceReferences: string[];
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function projectWorkspace(state: OperationalState): WorkspaceProjection {
  const evidenceReferences = [
    ...state.facts.flatMap((item) => item.evidenceRefs ?? []),
    ...state.assumptions.flatMap((item) => item.evidenceRefs ?? []),
    ...state.humanDecisions.flatMap((decision) => decision.evidenceRefs ?? []),
    ...state.actionReceipts.map((receipt) => `action_receipt:${receipt.toolCallId}`)
  ];

  return deepClone({
    loopId: state.loopId,
    version: state.version,
    updatedAt: state.updatedAt,
    currentObjective: state.intent.goal,
    facts: state.facts,
    assumptions: state.assumptions,
    openQuestions: state.openQuestions,
    humanDecisions: state.humanDecisions,
    actionReceipts: state.actionReceipts,
    currentStatus: state.status,
    status: state.status,
    ...(state.nextCandidateAction ? { nextCandidateAction: state.nextCandidateAction } : {}),
    evidenceReferences: Array.from(new Set(evidenceReferences))
  });
}
