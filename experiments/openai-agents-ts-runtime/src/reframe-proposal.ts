export type HumanReframeDecision = "confirm" | "reject" | "defer";

export interface ReframeProposal {
  proposalId: string;
  basedOnStateVersion: number;
  triggerReasons: string[];
  evidenceRefs: string[];
  target: "assumption";
  currentFrame: string;
  proposedFrame: string;
  rationale: string;
  expectedSystemEffect: string;
  risks: string[];
  falsificationCheck: string;
  requiresHumanConfirmation: true;
}
