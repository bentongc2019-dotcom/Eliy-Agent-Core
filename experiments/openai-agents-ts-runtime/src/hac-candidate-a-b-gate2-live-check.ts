import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createDeepSeekClient, getDeepSeekProviderConfig } from "./deepseek-provider.js";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import { createProductLaunchState, provideLaunchFacts, readProductLaunchMaterials } from "./hac-scenario-fixtures.js";
import { loadOperationalState, saveOperationalState } from "./operational-state.js";
import { reportsDir, ensureDirs, nowIso, stateDir, writeJson } from "./storage.js";
import { applyStateTransition } from "./state-transition.js";
import { evaluateGate2Answer } from "./hac-gate2-evaluator.js";

type LiveResult = {
  mode: "candidate-a" | "candidate-b";
  requestCount: number;
  mentionsCorrected: boolean;
  mentionsOld: boolean;
  answer: string;
  usage: unknown;
  evaluation: ReturnType<typeof evaluateGate2Answer>;
};

function sanitize(value: unknown): string {
  const secret = process.env.DEEPSEEK_API_KEY;
  let text = typeof value === "string" ? value : JSON.stringify(value);
  if (secret) text = text.replaceAll(secret, "[REDACTED]");
  return text;
}

async function askModel(mode: "candidate-a" | "candidate-b", stateView: unknown): Promise<LiveResult> {
  const config = getDeepSeekProviderConfig();
  const client = createDeepSeekClient();
  const corrected = "ROLLBACK_NOT_RELIABLE";
  const old = "ROLLBACK_READY";
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content:
          "Use only the provided state view. Answer with the current authoritative rollback marker and whether it supports Go or No-Go."
      },
      {
        role: "user",
        content: `Mode: ${mode}\nState view:\n${JSON.stringify(stateView, null, 2)}`
      }
    ]
  });
  const answer = response.choices[0]?.message?.content ?? "";
  const evaluation = evaluateGate2Answer({
    candidate: mode,
    answer,
    currentMarker: corrected,
    oldMarker: old,
    expectedDecision: "No-Go"
  });
  return {
    mode,
    requestCount: 1,
    mentionsCorrected: answer.includes(corrected),
    mentionsOld: answer.includes(old),
    answer,
    usage: response.usage ?? null,
    evaluation
  };
}

async function runLive(): Promise<void> {
  await ensureDirs();
  const config = getDeepSeekProviderConfig();
  const runId = `candidate-a-b-gate2-live-${Date.now()}`;
  const runDir = join(reportsDir, "runs", runId);

  if (!config.apiKeyPresent) {
    await writeJson(join(runDir, "live-comparison.json"), {
      result: "Gate 2 Inconclusive",
      reason: "Credential Blocked before live model comparison",
      apiKeyStatus: "NOT_SET"
    });
    console.log("Credential Blocked before live model comparison");
    return;
  }

  const oldMarker = "ROLLBACK_READY";
  const correctedMarker = "ROLLBACK_NOT_RELIABLE";
  let state = provideLaunchFacts(readProductLaunchMaterials(createProductLaunchState("gate2-live")));
  state.facts = state.facts.map((fact) =>
    fact.id === "fact-release-rollback-ready"
      ? {
          ...fact,
          content: `Rollback marker: ${oldMarker}.`
        }
      : fact
  );

  const candidateA = {
    ...state,
    facts: state.facts.map((fact) =>
      fact.id === "fact-release-rollback-ready"
        ? {
            ...fact,
            content: `Rollback marker: ${correctedMarker}.`,
            source: "human_correction",
            evidenceRefs: ["human_correction:rollback_marker"]
          }
        : fact
    )
  };
  const transition = applyStateTransition(state, {
    transitionId: "gate2-live-candidate-b-correction",
    expectedVersion: state.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-release-rollback-ready",
      content: `Rollback marker: ${correctedMarker}.`,
      source: "human_correction",
      status: "confirmed"
    },
    reason: "Human corrected rollback readiness before live model comparison.",
    evidenceRefs: ["human_correction:rollback_marker"],
    timestamp: nowIso()
  });
  if (!transition.ok || !transition.applied) {
    throw new Error("Unable to prepare Candidate B live state.");
  }

  await saveOperationalState(join(stateDir, "gate2", runId, "candidate-a.json"), candidateA);
  await saveOperationalState(join(stateDir, "gate2", runId, "candidate-b.json"), transition.state);
  const loadedA = await loadOperationalState(join(stateDir, "gate2", runId, "candidate-a.json"));
  const loadedB = await loadOperationalState(join(stateDir, "gate2", runId, "candidate-b.json"));

  const resultA = await askModel("candidate-a", loadedA);
  const resultB = await askModel("candidate-b", createAgentStateSnapshot(loadedB));
  const passed =
    resultA.evaluation.evaluationResult === "Passed" &&
    resultB.evaluation.evaluationResult === "Passed";
  await writeJson(join(runDir, "live-comparison.json"), {
    result: passed ? "Live comparison passed" : "Live comparison failed",
    model: config.model,
    requestCount: resultA.requestCount + resultB.requestCount,
    candidateA: resultA,
    candidateB: resultB
  });
  await writeFile(
    join(reportsDir, "hac-candidate-a-b-gate2-live-report.md"),
    `# Candidate A/B Gate 2 Live Report

Result: ${passed ? "Passed" : "Failed"}

API request count: ${resultA.requestCount + resultB.requestCount}

Candidate A answer:

\`\`\`text
${sanitize(resultA.answer)}
\`\`\`

Candidate B answer:

\`\`\`text
${sanitize(resultB.answer)}
\`\`\`
`,
    "utf8"
  );
  console.log(passed ? "Candidate A/B Gate 2 live comparison: Passed" : "Candidate A/B Gate 2 live comparison: Failed");
}

runLive().catch((error: unknown) => {
  console.error(sanitize(error instanceof Error ? error.stack ?? error.message : String(error)));
  process.exitCode = 1;
});
