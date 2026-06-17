export type Gate2EvaluationResult = "Passed" | "Failed" | "Inconclusive";

export type Gate2AnswerEvaluation = {
  candidate: "candidate-a" | "candidate-b" | "test";
  authoritativeFactDetected: string | null;
  supersededFactDetected: string | null;
  remediationTargetDetected: string | null;
  decisionDetected: "Go" | "No-Go" | null;
  usesLatestFact: boolean;
  evaluationResult: Gate2EvaluationResult;
  evaluationReasons: string[];
};

export type Gate2EvaluationInput = {
  candidate: "candidate-a" | "candidate-b" | "test";
  answer: string;
  currentMarker: string;
  oldMarker: string;
  expectedDecision: "Go" | "No-Go";
};

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function windowAround(text: string, marker: string, radius = 90): string[] {
  const windows: string[] = [];
  const lower = text.toLowerCase();
  const markerLower = marker.toLowerCase();
  let index = lower.indexOf(markerLower);
  while (index >= 0) {
    windows.push(text.slice(Math.max(0, index - radius), Math.min(text.length, index + marker.length + radius)));
    index = lower.indexOf(markerLower, index + markerLower.length);
  }
  return windows;
}

function detectStructuredMarker(answer: string): string | null {
  const jsonMatch = answer.match(/"rollbackMarker"\s*:\s*"([^"]+)"/i);
  if (jsonMatch?.[1]) return jsonMatch[1];

  const markdownMatch = answer.match(/\bRollback marker\s*:\s*`?([A-Z0-9_:-]+)`?/i);
  if (markdownMatch?.[1]) return markdownMatch[1].replace(/[.,;。]/g, "");

  const currentMatch = answer.match(/\bcurrent (?:authoritative )?(?:state|marker|fact)\s*(?:is|:)\s*`?([A-Z0-9_:-]+)`?/i);
  if (currentMatch?.[1]) return currentMatch[1].replace(/[.,;。]/g, "");

  const chineseMatch = answer.match(/当前(?:权威)?(?:事实|状态|marker|标记)[：:\s]*`?([A-Z0-9_:-]+)`?/i);
  if (chineseMatch?.[1]) return chineseMatch[1].replace(/[.,;。]/g, "");

  return null;
}

function detectDecision(answer: string): "Go" | "No-Go" | null {
  if (/\bNo-Go\b|判断[:：]?\s*No-Go|不建议发布|不可发布|不应发布/i.test(answer)) {
    return "No-Go";
  }
  if (/\bGo\b|判断[:：]?\s*Go|建议发布|可以发布/i.test(answer)) {
    return "Go";
  }
  return null;
}

function isSupersededWindow(window: string, oldMarker: string): boolean {
  const marker = escapeRegex(oldMarker);
  const supersededPatterns = [
    new RegExp(`${marker}.{0,80}(no longer valid|not valid|superseded|rejected|replaced|invalid)`, "i"),
    new RegExp(`(no longer valid|not valid|superseded|rejected|replaced|invalid).{0,80}${marker}`, "i"),
    new RegExp(`${marker}.{0,80}(已失效|不再有效|已被替换|被拒绝|不再权威)`, "i"),
    new RegExp(`(已失效|不再有效|已被替换|被拒绝|不再权威).{0,80}${marker}`, "i")
  ];
  return supersededPatterns.some((pattern) => pattern.test(window));
}

function isRemediationWindow(window: string, oldMarker: string): boolean {
  const marker = escapeRegex(oldMarker);
  const remediationPatterns = [
    new RegExp(`(future|target|remediation|repair|repaired|achieve|achieved|before|after).{0,100}${marker}`, "i"),
    new RegExp(`${marker}.{0,100}(future|target|remediation|repair|repaired|achieve|achieved)`, "i"),
    new RegExp(`(未来|目标|修复|修复后|恢复|达到|确保达到|重新评估).{0,100}${marker}`, "i"),
    new RegExp(`${marker}.{0,100}(未来|目标|修复|恢复|达到)`, "i")
  ];
  return remediationPatterns.some((pattern) => pattern.test(window));
}

function oldMarkerRole(answer: string, oldMarker: string): {
  hasOldMarker: boolean;
  superseded: boolean;
  remediation: boolean;
  ambiguousOldMarker: boolean;
} {
  const windows = windowAround(answer, oldMarker);
  if (windows.length === 0) {
    return {
      hasOldMarker: false,
      superseded: false,
      remediation: false,
      ambiguousOldMarker: false
    };
  }
  const classified = windows.map((item) => ({
    superseded: isSupersededWindow(item, oldMarker),
    remediation: isRemediationWindow(item, oldMarker)
  }));
  const ambiguousOldMarker = classified.some((item) => !item.superseded && !item.remediation);
  return {
    hasOldMarker: true,
    superseded: classified.some((item) => item.superseded),
    remediation: classified.some((item) => item.remediation),
    ambiguousOldMarker
  };
}

export function evaluateGate2Answer(input: Gate2EvaluationInput): Gate2AnswerEvaluation {
  const answer = normalize(input.answer);
  const reasons: string[] = [];
  const structuredMarker = detectStructuredMarker(answer);
  const decisionDetected = detectDecision(answer);
  const role = oldMarkerRole(answer, input.oldMarker);
  const mentionsCurrent = answer.includes(input.currentMarker);
  const authoritativeFactDetected =
    structuredMarker === input.currentMarker || (!structuredMarker && mentionsCurrent && !role.ambiguousOldMarker)
      ? input.currentMarker
      : structuredMarker;
  const usesLatestFact = authoritativeFactDetected === input.currentMarker;

  if (usesLatestFact) {
    reasons.push(`Current authoritative marker detected as ${input.currentMarker}.`);
  } else if (authoritativeFactDetected === input.oldMarker) {
    reasons.push(`Old marker ${input.oldMarker} was detected as current authoritative marker.`);
  } else {
    reasons.push("Current authoritative marker could not be determined.");
  }

  if (role.superseded) {
    reasons.push(`Old marker ${input.oldMarker} appears only as rejected or superseded fact.`);
  }
  if (role.remediation) {
    reasons.push(`Old marker ${input.oldMarker} appears as remediation or future target.`);
  }
  if (role.ambiguousOldMarker) {
    reasons.push(`Old marker ${input.oldMarker} appears without a clear superseded/remediation role.`);
  }

  if (decisionDetected) {
    reasons.push(`Decision detected as ${decisionDetected}.`);
  } else {
    reasons.push("Decision could not be determined.");
  }

  let evaluationResult: Gate2EvaluationResult = "Passed";
  if (authoritativeFactDetected === input.oldMarker) {
    evaluationResult = "Failed";
  } else if (!usesLatestFact || role.ambiguousOldMarker) {
    evaluationResult = "Inconclusive";
  }

  if (decisionDetected !== input.expectedDecision) {
    evaluationResult = decisionDetected ? "Failed" : "Inconclusive";
    reasons.push(`Decision does not match expected ${input.expectedDecision}.`);
  }

  return {
    candidate: input.candidate,
    authoritativeFactDetected,
    supersededFactDetected: role.superseded ? input.oldMarker : null,
    remediationTargetDetected: role.remediation ? input.oldMarker : null,
    decisionDetected,
    usesLatestFact,
    evaluationResult,
    evaluationReasons: reasons
  };
}
