import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import type { HacActionReceipt } from "./hac-action-receipt.js";
import type { HacStateMode } from "./hac-shared-state-activation-policy.js";
import type { HumanIntentContract } from "./human-intent-contract.js";
import type { LoopBoundsState } from "./loop-bounds.js";

export type EvidenceItem = {
  id: string;
  kind: "fact" | "inference" | "assumption";
  content: string;
  source: string;
  status: "unverified" | "confirmed" | "contested";
  evidenceRefs?: string[];
};

export type HumanDecision = {
  id: string;
  kind:
    | "intent_confirmed"
    | "information_provided"
    | "preference_changed"
    | "judgment_made"
    | "action_approved"
    | "action_rejected"
    | "pause"
    | "redirect"
    | "takeover";
  label?: string;
  actionIntent?: {
    actionType?: string;
    externalActionType?: string;
    requiresAuthorization?: boolean;
  };
  payload?: Record<string, unknown>;
  evidenceRefs?: string[];
  content: string;
  timestamp: string;
  explicit: boolean;
};

export type LoopActionProposal = {
  kind: "reason" | "ask_human" | "invoke_tool" | "complete";
  purpose: string;
  expectedEvidence: string[];
  mayChangeGoal: boolean;
  mayChangeSuccessCriteria: boolean;
  touchesNonDelegableJudgment: boolean;
  outsideDelegatedScope: boolean;
  proactiveReason?: string;
};

export type VerificationResult = {
  passed: boolean;
  satisfiedCriteria: string[];
  unmetCriteria: string[];
  evidenceRefs: string[];
  nextRecommendation: "continue" | "revise" | "ask_human" | "complete" | "stop";
};

export type OperationalState = {
  loopId: string;
  version: number;
  updatedAt: string;
  stateMode: HacStateMode;
  sharedStateActivation?: {
    source: "preflight" | "runtime" | "human";
    reasons: string[];
    activatedAt: string;
  };
  intent: HumanIntentContract;
  iteration: number;
  status: "running" | "waiting_human" | "completed" | "stopped" | "failed";
  facts: EvidenceItem[];
  assumptions: EvidenceItem[];
  openQuestions: string[];
  humanDecisions: HumanDecision[];
  actionReceipts: HacActionReceipt[];
  currentStep?: string;
  nextCandidateAction?: LoopActionProposal;
  lastVerification?: VerificationResult;
  stopReason?: string;
  bounds: LoopBoundsState;
};

export function addEvidence(state: OperationalState, item: EvidenceItem): OperationalState {
  if (item.kind === "fact") {
    return { ...state, facts: [...state.facts, item] };
  }
  return { ...state, assumptions: [...state.assumptions, item] };
}

export function addHumanDecision(state: OperationalState, decision: HumanDecision): OperationalState {
  return {
    ...state,
    humanDecisions: [...state.humanDecisions, decision]
  };
}

export function addActionReceipt(state: OperationalState, receipt: HacActionReceipt): OperationalState {
  return {
    ...state,
    actionReceipts: [...state.actionReceipts, receipt]
  };
}

export async function saveOperationalState(path: string, state: OperationalState): Promise<{
  path: string;
  sha256: string;
  bytes: number;
}> {
  await mkdir(dirname(path), { recursive: true });
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  await writeFile(path, serialized, "utf8");
  return {
    path,
    sha256: createHash("sha256").update(serialized).digest("hex"),
    bytes: Buffer.byteLength(serialized)
  };
}

export async function loadOperationalState(path: string): Promise<OperationalState> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as OperationalState;
  return {
    ...parsed,
    version: typeof parsed.version === "number" ? parsed.version : 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    stateMode: parsed.stateMode === "shared-state" ? "shared-state" : "minimum-loop"
  };
}
