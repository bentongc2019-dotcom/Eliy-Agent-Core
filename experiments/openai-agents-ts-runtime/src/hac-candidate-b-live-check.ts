import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createAgentStateSnapshot } from "./agent-state-snapshot.js";
import { createDeepSeekClient, getDeepSeekProviderConfig } from "./deepseek-provider.js";
import { createInitialComplaintIntent } from "./hac-scenario-fixtures.js";
import { createInitialOperationalState } from "./loop-controller.js";
import { loadOperationalState, saveOperationalState } from "./operational-state.js";
import { reportsDir, ensureDirs, nowIso, stateDir, writeJson } from "./storage.js";
import { applyStateTransition } from "./state-transition.js";

type LiveCheckConclusion =
  | "Candidate B Gate 1 Passed"
  | "Candidate B Gate 1 Failed"
  | "Candidate B Spike Stopped by Boundary";

type LiveCheckManifest = {
  runId: string;
  timestamp: string;
  branch: string;
  gitCommit: string;
  gitStatusClean: boolean;
  provider: "deepseek-openai-compatible";
  model: string;
  testCommand: "npm run test:hac-candidate-b-live";
  apiKeyStatus: "SET" | "NOT_SET";
  requestCount: number;
  result: LiveCheckConclusion;
  reportPaths: string[];
};

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: "../..", encoding: "utf8" }).trim();
}

function sanitize(value: unknown): string {
  const secret = process.env.DEEPSEEK_API_KEY;
  let text = typeof value === "string" ? value : JSON.stringify(value);
  if (secret) {
    text = text.replaceAll(secret, "[REDACTED]");
  }
  return text;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.toLowerCase().includes(term.toLowerCase()));
}

async function writeReports(args: {
  runId: string;
  conclusion: LiveCheckConclusion;
  requestCount: number;
  evidence: Record<string, unknown>;
  error?: unknown;
}): Promise<void> {
  const config = getDeepSeekProviderConfig();
  const manifestPath = join(reportsDir, "runs", args.runId, "candidate-b-live-run-manifest.json");
  const reportPath = join(reportsDir, "hac-candidate-b-shared-state-minimum-live-report.md");
  const branch = git(["branch", "--show-current"]);
  const gitCommit = git(["rev-parse", "--short", "HEAD"]);
  const status = git(["status", "--short"]);
  const manifest: LiveCheckManifest = {
    runId: args.runId,
    timestamp: new Date().toISOString(),
    branch,
    gitCommit,
    gitStatusClean: status.length === 0,
    provider: "deepseek-openai-compatible",
    model: config.model,
    testCommand: "npm run test:hac-candidate-b-live",
    apiKeyStatus: config.apiKeyPresent ? "SET" : "NOT_SET",
    requestCount: args.requestCount,
    result: args.conclusion,
    reportPaths: [
      "reports/hac-candidate-b-shared-state-minimum-live-report.md",
      `reports/runs/${args.runId}/candidate-b-live-run-manifest.json`
    ]
  };

  await writeJson(manifestPath, manifest);
  await writeFile(
    reportPath,
    `# Candidate B Shared State Live Check

Task: CP-HAC-CANDIDATE-B-SHARED-STATE-MINIMUM-SPIKE-01

## Scope

This live check validates only that a model response consumes the latest read-only Agent State Snapshot after an authoritative State Transition.

## Boundary

- SDK Runtime was not modified.
- deepseek-provider.ts was not modified by this check.
- agent.ts and tool.ts were not used or modified.
- No external tool was invoked.
- No UI, Memory, Skill, Ontology, Multi-agent, or prompt framework was introduced.

## Environment

- Branch: ${branch}
- HEAD: ${gitCommit}
- Git status clean: ${status.length === 0 ? "true" : "false"}
- Provider: DeepSeek OpenAI-compatible Chat Completions
- Model: ${config.model}
- DEEPSEEK_API_KEY: ${config.apiKeyPresent ? "SET" : "NOT_SET"}
- API request count: ${args.requestCount}

## Evidence

\`\`\`json
${JSON.stringify(args.evidence, null, 2)}
\`\`\`

${args.error ? `## Error\n\n\`\`\`text\n${sanitize(args.error)}\n\`\`\`\n` : ""}

## Conclusion

${args.conclusion}
`,
    "utf8"
  );
}

async function runLiveCheck(): Promise<void> {
  await ensureDirs();
  const config = getDeepSeekProviderConfig();
  const runId = `candidate-b-live-${Date.now()}`;
  if (!config.apiKeyPresent) {
    await writeReports({
      runId,
      conclusion: "Candidate B Spike Stopped by Boundary",
      requestCount: 0,
      evidence: {
        credentialStatus: "NOT_SET",
        liveModelCheck: "Credential Blocked before live model check"
      }
    });
    console.log("Credential Blocked before live model check");
    return;
  }

  const oldKeyword = "DELIVERY_DELAY_CONFIRMED";
  const correctedKeyword = "SUPPORT_RESPONSE_DELAY_CONFIRMED";
  const state = createInitialOperationalState("candidate-b-live-loop", nowIso(), createInitialComplaintIntent());
  state.facts.push({
    id: "fact-live-authoritative-issue",
    kind: "fact",
    content: `Authoritative issue marker: ${oldKeyword}.`,
    source: "candidate_b_live_fixture",
    status: "confirmed",
    evidenceRefs: ["fixture:initial_fact"]
  });

  const initialSnapshot = createAgentStateSnapshot(state);
  const correction = applyStateTransition(state, {
    transitionId: "candidate-b-live-fact-correction",
    expectedVersion: state.version,
    actor: "human",
    operation: {
      type: "correct_fact",
      factId: "fact-live-authoritative-issue",
      content: `Authoritative issue marker: ${correctedKeyword}.`,
      source: "human_correction",
      status: "confirmed"
    },
    reason: "Human corrected the authoritative operational fact before the next agent turn.",
    evidenceRefs: ["human_correction:candidate_b_live_fact"],
    timestamp: nowIso()
  });
  if (!correction.ok || !correction.applied) {
    throw new Error("Candidate B live check could not apply fact correction.");
  }

  const statePath = join(stateDir, "candidate-b-live-operational-state.json");
  const saveResult = await saveOperationalState(statePath, correction.state);
  const reloaded = await loadOperationalState(statePath);
  const latestSnapshot = createAgentStateSnapshot(reloaded);
  const snapshotHash = createHash("sha256").update(JSON.stringify(latestSnapshot)).digest("hex");

  const client = createDeepSeekClient();
  let requestCount = 0;
  try {
    requestCount += 1;
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "Answer using only the JSON Agent State Snapshot in the user message. Do not infer facts from prior context. Return one concise sentence."
        },
        {
          role: "user",
          content: `Latest Agent State Snapshot:\n${JSON.stringify(latestSnapshot, null, 2)}\n\nWhat is the current authoritative issue marker?`
        }
      ]
    });
    const answer = response.choices[0]?.message?.content ?? "";
    const mentionsCorrected = includesAny(answer, [correctedKeyword]);
    const mentionsOld = includesAny(answer, [oldKeyword]);
    const passed = mentionsCorrected && !mentionsOld;
    await writeReports({
      runId,
      conclusion: passed ? "Candidate B Gate 1 Passed" : "Candidate B Gate 1 Failed",
      requestCount,
      evidence: {
        initialSnapshotHadOldKeyword: JSON.stringify(initialSnapshot).includes(oldKeyword),
        transitionVersionBefore: correction.transition.versionBefore,
        transitionVersionAfter: correction.transition.versionAfter,
        savedStateSha256: saveResult.sha256,
        latestSnapshotHash: snapshotHash,
        latestSnapshotHadCorrectedKeyword: JSON.stringify(latestSnapshot).includes(correctedKeyword),
        latestSnapshotHadOldKeyword: JSON.stringify(latestSnapshot).includes(oldKeyword),
        modelAnswer: answer,
        mentionsCorrected,
        mentionsOld,
        model: response.model || config.model,
        requestId: response._request_id ?? null,
        usage: response.usage ?? null
      }
    });
    console.log(passed ? "Candidate B live model check: Passed" : "Candidate B live model check: Failed");
  } catch (error) {
    await writeReports({
      runId,
      conclusion: "Candidate B Gate 1 Failed",
      requestCount,
      evidence: {
        latestSnapshotHash: snapshotHash,
        errorType: error instanceof Error ? error.name : typeof error
      },
      error
    });
    console.error(sanitize(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

runLiveCheck().catch((error: unknown) => {
  console.error(sanitize(error instanceof Error ? error.stack ?? error.message : String(error)));
  process.exitCode = 1;
});
