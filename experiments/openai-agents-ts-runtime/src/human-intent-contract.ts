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
