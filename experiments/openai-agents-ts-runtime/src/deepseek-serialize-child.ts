import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { run, RunState } from "@openai/agents";
import { createRefundAgent, disableTracingExport } from "./agent.js";
import { configureDeepSeekProvider, getDeepSeekProviderConfig } from "./deepseek-provider.js";
import { installRuntimeNetworkLogger, persistRuntimeNetworkRecords } from "./network-log.js";
import { ensureDirs, logsDir, writeJson } from "./storage.js";
import { getToolExecutionCount } from "./tool.js";

async function main(): Promise<void> {
  await ensureDirs();
  disableTracingExport();
  const provider = configureDeepSeekProvider();
  installRuntimeNetworkLogger();

  const [statePath, decision] = process.argv.slice(2);
  if (!statePath || !decision) {
    throw new Error("Usage: node dist/deepseek-serialize-child.js <statePath> <approve|reject>");
  }

  const serializedState = await readFile(statePath, "utf8");
  const agent = createRefundAgent(provider.model);
  const state = await RunState.fromString(agent, serializedState);
  const [approval] = state.getInterruptions();
  if (!approval) {
    throw new Error("Serialized RunState had no pending interruption.");
  }

  const before = await getToolExecutionCount();
  if (decision === "approve") {
    state.approve(approval);
  } else if (decision === "reject") {
    state.reject(approval, { message: "Rejected by restart child process." });
  } else {
    throw new Error(`Unknown decision: ${decision}`);
  }

  const result = await run(agent, state, { maxTurns: 5 });
  const after = await getToolExecutionCount();
  await persistRuntimeNetworkRecords();
  await writeJson(join(logsDir, "deepseek-serialize-child-result.json"), {
    provider: {
      baseURL: getDeepSeekProviderConfig().baseURL,
      model: getDeepSeekProviderConfig().model
    },
    newProcessPid: process.pid,
    stateFileSha256: createHash("sha256").update(serializedState).digest("hex"),
    stateFileBytes: Buffer.byteLength(serializedState),
    decision,
    before,
    after,
    finalOutput: result.finalOutput,
    interruptionsAfterResume: result.interruptions.length,
    rawResponseCount: result.rawResponses.length,
    usage: result.rawResponses.map((response) => response.usage),
    stateSchemaVersion: result.state.toJSON().$schemaVersion
  });
}

main().catch(async (error) => {
  await writeJson(join(logsDir, "deepseek-serialize-child-error.json"), {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exitCode = 1;
});
