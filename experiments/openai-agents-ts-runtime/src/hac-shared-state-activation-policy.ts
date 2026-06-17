export type HacStateMode = "minimum-loop" | "shared-state";

export interface SharedStateActivationSignals {
  currentMode: HacStateMode;
  explicitHumanRequest?: boolean;
  staleUpdateRisk?: boolean;
  receiptReplayRisk?: boolean;
  evidenceLinkedStateChangeRequired?: boolean;
  crossRunContinuityRequired?: boolean;
  multipleCriticalFacts?: boolean;
  multipleEvidenceSources?: boolean;
  humanFactCorrectionExpected?: boolean;
  staleUpdateDetected?: boolean;
  receiptReplayDetected?: boolean;
  authoritativeFactCorrected?: boolean;
  stateConflictDetected?: boolean;
}

export interface SharedStateActivationDecision {
  mode: HacStateMode;
  activated: boolean;
  source: "default" | "preflight" | "runtime" | "human" | "sticky";
  reasons: string[];
}

type ReasonRule = {
  key: keyof SharedStateActivationSignals;
  reason: string;
};

const expectedRiskRules: ReasonRule[] = [
  { key: "staleUpdateRisk", reason: "STALE_UPDATE_RISK" },
  { key: "receiptReplayRisk", reason: "RECEIPT_REPLAY_RISK" },
  { key: "evidenceLinkedStateChangeRequired", reason: "EVIDENCE_LINKED_STATE_CHANGE_REQUIRED" }
];

const runtimeEventRules: ReasonRule[] = [
  { key: "staleUpdateDetected", reason: "STALE_UPDATE_DETECTED" },
  { key: "receiptReplayDetected", reason: "RECEIPT_REPLAY_DETECTED" },
  { key: "authoritativeFactCorrected", reason: "AUTHORITATIVE_FACT_CORRECTED" },
  { key: "stateConflictDetected", reason: "STATE_CONFLICT_DETECTED" }
];

const softSignalRules: ReasonRule[] = [
  { key: "crossRunContinuityRequired", reason: "CROSS_RUN_CONTINUITY_REQUIRED" },
  { key: "multipleCriticalFacts", reason: "MULTIPLE_CRITICAL_FACTS" },
  { key: "multipleEvidenceSources", reason: "MULTIPLE_EVIDENCE_SOURCES" },
  { key: "humanFactCorrectionExpected", reason: "HUMAN_FACT_CORRECTION_EXPECTED" }
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function activeReasons(signals: SharedStateActivationSignals, rules: ReasonRule[]): string[] {
  return rules.flatMap((rule) => signals[rule.key] ? [rule.reason] : []);
}

export function decideSharedStateActivation(
  signals: SharedStateActivationSignals
): SharedStateActivationDecision {
  if (signals.currentMode === "shared-state") {
    return {
      mode: "shared-state",
      activated: false,
      source: "sticky",
      reasons: ["ALREADY_SHARED_STATE"]
    };
  }

  if (signals.explicitHumanRequest) {
    return {
      mode: "shared-state",
      activated: true,
      source: "human",
      reasons: ["EXPLICIT_HUMAN_REQUEST"]
    };
  }

  const expectedRiskReasons = activeReasons(signals, expectedRiskRules);
  if (expectedRiskReasons.length > 0) {
    return {
      mode: "shared-state",
      activated: true,
      source: "preflight",
      reasons: unique(expectedRiskReasons)
    };
  }

  const runtimeReasons = activeReasons(signals, runtimeEventRules);
  if (runtimeReasons.length > 0) {
    return {
      mode: "shared-state",
      activated: true,
      source: "runtime",
      reasons: unique(runtimeReasons)
    };
  }

  const softReasons = activeReasons(signals, softSignalRules);
  if (softReasons.length >= 2) {
    return {
      mode: "shared-state",
      activated: true,
      source: "preflight",
      reasons: unique([...softReasons, "SOFT_SIGNAL_THRESHOLD_MET"])
    };
  }

  return {
    mode: "minimum-loop",
    activated: false,
    source: "default",
    reasons: ["DEFAULT_MINIMUM_LOOP"]
  };
}
