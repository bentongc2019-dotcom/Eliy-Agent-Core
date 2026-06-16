import type { OperationalState, VerificationResult } from "./operational-state.js";

type EvidenceRecord = {
  refs: string[];
  text: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function evidenceRecords(state: OperationalState): EvidenceRecord[] {
  return [
    ...state.facts.map((item) => ({
      refs: item.evidenceRefs ?? [],
      text: `${item.id}\n${item.content}\n${item.source}`
    })),
    ...state.assumptions.map((item) => ({
      refs: item.evidenceRefs ?? [],
      text: `${item.id}\n${item.content}\n${item.source}`
    })),
    ...state.humanDecisions.map((decision) => ({
      refs: decision.evidenceRefs ?? [],
      text: `${decision.id}\n${decision.kind}\n${decision.label ?? ""}\n${decision.content}`
    })),
    ...state.actionReceipts.map((receipt) => ({
      refs: [`action_receipt:${receipt.toolName}`, `action_receipt:${receipt.toolCallId}`],
      text: `${receipt.toolCallId}\n${receipt.toolName}\n${receipt.humanDecision}\n${receipt.executionStatus}\n${receipt.authoritativeMessage}`
    }))
  ];
}

function criterionSatisfied(criterion: string, records: EvidenceRecord[]): boolean {
  const exactRef = `criterion:${criterion}`;
  const normalizedCriterion = normalize(criterion);

  return records.some((record) => {
    if (record.refs.includes(exactRef) || record.refs.includes(criterion)) {
      return true;
    }
    return normalize(record.text).includes(normalizedCriterion);
  });
}

function evidenceRefFor(criterion: string, records: EvidenceRecord[]): string {
  const exactRef = `criterion:${criterion}`;
  const match = records.find((record) => record.refs.includes(exactRef) || record.refs.includes(criterion));
  return match?.refs[0] ?? exactRef;
}

export function verifyMinimumLoopOutcome(state: OperationalState): VerificationResult {
  const records = evidenceRecords(state);
  const satisfiedCriteria: string[] = [];
  const unmetCriteria: string[] = [];
  const evidenceRefs: string[] = [];

  for (const criterion of state.intent.successCriteria) {
    if (criterionSatisfied(criterion, records)) {
      satisfiedCriteria.push(criterion);
      evidenceRefs.push(evidenceRefFor(criterion, records));
    } else {
      unmetCriteria.push(criterion);
    }
  }

  const passed = unmetCriteria.length === 0;
  const hasPendingHumanQuestion = state.openQuestions.length > 0 || state.nextCandidateAction?.kind === "ask_human";

  return {
    passed,
    satisfiedCriteria,
    unmetCriteria,
    evidenceRefs,
    nextRecommendation: passed ? "complete" : hasPendingHumanQuestion ? "ask_human" : "continue"
  };
}
