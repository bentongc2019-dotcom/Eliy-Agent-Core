import type { ReframeProposal } from "./reframe-proposal.js";
import type {
  EvidenceItem,
  HumanDecision,
  OperationalState
} from "./operational-state.js";
import type { StateTransition, StateTransitionOperation } from "./state-transition.js";
import type { HacStateMode } from "./hac-shared-state-activation-policy.js";

export type Gate2RunResultView = {
  reply: string;
  tool_events: string[];
  requires_confirmation: boolean;
  proposed_state_patch: Gate2StatePatch | null;
  reframe_candidate: Gate2ReframeCandidate | null;
  trace_id: string;
  eval_summary: Gate2EvalSummary;
};

export type Gate2SharedStateView = {
  loop_id: string;
  version: number;
  updated_at: string;
  current_goal: string;
  current_intent: OperationalState["intent"];
  current_assumptions: EvidenceItem[];
  current_decisions: HumanDecision[];
  state_mode: HacStateMode;
  pending_reframe_proposal: ReframeProposal | null;
};

export type Gate2StatePatch = {
  patch_type: StateTransitionOperation["type"] | "intent_candidate";
  target_path: string;
  proposed_value: unknown;
  reason: string;
  evidence_refs: string[];
  risk_level: "low" | "medium" | "high";
  requires_user_confirmation: true;
};

export type Gate2ReframeCandidate = {
  proposal_id: string;
  based_on_state_version: number;
  current_assumption: string;
  new_evidence: string[];
  conflict: string;
  potential_impact: string;
  candidate_reframe: string;
  recommended_next_check: string;
  evidence_refs: string[];
  requires_user_confirmation: true;
};

export type Gate2ConfirmationRequest = {
  confirmation_type: "state_patch" | "reframe_candidate" | "approval" | "reject" | "defer";
  summary: string;
  options: Array<"confirm" | "reject" | "defer">;
  default_action: "confirm" | "reject" | "defer";
  proposal_id: string | null;
  evidence_refs: string[];
};

export type Gate2EvalSummary = {
  prior_state_ref: string;
  contract_view_ref: string;
  proposed_state_patch: Gate2StatePatch | null;
  reframe_candidate: Gate2ReframeCandidate | null;
  confirmation_status: "none" | "pending" | "confirmed" | "rejected" | "deferred";
  final_state_ref: string;
  task_outcome: "pass" | "fail" | "inconclusive";
  state_governance: "minimum-loop" | "shared-state" | "mixed";
  reframing_correctness: "not_triggered" | "candidate" | "confirmed" | "rejected" | "deferred";
  human_agency_boundary: "passed" | "failed";
  traceability: "passed" | "partial" | "failed";
  notes: string[];
  boundary_references: string[];
  state_mode: HacStateMode;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeEvidenceRefs(evidenceRefs: string[]): string[] {
  return Array.from(new Set(evidenceRefs));
}

export function getGate2BoundaryReferences(): string[] {
  return [
    "eliy-kernel/hlamt/HLAMT.md",
    "eliy-kernel/hlamt/HUMAN.md",
    "eliy-kernel/hlamt/EVIDENCE.md"
  ];
}

export function createGate2SharedStateView(state: OperationalState): Gate2SharedStateView {
  return clone({
    loop_id: state.loopId,
    version: state.version,
    updated_at: state.updatedAt,
    current_goal: state.intent.goal,
    current_intent: state.intent,
    current_assumptions: state.assumptions,
    current_decisions: state.humanDecisions,
    state_mode: state.stateMode,
    pending_reframe_proposal: state.pendingReframeProposal ?? null
  });
}

export function createGate2StatePatchView(input: Gate2StatePatch): Gate2StatePatch {
  return clone({
    ...input,
    evidence_refs: normalizeEvidenceRefs(input.evidence_refs)
  });
}

export function mapGate2StatePatchFromTransition(
  transition: StateTransition,
  patch: Omit<Gate2StatePatch, "evidence_refs" | "requires_user_confirmation"> & {
    evidence_refs: string[];
    requires_user_confirmation?: true;
  }
): Gate2StatePatch {
  return createGate2StatePatchView({
    patch_type: patch.patch_type,
    target_path: patch.target_path,
    proposed_value: patch.proposed_value,
    reason: `${patch.reason} (transition:${transition.transitionId})`,
    evidence_refs: normalizeEvidenceRefs([...transition.evidenceRefs, ...patch.evidence_refs]),
    risk_level: patch.risk_level,
    requires_user_confirmation: patch.requires_user_confirmation ?? true
  });
}

export function createGate2ReframeCandidateView(input: Gate2ReframeCandidate): Gate2ReframeCandidate {
  return clone({
    ...input,
    evidence_refs: normalizeEvidenceRefs(input.evidence_refs)
  });
}

export function mapGate2ReframeCandidateFromProposal(
  proposal: ReframeProposal,
  details: {
    new_evidence: string[];
    conflict: string;
    potential_impact: string;
    recommended_next_check: string;
  }
): Gate2ReframeCandidate {
  return createGate2ReframeCandidateView({
    proposal_id: proposal.proposalId,
    based_on_state_version: proposal.basedOnStateVersion,
    current_assumption: proposal.currentFrame,
    new_evidence: normalizeEvidenceRefs(details.new_evidence.length > 0 ? details.new_evidence : proposal.evidenceRefs),
    conflict: details.conflict,
    potential_impact: details.potential_impact,
    candidate_reframe: proposal.proposedFrame,
    recommended_next_check: details.recommended_next_check,
    evidence_refs: normalizeEvidenceRefs(proposal.evidenceRefs),
    requires_user_confirmation: true
  });
}

export function createGate2ConfirmationRequestView(input: Gate2ConfirmationRequest): Gate2ConfirmationRequest {
  return clone({
    ...input,
    evidence_refs: normalizeEvidenceRefs(input.evidence_refs)
  });
}

export function mapGate2ConfirmationRequestFromReframeProposal(
  proposal: ReframeProposal,
  decision: Gate2ConfirmationRequest["confirmation_type"],
  summary: string,
  defaultAction: Gate2ConfirmationRequest["default_action"] = "confirm"
): Gate2ConfirmationRequest {
  return createGate2ConfirmationRequestView({
    confirmation_type: decision,
    summary,
    options: ["confirm", "reject", "defer"],
    default_action: defaultAction,
    proposal_id: proposal.proposalId,
    evidence_refs: normalizeEvidenceRefs(proposal.evidenceRefs)
  });
}

export function createGate2EvalSummaryView(input: Gate2EvalSummary): Gate2EvalSummary {
  return clone({
    ...input,
    boundary_references: normalizeEvidenceRefs(input.boundary_references)
  });
}

export function mapGate2EvalSummaryFromViews(input: Gate2EvalSummary): Gate2EvalSummary {
  return createGate2EvalSummaryView(input);
}

export function createGate2RunResultView(input: Gate2RunResultView): Gate2RunResultView {
  return clone({
    ...input,
    tool_events: Array.from(new Set(input.tool_events)),
    eval_summary: createGate2EvalSummaryView(input.eval_summary)
  });
}
