import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { OTUnit, OTUnitDraftPreview } from "../domain/index.js";
import {
  ALLOWED_OTUNIT_TRANSITIONS,
  OTUNIT_STATUSES,
  confirmOTUnit,
  createOTUnitReviewIntent,
  createProposedOTUnitFromDraft,
  createInMemoryOTUnitRepository,
  reviseOTUnit,
  validateEvidenceRefs,
  detectOTUnitDraftIntent,
  previewOTUnitDraftFromChat,
  createProposedOTUnitFromConfirmedPreview,
  confirmProposedOTUnit
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


/**
 * Terminal-only deterministic OTUnit core loop skeleton.
 *
 * Guides a finite, deterministic flow using existing OTUnit domain boundaries.
 * Does not call providers, does not persist to filesystem/database/network.
 * Does not write to normal chat.
 * Supports /exit at any prompt.
 */
async function runTerminalOTUnitCoreLoopSkeleton(): Promise<void> {
  const rl = createInterface({ input, output });
  const now = new Date().toISOString();
  const repo = createInMemoryOTUnitRepository();

  console.log("Eliy Native OTUnit core loop started. Type /exit to quit.");

  // Line reader using async iterator to support both pipe and interactive modes.
  const lineIterator = rl[Symbol.asyncIterator]();
  const readLine = async (prompt: string): Promise<string | null> => {
    output.write(prompt);
    const { value, done } = await lineIterator.next();
    if (done) return null;
    return value as string;
  };

  const printSummary = (summary: Record<string, unknown>): void => {
    console.log("\n" + JSON.stringify(summary, null, 2));
  };

  const summaryBase: Record<string, unknown> = {
    command: "otunit-core-loop",
    mode: "terminal_skeleton",
    chatWrites: false,
    persistence: false,
    durableRuntimeState: false,
    providerRequired: false
  };

  const buildFailureFlags = (overrides: Record<string, unknown>): Record<string, unknown> => ({
    ok: false,
    ...summaryBase,
    draftIntentCreated: false,
    draftPreviewCreated: false,
    previewConfirmed: false,
    proposedOTUnitCreated: false,
    proposedOTUnitConfirmed: false,
    confirmedOTUnitCreated: false,
    repositorySaved: false,
    repositoryGetByIdVerified: false,
    repositoryListByObjectiveIdVerified: false,
    ...overrides
  });

  try {
    // ---- Step 1: Business text input ----
    const businessTextLine = await readLine("Enter business text for the OTUnit: ");

    if (businessTextLine === null) {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }

    if (businessTextLine.trim() === "/exit") {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }

    const businessText = businessTextLine.trim();
    if (businessText.length === 0) {
      console.log("Missing business text. Deterministic OTUnit core loop cannot proceed without input.");
      printSummary(buildFailureFlags({ stepReached: "none" }));
      return;
    }

    // ---- Step 2: Draft intent ----
    const intentInput = {
      sessionId: "terminal-otunit-loop-session-1",
      userText: "Create an OTUnit draft from this input.",
      assistantText: businessText
    };

    const intentResult = detectOTUnitDraftIntent(intentInput);
    const draftIntentCreated = intentResult.valid && intentResult.intentDetected;

    if (!draftIntentCreated) {
      printSummary(buildFailureFlags({ stepReached: "none", draftIntentCreated: false }));
      return;
    }

    // ---- Step 3: Draft preview ----
    const previewResult = previewOTUnitDraftFromChat(intentInput);
    const draftPreviewCreated =
      previewResult.valid && previewResult.previewAvailable && previewResult.draftPreview !== null;

    if (!draftPreviewCreated || previewResult.draftPreview === null) {
      printSummary(
        buildFailureFlags({
          stepReached: "draft_intent_created",
          draftIntentCreated: true,
          draftPreviewCreated: false
        })
      );
      return;
    }

    const draftPreview: OTUnitDraftPreview = previewResult.draftPreview;

    // Print preview summary
    console.log("--- Draft Preview ---");
    console.log("  Title: " + draftPreview.title);
    console.log("  Source: " + draftPreview.source);
    console.log("  Status: " + draftPreview.status);
    console.log("  Plan-Aware Checklist:");
    for (const item of draftPreview.planAware.checklist) {
      console.log("    " + item.key + " [" + item.status + "]: " + item.reason);
    }

    // ---- Step 4: Preview confirmation ----
    const previewConfirmationLine = await readLine(
      "Confirm the above draft preview? (confirm to proceed, /exit to quit): "
    );

    if (previewConfirmationLine === null || previewConfirmationLine.trim() === "/exit") {
      printSummary(
        buildFailureFlags({
          stepReached: "draft_preview_created",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: false
        })
      );
      return;
    }

    // ---- Step 5: Create proposed OTUnit ----
    const proposedResult = createProposedOTUnitFromConfirmedPreview({
      draftPreview,
      userConfirmationSignal: previewConfirmationLine.trim(),
      objectiveId: "default-objective",
      owner: "default-owner",
      dueDate: "2026-12-31",
      createdAt: now
    });

    const previewConfirmed = proposedResult.valid;
    const proposedOTUnitCreated = proposedResult.valid && proposedResult.otunit !== null;

    if (!previewConfirmed || !proposedOTUnitCreated || proposedResult.otunit === null) {
      printSummary(
        buildFailureFlags({
          stepReached: "draft_preview_created",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: false,
          proposedOTUnitCreated: false
        })
      );
      return;
    }

    const proposedOTUnit: OTUnit = proposedResult.otunit;

    // Verify proposed OTUnit invariants
    if (proposedOTUnit.status !== "proposed") {
      printSummary(
        buildFailureFlags({
          stepReached: "preview_confirmed",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: true,
          proposedOTUnitCreated: false
        })
      );
      return;
    }

    // ---- Step 6: Proposed OTUnit confirmation ----
    const proposedConfirmationLine = await readLine(
      "Confirm the proposed OTUnit? (confirm to proceed, /exit to quit): "
    );

    if (proposedConfirmationLine === null || proposedConfirmationLine.trim() === "/exit") {
      printSummary(
        buildFailureFlags({
          stepReached: "proposed_otunit_created",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: true,
          proposedOTUnitCreated: true,
          proposedOTUnitConfirmed: false
        })
      );
      return;
    }

    // ---- Step 7: Create confirmed OTUnit ----
    const confirmResult = confirmProposedOTUnit({
      otunit: proposedOTUnit,
      userConfirmationSignal: proposedConfirmationLine.trim(),
      confirmedAt: now
    });

    const proposedOTUnitConfirmed = confirmResult.valid;
    const confirmedOTUnitCreated = confirmResult.valid && confirmResult.otunit !== null;

    if (!proposedOTUnitConfirmed || !confirmedOTUnitCreated || confirmResult.otunit === null) {
      printSummary(
        buildFailureFlags({
          stepReached: "proposed_otunit_created",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: true,
          proposedOTUnitCreated: true,
          proposedOTUnitConfirmed: false,
          confirmedOTUnitCreated: false
        })
      );
      return;
    }

    const confirmedOTUnit: OTUnit = confirmResult.otunit;

    // Verify confirmed OTUnit invariants
    if (confirmedOTUnit.status !== "confirmed") {
      printSummary(
        buildFailureFlags({
          stepReached: "proposed_otunit_confirmed",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: true,
          proposedOTUnitCreated: true,
          proposedOTUnitConfirmed: true,
          confirmedOTUnitCreated: false
        })
      );
      return;
    }

    // ---- Step 8: Save to repository ----
    const saveResult = repo.save(confirmedOTUnit);
    const repositorySaved = saveResult.valid;

    if (!repositorySaved) {
      printSummary(
        buildFailureFlags({
          stepReached: "confirmed_otunit_created",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: true,
          proposedOTUnitCreated: true,
          proposedOTUnitConfirmed: true,
          confirmedOTUnitCreated: true,
          repositorySaved: false
        })
      );
      return;
    }

    // ---- Step 9: Verify getById ----
    const retrieved = repo.getById(confirmedOTUnit.id);
    const repositoryGetByIdVerified =
      retrieved !== undefined && retrieved.id === confirmedOTUnit.id && retrieved.status === "confirmed";

    // ---- Step 10: Verify listByObjectiveId ----
    const listed = repo.listByObjectiveId("default-objective");
    const repositoryListByObjectiveIdVerified = listed.some((u) => u.id === confirmedOTUnit.id);

    // ---- Step 11: Print final summary ----
    if (repositoryGetByIdVerified && repositoryListByObjectiveIdVerified) {
      printSummary({
        ok: true,
        ...summaryBase,
        stepReached: "confirmed_otunit_repository_verified",
        draftIntentCreated: true,
        draftPreviewCreated: true,
        previewConfirmed: true,
        proposedOTUnitCreated: true,
        proposedOTUnitConfirmed: true,
        confirmedOTUnitCreated: true,
        repositorySaved: true,
        repositoryGetByIdVerified: true,
        repositoryListByObjectiveIdVerified: true
      });
    } else {
      printSummary(
        buildFailureFlags({
          stepReached: "confirmed_otunit_repository_saved",
          draftIntentCreated: true,
          draftPreviewCreated: true,
          previewConfirmed: true,
          proposedOTUnitCreated: true,
          proposedOTUnitConfirmed: true,
          confirmedOTUnitCreated: true,
          repositorySaved: true,
          repositoryGetByIdVerified: true,
          repositoryListByObjectiveIdVerified: true
        })
      );
    }
  } finally {
    rl.close();
  }
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


  program
    .command("otunit-core-loop")
    .description("Run the deterministic OTUnit core loop skeleton")
    .addHelpText("after", `

This is a deterministic terminal-only OTUnit core loop skeleton.
It reads stdin line-by-line and guides a finite OTUnit core flow.
Type /exit to quit at any prompt.
No provider, no persistence, no chat writes.`)
    .action(async () => {
      await runTerminalOTUnitCoreLoopSkeleton();
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

