import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { run, RunState } from "@openai/agents";
import { createRefundAgent, disableTracingExport } from "./agent.js";
import { installRuntimeNetworkLogger, persistRuntimeNetworkRecords } from "./network-log.js";
import { ensureDirs, logsDir, writeJson } from "./storage.js";
import { getToolExecutionCount } from "./tool.js";

async function main(): Promise<void> {
  await ensureDirs();
  disableTracingExport();
  installRuntimeNetworkLogger();

  const [statePath, decision] = process.argv.slice(2);
  if (!statePath || !decision) {
    throw new Error("Usage: tsx src/serialize-child.ts <statePath> <approve|reject>");
  }

  const model = process.env.OPENAI_MODEL || undefined;
  const agent = createRefundAgent(model);
  const serializedState = await readFile(statePath, "utf8");
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
  await writeJson(join(logsDir, "serialize-child-result.json"), {
    decision,
    before,
    after,
    finalOutput: result.finalOutput,
    interruptionsAfterResume: result.interruptions.length,
    stateSchemaVersion: result.state.toJSON().$schemaVersion
  });
}

main().catch(async (error) => {
  await writeJson(join(logsDir, "serialize-child-error.json"), {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exitCode = 1;
});
