export interface ReflectiveTriggerSignals {
  explicitHumanRequest?: boolean;
  verifiedOutcomeContradictsAssumption?: boolean;
  boundedNoProgress?: boolean;
  goalMetricDivergence?: boolean;
}

export interface ReflectiveTriggerDecision {
  triggered: boolean;
  reasons: string[];
  evidenceRefs: string[];
}

export type ReflectiveTriggerReason =
  | "EXPLICIT_HUMAN_REFRAME_REQUEST"
  | "VERIFIED_OUTCOME_CONTRADICTS_ASSUMPTION"
  | "BOUNDED_NO_PROGRESS"
  | "GOAL_METRIC_DIVERGENCE"
  | "MISSING_TRIGGER_EVIDENCE"
  | "NO_REFLECTIVE_TRIGGER";

export function decideReflectiveTrigger(args: {
  signals: ReflectiveTriggerSignals;
  evidenceRefs: string[];
}): ReflectiveTriggerDecision {
  const evidenceRefs = Array.from(new Set(args.evidenceRefs));
  const reasons: ReflectiveTriggerReason[] = [];

  if (args.signals.explicitHumanRequest) {
    reasons.push("EXPLICIT_HUMAN_REFRAME_REQUEST");
  }

  const nonHumanReasons: ReflectiveTriggerReason[] = [];
  if (args.signals.verifiedOutcomeContradictsAssumption) {
    nonHumanReasons.push("VERIFIED_OUTCOME_CONTRADICTS_ASSUMPTION");
  }
  if (args.signals.boundedNoProgress) {
    nonHumanReasons.push("BOUNDED_NO_PROGRESS");
  }
  if (args.signals.goalMetricDivergence) {
    nonHumanReasons.push("GOAL_METRIC_DIVERGENCE");
  }

  if (nonHumanReasons.length > 0 && evidenceRefs.length === 0 && reasons.length === 0) {
    return {
      triggered: false,
      reasons: ["MISSING_TRIGGER_EVIDENCE"],
      evidenceRefs: []
    };
  }

  if (evidenceRefs.length > 0) {
    reasons.push(...nonHumanReasons);
  }

  if (reasons.length === 0) {
    return {
      triggered: false,
      reasons: ["NO_REFLECTIVE_TRIGGER"],
      evidenceRefs
    };
  }

  return {
    triggered: true,
    reasons: Array.from(new Set(reasons)),
    evidenceRefs
  };
}
