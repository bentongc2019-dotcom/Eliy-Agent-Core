import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { OTUnit } from "../domain/index.js";
import {
  ALLOWED_OTUNIT_TRANSITIONS,
  OTUNIT_STATUSES,
  confirmOTUnit,
  createOTUnitReviewIntent,
  createProposedOTUnitFromDraft,
  createInMemoryOTUnitRepository,
  reviseOTUnit,
  validateEvidenceRefs
} from "../domain/index.js";
import { completeChat, readProviderState } from "../provider/openai-compatible.js";
import { EliyNativeRuntime } from "../runtime/kernel/runtime.js";
import type { RuntimeResult } from "../runtime/kernel/schemas/index.js";
import {
  createSessionTranscript,
  formatSessionTranscriptDebugSummary,
  recordSessionTranscriptTurn
} from "./session-transcript.js";

function printResult<T>(result: T): void {
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

  program
    .command("otunit")
    .description("OTUnit commands")
    .addHelpText("after", `

This is a deterministic inspection-only command.
It does not create, save, list, show, or confirm OTUnits from user input.
It does not wait for stdin.
It does not require provider config.`)
    .action(() => {
      const repo = createInMemoryOTUnitRepository();

      // --- Deterministic fixture data ---
      const fixture1: OTUnit = {
        id: "fixture-otunit-001",
        objectiveId: "fixture-objective-001",
        title: "Fixture OTUnit inspection save",
        owner: "inspector",
        dueDate: "2026-07-15",
        status: "proposed",
        evidenceRefs: ["evidence-fixture-001"],
        requiresConfirmation: true,
        createdAt: "2026-07-04T00:00:00.000Z"
      };

      const fixture2: OTUnit = {
        id: "fixture-otunit-002",
        objectiveId: "fixture-objective-001",
        title: "Second fixture OTUnit for inspection",
        owner: "inspector",
        dueDate: "2026-07-20",
        status: "proposed",
        evidenceRefs: ["evidence-fixture-002"],
        requiresConfirmation: true,
        createdAt: "2026-07-04T00:00:00.000Z"
      };

      const fixture3: OTUnit = {
        id: "fixture-otunit-003",
        objectiveId: "fixture-objective-002",
        title: "Third fixture OTUnit different objective",
        owner: "inspector",
        dueDate: "2026-07-25",
        status: "proposed",
        evidenceRefs: ["evidence-fixture-003"],
        requiresConfirmation: true,
        createdAt: "2026-07-04T00:00:00.000Z"
      };

      // --- saveValidOTUnit ---
      const saveResult1 = repo.save(fixture1);
      const saveResult2 = repo.save(fixture2);
      const saveResult3 = repo.save(fixture3);
      const saveValidOTUnit = saveResult1.valid && saveResult2.valid && saveResult3.valid;

      // --- getById ---
      const getById1 = repo.getById(fixture1.id);
      const getById2 = repo.getById(fixture2.id);
      const getByIdMissing = repo.getById("non-existent-id");
      const getByIdResult =
        getById1 !== undefined &&
        getById1.id === fixture1.id &&
        getById1.title === fixture1.title &&
        getById1.objectiveId === fixture1.objectiveId &&
        getById1.status === fixture1.status &&
        getById2 !== undefined &&
        getById2.id === fixture2.id &&
        getByIdMissing === undefined;

      // --- listByObjectiveId ---
      const listResult1 = repo.listByObjectiveId("fixture-objective-001");
      const listResult2 = repo.listByObjectiveId("fixture-objective-002");
      const listResultMissing = repo.listByObjectiveId("non-existent-objective");
      const listByObjectiveIdResult =
        listResult1.length === 2 &&
        listResult1.every((u) => u.objectiveId === "fixture-objective-001") &&
        listResult1.sort((a, b) => a.id.localeCompare(b.id))[0].id === "fixture-otunit-001" &&
        listResult2.length === 1 &&
        listResult2[0].id === "fixture-otunit-003" &&
        listResultMissing.length === 0;

      // --- mutationSafeCopies ---
      let mutationSafeCopies = false;
      if (getById1 !== undefined) {
        const returnedCopy = repo.getById(fixture1.id)!;
        const originalTitle = returnedCopy.title;
        const originalEvidenceRefs = [...returnedCopy.evidenceRefs];

        // Mutate the returned copy aggressively.
        returnedCopy.title = "MUTATED";
        returnedCopy.owner = "MUTATED";
        returnedCopy.dueDate = "MUTATED";
        returnedCopy.evidenceRefs.push("MUTATED-REF");

        // Re-retrieve and confirm stored state is unchanged.
        const storedAgain = repo.getById(fixture1.id)!;
        mutationSafeCopies =
          storedAgain.title === originalTitle &&
          storedAgain.evidenceRefs.join(",") === originalEvidenceRefs.join(",");
      }

      // --- clear ---
      repo.clear();
      const clearResult =
        repo.getById(fixture1.id) === undefined &&
        repo.getById(fixture2.id) === undefined &&
        repo.getById(fixture3.id) === undefined &&
        repo.listByObjectiveId("fixture-objective-001").length === 0 &&
        repo.listByObjectiveId("fixture-objective-002").length === 0;

      printResult({
        ok: true,
        command: "otunit",
        mode: "domain_contract_inspection",
        domain: {
          otunit: {
            available: true,
            statusValues: [...OTUNIT_STATUSES],
            allowedTransitionsCount: ALLOWED_OTUNIT_TRANSITIONS.length,
            confirmationBoundaryAvailable: typeof confirmOTUnit === "function",
            draftBoundaryAvailable: typeof createProposedOTUnitFromDraft === "function",
            evidenceRefBoundaryAvailable: typeof validateEvidenceRefs === "function",
            reviewRevisionBoundaryAvailable:
              typeof createOTUnitReviewIntent === "function" && typeof reviseOTUnit === "function",
            repositoryBoundaryAvailable:
              typeof repo.save === "function" &&
              typeof repo.getById === "function" &&
              typeof repo.listByObjectiveId === "function" &&
              typeof repo.clear === "function"
          }
        },
        repository: {
          implementation: "in_memory",
          persistence: false,
          durableRuntimeState: false,
          chatWrites: false
        },
        repositoryInspection: {
          saveValidOTUnit,
          getById: getByIdResult,
          listByObjectiveId: listByObjectiveIdResult,
          clear: clearResult,
          mutationSafeCopies,
          persistedAfterProcessExit: false,
          stdinRequired: false,
          chatCreatesOTUnits: false,
          mutationCliCommands: false
        },
        requiresProviderConfig: false,
        waitsForStdin: false,
        persistence: false
      });
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
