import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { completeChat, readProviderState } from "../provider/openai-compatible.js";
import { EliyNativeRuntime } from "../runtime/kernel/runtime.js";
import type { RuntimeResult } from "../runtime/kernel/schemas/index.js";
import {
  createSessionTranscript,
  formatSessionTranscriptDebugSummary,
  recordSessionTranscriptTurn
} from "./session-transcript.js";

function printResult<T>(result: RuntimeResult<T>): void {
  console.log(JSON.stringify(result, null, 2));
}

async function runTerminalChatLoop(): Promise<void> {
  const rl = createInterface({ input, output });
  const providerState = readProviderState();
  const transcript = createSessionTranscript();
  const shouldPrintTranscriptDebugSummary = process.env.ELIY_CHAT_DEBUG_TRANSCRIPT === "1";
  console.log("Eliy Native chat loop started. Type /exit to quit.");
  output.write("> ");

  try {
    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (line === "/exit") {
        break;
      }
      if (line.length === 0) {
        recordSessionTranscriptTurn(transcript, { role: "user", content: "" });
        console.log("assistant: empty input received.");
        recordSessionTranscriptTurn(transcript, { role: "assistant", content: "empty input received." });
        output.write("> ");
        continue;
      }
      recordSessionTranscriptTurn(transcript, { role: "user", content: line });
      if (providerState.enabled) {
        try {
          const providerResponse = await completeChat({
            config: providerState.config,
            userInput: line,
            timeoutMs: providerState.config.timeoutMs
          });
          console.log(`assistant: ${providerResponse}`);
          recordSessionTranscriptTurn(transcript, { role: "assistant", content: providerResponse });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Provider request failed with redacted details.";
          console.log(`assistant: provider call failed (${message})`);
          recordSessionTranscriptTurn(transcript, {
            role: "assistant",
            content: `provider call failed (${message})`
          });
        }
        output.write("> ");
        continue;
      }
      console.log(`assistant: skeleton response received: ${line}`);
      console.log("assistant: provider/model adapter not enabled; deterministic skeleton response only; no persistence.");
      recordSessionTranscriptTurn(transcript, {
        role: "assistant",
        content: `skeleton response received: ${line}`
      });
      recordSessionTranscriptTurn(transcript, {
        role: "assistant",
        content: "provider/model adapter not enabled; deterministic skeleton response only; no persistence."
      });
      output.write("> ");
    }
  } finally {
    rl.close();
  }

  if (shouldPrintTranscriptDebugSummary) {
    console.log(formatSessionTranscriptDebugSummary(transcript));
  }
  console.log("Eliy Native chat loop exited.");
}

async function confirm(message: string, bypass = false): Promise<boolean> {
  if (bypass) return true;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(message);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function runtime(): EliyNativeRuntime {
  return new EliyNativeRuntime(process.cwd());
}

async function main(): Promise<void> {
  const program = new Command();
  program.name("eliy").description("Eliy Native Runtime Kernel CLI").version("0.1.0");

  program
    .command("chat")
    .description("Interactive terminal chat loop")
    .addHelpText("after", `

This is the deterministic terminal chat loop.
Type /exit to quit.
Provider config is optional.
Provider/model adapter is enabled only when config is complete.
No session, transcript, or runtime state persistence.
Non-empty input returns a deterministic skeleton response when provider config is incomplete.`)
    .action(async () => {
      await runTerminalChatLoop();
    });

  const workspace = program.command("workspace").description("Workspace commands");
  workspace
    .command("create")
    .description("Create a workspace")
    .requiredOption("--name <name>")
    .requiredOption("--company <company>")
    .option("--owner <owner>", "Owner display name", "rich")
    .option("--yes", "Skip confirmation", false)
    .action(async (options) => {
      const ok = await confirm("Confirm create Workspace? [y/N] ", Boolean(options.yes));
      if (!ok) {
        printResult(runtime().currentWorkspace());
        return;
      }
      printResult(runtime().createWorkspace({ name: options.name, company: options.company, owner_name: options.owner }));
    });

  workspace
    .command("current")
    .description("Show current workspace")
    .action(() => {
      printResult(runtime().currentWorkspace());
    });

  const objective = program.command("objective").description("Objective commands");
  objective
    .command("create")
    .description("Create an objective")
    .requiredOption("--title <title>")
    .requiredOption("--owner <owner>")
    .option("--period <period>")
    .option("--description <description>")
    .option("--workspace <workspace>")
    .option("--yes", "Skip confirmation", false)
    .action(async (options) => {
      const ok = await confirm("Confirm create Objective? [y/N] ", Boolean(options.yes));
      if (!ok) {
        return;
      }
      printResult(runtime().createObjective({
        title: options.title,
        owner_id: options.owner,
        period: options.period,
        description: options.description,
        workspace_id: options.workspace,
        confirmed: true
      }));
    });

  objective
    .command("list")
    .description("List objectives")
    .option("--workspace <workspace>")
    .action((options) => {
      printResult(runtime().listObjectives(options.workspace));
    });

  objective
    .command("show <objective_id>")
    .description("Show objective")
    .option("--workspace <workspace>")
    .action((objective_id, options) => {
      printResult(runtime().showObjective(objective_id, options.workspace));
    });

  objective
    .command("status <objective_id>")
    .description("Show objective status")
    .option("--workspace <workspace>")
    .action((objective_id, options) => {
      printResult(runtime().objectiveStatus(objective_id, options.workspace));
    });

  const otunit = program.command("otunit").description("OTUnit commands");
  otunit
    .command("create")
    .description("Create an OTUnit")
    .requiredOption("--objective <objective>")
    .requiredOption("--title <title>")
    .requiredOption("--owner <owner>")
    .option("--review-at <reviewAt>")
    .option("--due-at <dueAt>")
    .option("--description <description>")
    .option("--plan <plan>")
    .option("--next-action <nextAction>")
    .option("--priority <priority>", "low|medium|high|critical", "medium")
    .option("--workspace <workspace>")
    .option("--yes", "Skip confirmation", false)
    .action(async (options) => {
      const ok = await confirm("Confirm create OTUnit? [y/N] ", Boolean(options.yes));
      if (!ok) return;
      printResult(runtime().createOtUnit({
        objective_id: options.objective,
        title: options.title,
        owner_id: options.owner,
        review_at: options.reviewAt,
        due_at: options.dueAt,
        description: options.description,
        plan: options.plan,
        next_action: options.nextAction,
        priority: options.priority,
        workspace_id: options.workspace,
        confirmed: true
      }));
    });

  otunit
    .command("list")
    .description("List OTUnits for an objective")
    .requiredOption("--objective <objective>")
    .option("--workspace <workspace>")
    .action((options) => {
      printResult(runtime().listOtUnits(options.objective, options.workspace));
    });

  otunit
    .command("show <otunit_id>")
    .description("Show OTUnit")
    .option("--workspace <workspace>")
    .action((otunit_id, options) => {
      printResult(runtime().showOtUnit(otunit_id, options.workspace));
    });

  otunit
    .command("followup <otunit_id>")
    .description("Record an OTUnit follow-up")
    .requiredOption("--text <text>")
    .option("--workspace <workspace>")
    .action((otunit_id, options) => {
      printResult(runtime().followUpOtUnit({
        otunit_id,
        text: options.text,
        workspace_id: options.workspace
      }));
    });

  otunit
    .command("status <otunit_id>")
    .description("Update OTUnit status")
    .requiredOption("--to <status>")
    .option("--workspace <workspace>")
    .option("--yes", "Skip confirmation", false)
    .action(async (otunit_id, options) => {
      const result = runtime().updateOtUnitStatus(otunit_id, options.to, options.workspace, Boolean(options.yes));
      if (result.requires_confirmation && !options.yes) {
        const ok = await confirm("Confirm OTUnit status transition? [y/N] ");
        if (!ok) {
          printResult(result);
          return;
        }
        printResult(runtime().updateOtUnitStatus(otunit_id, options.to, options.workspace, true));
        return;
      }
      printResult(result);
    });

  otunit
    .command("close <otunit_id>")
    .description("Close an OTUnit")
    .requiredOption("--reason <reason>")
    .option("--workspace <workspace>")
    .option("--yes", "Skip confirmation", false)
    .action(async (otunit_id, options) => {
      const ok = await confirm("Confirm close OTUnit? [y/N] ", Boolean(options.yes));
      if (!ok) return;
      printResult(runtime().closeOtUnit(otunit_id, options.reason, options.workspace, true));
    });

  const evidence = program.command("evidence").description("Evidence commands");
  evidence
    .command("list")
    .description("List evidence for an OTUnit")
    .requiredOption("--otunit <otunit>")
    .option("--workspace <workspace>")
    .action((options) => {
      printResult(runtime().listEvidence(options.otunit, options.workspace));
    });

  evidence
    .command("confirm <candidate_id>")
    .description("Confirm an evidence candidate")
    .option("--workspace <workspace>")
    .option("--confirmed-by <user>")
    .option("--yes", "Skip confirmation", false)
    .action(async (candidate_id, options) => {
      const ok = await confirm("Confirm Evidence? [y/N] ", Boolean(options.yes));
      if (!ok) return;
      printResult(runtime().confirmEvidence(candidate_id, options.confirmedBy, options.workspace));
    });

  const review = program.command("review").description("Review commands");
  review
    .command("create")
    .description("Create a review and adjust draft from evidence")
    .requiredOption("--otunit <otunit>")
    .option("--workspace <workspace>")
    .option("--yes", "Skip confirmation", false)
    .action(async (options) => {
      const ok = await confirm("Confirm create Review? [y/N] ", Boolean(options.yes));
      if (!ok) return;
      printResult(runtime().createReview(options.otunit, options.workspace, true));
    });

  const adjust = program.command("adjust").description("Adjust commands");
  adjust
    .command("apply <adjust_id>")
    .description("Apply an adjust")
    .option("--workspace <workspace>")
    .option("--yes", "Skip confirmation", false)
    .action(async (adjust_id, options) => {
      const ok = await confirm("Apply Adjust? [y/N] ", Boolean(options.yes));
      if (!ok) return;
      printResult(runtime().applyAdjust(adjust_id, options.workspace, true));
    });

  const audit = program.command("audit").description("Audit commands");
  audit
    .command("list")
    .description("List audit logs")
    .requiredOption("--workspace <workspace>")
    .action((options) => {
      printResult(runtime().listAudit(options.workspace));
    });

  program
    .command("proof terminal")
    .description("Run the terminal runtime proof")
    .action(() => {
      printResult(runtime().runTerminalProof());
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
