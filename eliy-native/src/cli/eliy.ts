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
  parseEvidenceRefs,
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
 * After business text input, prompts for minimal structured fields:
 * objective, owner, due date/check time, judgment criteria, plan/action items,
 * and optional evidence refs.
 * Validates required fields and evidence refs against existing domain boundaries.
 * Prints improved draft preview with captured fields instead of all-missing checklist.
 * Prints human-readable O 单 summary for easier review.
 * Uses captured owner and due date for OTUnit creation.
 * Includes read-only session-local list/show after confirmed OTUnit save.
 * Does not call providers, does not persist to filesystem/database/network.
 * Does not write to normal chat.
 * Supports /exit at any prompt.
 */
async function runTerminalOTUnitCoreLoopSkeleton(): Promise<void> {
  const rl = createInterface({ input, output });
  const now = new Date().toISOString();
  const repo = createInMemoryOTUnitRepository();
  const objectiveId = "default-objective";

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

  // --- Structured field capture summary additions ---
  const structuredFieldBase: Record<string, unknown> = {
    businessTextCaptured: false,
    structuredFieldsCaptured: false,
    objectiveCaptured: false,
    ownerCaptured: false,
    dueDateCaptured: false,
    judgmentCriteriaCaptured: false,
    planOrActionItemsCaptured: false,
    evidenceRefsCaptured: false,
    evidenceRefsValid: true,
    draftIntentCreated: false,
    draftPreviewCreated: false,
    humanReadableSummaryPrinted: false,
    previewConfirmed: false,
    proposedOTUnitCreated: false,
    proposedOTUnitConfirmed: false,
    confirmedOTUnitCreated: false,
    repositorySaved: false,
    repositoryGetByIdVerified: false,
    repositoryListByObjectiveIdVerified: false
  };

  const buildFailureFlags = (overrides: Record<string, unknown>): Record<string, unknown> => ({
    ok: false,
    ...summaryBase,
    ...structuredFieldBase,
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

    // Business text captured successfully.
    structuredFieldBase.businessTextCaptured = true;

    // ---- Step 2: Read structured fields ----
    const objectiveLine = await readLine("Enter objective: ");
    if (objectiveLine === null) {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }
    const objective = objectiveLine;

    const ownerLine = await readLine("Enter owner: ");
    if (ownerLine === null) {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }
    const owner = ownerLine;

    const dueDateLine = await readLine("Enter due date or check time: ");
    if (dueDateLine === null) {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }
    const dueDate = dueDateLine;

    const judgmentCriteriaLine = await readLine("Enter judgment criteria: ");
    if (judgmentCriteriaLine === null) {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }
    const judgmentCriteria = judgmentCriteriaLine;

    // Read plan/action items as multi-line until blank line.
    const planOrActionItems: string[] = [];
    while (true) {
      const itemLine = await readLine("Enter plan or action item (or blank to finish): ");
      if (itemLine === null) {
        console.log("Eliy Native OTUnit core loop exited.");
        return;
      }
      if (itemLine.trim().length === 0) break;
      planOrActionItems.push(itemLine);
    }

    const evidenceRefsLine = await readLine("Enter evidence refs, comma-separated, optional: ");
    if (evidenceRefsLine === null) {
      console.log("Eliy Native OTUnit core loop exited.");
      return;
    }

    // Parse evidence refs: normalize delimiters, trim, filter empty strings.
    const parsedEvidenceRefs = parseEvidenceRefs(evidenceRefsLine);

    // --- Validate required structured fields ---
    const missingFields = [];
    if (objective.length === 0) missingFields.push("objective");
    if (owner.length === 0) missingFields.push("owner");
    if (dueDate.length === 0) missingFields.push("dueDate");
    if (judgmentCriteria.length === 0) missingFields.push("judgmentCriteria");
    if (planOrActionItems.length === 0) missingFields.push("planOrActionItems");

    if (missingFields.length > 0) {
      console.log(
        "Missing required structured field(s): " + missingFields.join(", ") + ". " +
        "Deterministic OTUnit core loop cannot proceed to proposed OTUnit creation."
      );
      printSummary(
        buildFailureFlags({
          stepReached: "structured_fields_read",
          businessTextCaptured: true,
          objectiveCaptured: objective.length > 0,
          ownerCaptured: owner.length > 0,
          dueDateCaptured: dueDate.length > 0,
          judgmentCriteriaCaptured: judgmentCriteria.length > 0,
          planOrActionItemsCaptured: planOrActionItems.length > 0,
          evidenceRefsCaptured: parsedEvidenceRefs.length > 0,
          missingFields
        })
      );
      return;
    }

    structuredFieldBase.objectiveCaptured = true;
    structuredFieldBase.ownerCaptured = true;
    structuredFieldBase.dueDateCaptured = true;
    structuredFieldBase.judgmentCriteriaCaptured = true;
    structuredFieldBase.planOrActionItemsCaptured = planOrActionItems.length > 0;
    structuredFieldBase.evidenceRefsCaptured = parsedEvidenceRefs.length > 0;

    // --- Validate evidence refs if non-empty ---
    if (parsedEvidenceRefs.length > 0) {
      const evRefsResult = validateEvidenceRefs(parsedEvidenceRefs);
      if (!evRefsResult.valid) {
        console.log(
          "Invalid evidence refs. Deterministic OTUnit core loop cannot proceed to proposed OTUnit creation."
        );
        printSummary(
          buildFailureFlags({
            stepReached: "structured_fields_read",
            businessTextCaptured: true,
            objectiveCaptured: true,
            ownerCaptured: true,
            dueDateCaptured: true,
            judgmentCriteriaCaptured: true,
            planOrActionItemsCaptured: planOrActionItems.length > 0,
            evidenceRefsCaptured: true,
            evidenceRefsValid: false
          })
        );
        return;
      }
    }

    structuredFieldBase.structuredFieldsCaptured = true;
    structuredFieldBase.evidenceRefsValid = true;

    // ---- Step 3: Draft intent ----
    const intentInput = {
      sessionId: "terminal-otunit-loop-session-1",
      userText: "Create an OTUnit draft from this input.",
      assistantText: businessText
    };

    const intentResult = detectOTUnitDraftIntent(intentInput);
    const draftIntentCreated = intentResult.valid && intentResult.intentDetected;
    structuredFieldBase.draftIntentCreated = draftIntentCreated;

    if (!draftIntentCreated) {
      printSummary(
        buildFailureFlags({
          stepReached: "structured_fields_read",
          businessTextCaptured: true,
          objectiveCaptured: true,
          ownerCaptured: true,
          dueDateCaptured: true,
          judgmentCriteriaCaptured: true,
          planOrActionItemsCaptured: true,
          evidenceRefsCaptured: parsedEvidenceRefs.length > 0,
          evidenceRefsValid: true,
          structuredFieldsCaptured: true,
          draftIntentCreated: false
        })
      );
      return;
    }

    // ---- Step 4: Draft preview ----
    const previewResult = previewOTUnitDraftFromChat(intentInput);
    const draftPreviewCreated =
      previewResult.valid && previewResult.previewAvailable && previewResult.draftPreview !== null;
    structuredFieldBase.draftPreviewCreated = draftPreviewCreated;

    if (!draftPreviewCreated || previewResult.draftPreview === null) {
      printSummary(buildFailureFlags({ stepReached: "draft_intent_created" }));
      return;
    }

    const draftPreview = previewResult.draftPreview;

    // Override planAware with captured fields.
    const overriddenPlanAware = {
      ...draftPreview.planAware,
      objective: objective,
      owner: owner,
      dueDateOrCheckTime: dueDate,
      judgmentCriteria: judgmentCriteria,
      planOrActionItems: planOrActionItems,
      evidenceRefs: parsedEvidenceRefs,
      missingInformation: []
    };

    const overriddenPreview = {
      ...draftPreview,
      planAware: overriddenPlanAware
    };

    // ---- Step 5: Print improved draft preview with captured fields ----
    console.log("\n--- Draft Preview ---");
    console.log("  Title: " + overriddenPreview.title);
    console.log("  Objective: " + overriddenPreview.planAware.objective);
    console.log("  Owner: " + overriddenPreview.planAware.owner);
    console.log("  Due Date / Check Time: " + overriddenPreview.planAware.dueDateOrCheckTime);
    console.log("  Judgment Criteria: " + overriddenPreview.planAware.judgmentCriteria);
    console.log("  Plan / Action Items: " + overriddenPreview.planAware.planOrActionItems.join(", "));
    console.log(
      "  Evidence Refs: " +
        (overriddenPreview.planAware.evidenceRefs.length > 0
          ? overriddenPreview.planAware.evidenceRefs.join(", ")
          : "(none)")
    );

    // ---- Step 6: Print human-readable O 单 summary ----
    console.log("\n--- O 单 Summary ---");
    console.log("Objective: " + objective);
    console.log("OTUnit: " + businessText);
    console.log("Owner: " + owner);
    console.log("Due / Check Time: " + dueDate);
    console.log("Judgment Criteria: " + judgmentCriteria);
    console.log("Plan / Action Items: " + planOrActionItems.join('\n'));
    console.log(
      "Evidence Refs: " +
        (parsedEvidenceRefs.length > 0 ? parsedEvidenceRefs.join(", ") : "none")
    );
    console.log("Repository: process-local in-memory");
    console.log("Persistence: false");

    structuredFieldBase.humanReadableSummaryPrinted = true;

    // ---- Step 7: First confirmation ----
    const previewConfirmationLine = await readLine(
      "\nApprove this preview for proposed OTUnit creation? (confirm to proceed, /exit to quit): "
    );

    if (previewConfirmationLine === null || previewConfirmationLine.trim() === "/exit") {
      printSummary(buildFailureFlags({ stepReached: "draft_preview_created" }));
      return;
    }

    // ---- Step 8: Create proposed OTUnit using captured fields ----
    const proposedResult = createProposedOTUnitFromConfirmedPreview({
      draftPreview: overriddenPreview,
      userConfirmationSignal: previewConfirmationLine.trim(),
      objectiveId,
      owner,
      dueDate,
      createdAt: now
    });

    const previewConfirmed = proposedResult.valid;
    const proposedOTUnitCreated = proposedResult.valid && proposedResult.otunit !== null;
    structuredFieldBase.previewConfirmed = previewConfirmed;
    structuredFieldBase.proposedOTUnitCreated = proposedOTUnitCreated;

    if (!previewConfirmed || !proposedOTUnitCreated || proposedResult.otunit === null) {
      printSummary(buildFailureFlags({ stepReached: "draft_preview_created" }));
      return;
    }

    const proposedOTUnit = proposedResult.otunit;

    if (proposedOTUnit.status !== "proposed") {
      printSummary(buildFailureFlags({ stepReached: "preview_confirmed" }));
      return;
    }

    if (proposedOTUnit.owner !== owner || proposedOTUnit.dueDate !== dueDate) {
      printSummary(buildFailureFlags({
        stepReached: "preview_confirmed",
        message: "Proposed OTUnit owner/dueDate mismatch"
      }));
      return;
    }

    // ---- Step 9: Second confirmation ----
    const proposedConfirmationLine = await readLine(
      "Confirm the proposed OTUnit into confirmed status? (confirm to proceed, /exit to quit): "
    );

    if (proposedConfirmationLine === null || proposedConfirmationLine.trim() === "/exit") {
      printSummary(buildFailureFlags({ stepReached: "proposed_otunit_created" }));
      return;
    }

    // ---- Step 10: Create confirmed OTUnit ----
    const confirmResult = confirmProposedOTUnit({
      otunit: proposedOTUnit,
      userConfirmationSignal: proposedConfirmationLine.trim(),
      confirmedAt: now
    });

    const proposedOTUnitConfirmed = confirmResult.valid;
    const confirmedOTUnitCreated = confirmResult.valid && confirmResult.otunit !== null;
    structuredFieldBase.proposedOTUnitConfirmed = proposedOTUnitConfirmed;
    structuredFieldBase.confirmedOTUnitCreated = confirmedOTUnitCreated;

    if (!proposedOTUnitConfirmed || !confirmedOTUnitCreated || confirmResult.otunit === null) {
      printSummary(buildFailureFlags({ stepReached: "proposed_otunit_created" }));
      return;
    }

    const confirmedOTUnit = confirmResult.otunit;

    if (confirmedOTUnit.status !== "confirmed") {
      printSummary(buildFailureFlags({ stepReached: "proposed_otunit_confirmed" }));
      return;
    }

    if (confirmedOTUnit.owner !== owner || confirmedOTUnit.dueDate !== dueDate) {
      printSummary(buildFailureFlags({
        stepReached: "proposed_otunit_confirmed",
        message: "Confirmed OTUnit owner/dueDate mismatch"
      }));
      return;
    }

    // ---- Step 11: Save to repository ----
    const saveResult = repo.save(confirmedOTUnit);
    const repositorySaved = saveResult.valid;
    structuredFieldBase.repositorySaved = repositorySaved;

    if (!repositorySaved) {
      printSummary(buildFailureFlags({ stepReached: "confirmed_otunit_created" }));
      return;
    }

    // ---- Step 12: Verify getById ----
    const retrieved = repo.getById(confirmedOTUnit.id);
    const repositoryGetByIdVerified =
      retrieved !== undefined && retrieved.id === confirmedOTUnit.id && retrieved.status === "confirmed";
    structuredFieldBase.repositoryGetByIdVerified = repositoryGetByIdVerified;

    const getByIdOwnerMatches = retrieved !== undefined && retrieved.owner === owner;
    const getByIdDueDateMatches = retrieved !== undefined && retrieved.dueDate === dueDate;

    // ---- Step 13: Verify listByObjectiveId ----
    const listed = repo.listByObjectiveId(objectiveId);
    const repositoryListByObjectiveIdVerified = listed.some((u) => u.id === confirmedOTUnit.id);
    structuredFieldBase.repositoryListByObjectiveIdVerified = repositoryListByObjectiveIdVerified;

    const listOwnerMatches = listed.some((u) => u.id === confirmedOTUnit.id && u.owner === owner);
    const listDueDateMatches = listed.some((u) => u.id === confirmedOTUnit.id && u.dueDate === dueDate);

    // ---- Step 14: Print final summary ----
    if (repositoryGetByIdVerified && repositoryListByObjectiveIdVerified) {
      printSummary({
        ok: true,
        ...summaryBase,
        businessTextCaptured: true,
        structuredFieldsCaptured: true,
        objectiveCaptured: true,
        ownerCaptured: true,
        dueDateCaptured: true,
        judgmentCriteriaCaptured: true,
        planOrActionItemsCaptured: true,
        evidenceRefsCaptured: parsedEvidenceRefs.length > 0,
        evidenceRefsValid: true,
        stepReached: "confirmed_otunit_repository_verified",
        draftIntentCreated: true,
        draftPreviewCreated: true,
        humanReadableSummaryPrinted: true,
        previewConfirmed: true,
        proposedOTUnitCreated: true,
        proposedOTUnitConfirmed: true,
        confirmedOTUnitCreated: true,
        repositorySaved: true,
        repositoryGetByIdVerified: true,
        repositoryListByObjectiveIdVerified: true
      });
    } else {
      printSummary(buildFailureFlags({ stepReached: "confirmed_otunit_repository_saved" }));
    }

    // ---- Step 15: Session-local list/show ----
    console.log("\n--- Session-local list/show (read-only, in-memory) ---");
    console.log("Type 'list' to list all session OTUnits.");
    console.log("Type 'show <id>' to show one OTUnit detail.");
    console.log("Type '/exit' to quit.");

    while (true) {
      const commandLine = await readLine("otunit> ");

      if (commandLine === null) {
        console.log("\nEliy Native OTUnit core loop exited.");
        return;
      }

      const trimmed = commandLine.trim();

      if (trimmed === "/exit") {
        console.log("\nEliy Native OTUnit core loop exited.");
        return;
      }

      if (trimmed.length === 0) {
        continue;
      }

      if (trimmed === "list") {
        const allOTUnits = repo.listByObjectiveId(objectiveId);
        const listOutput = {
          ok: true,
          ...summaryBase,
          action: "list",
          repositorySource: "process_local_in_memory",
          count: allOTUnits.length,
          persistence: false,
          durableRuntimeState: false,
          readOnly: true,
          otunits: allOTUnits.map((u) => ({
            id: u.id,
            title: u.title,
            objectiveId: u.objectiveId,
            owner: u.owner,
            dueDate: u.dueDate,
            status: u.status,
            requiresConfirmation: u.requiresConfirmation
          }))
        };
        console.log(JSON.stringify(listOutput, null, 2));
        continue;
      }

      if (trimmed === "show" || trimmed.startsWith("show ")) {
        const showId = trimmed.slice(5).trim();

        if (showId.length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "show", found: false, id: "",
            message: "Missing id. Usage: show <id>",
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const foundOTUnit = repo.getById(showId);

        if (foundOTUnit === undefined) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "show", found: false, id: showId,
            message: "OTUnit not found in this process-local session repository.",
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        console.log(JSON.stringify({
          ok: true, ...summaryBase, action: "show", found: true, id: foundOTUnit.id,
          repositorySource: "process_local_in_memory",
          persistence: false, durableRuntimeState: false, readOnly: true,
          otunit: {
            id: foundOTUnit.id, title: foundOTUnit.title,
            objectiveId: foundOTUnit.objectiveId,
            owner: foundOTUnit.owner, dueDate: foundOTUnit.dueDate,
            status: foundOTUnit.status,
            requiresConfirmation: foundOTUnit.requiresConfirmation,
            evidenceRefs: foundOTUnit.evidenceRefs,
            createdAt: foundOTUnit.createdAt
          }
        }, null, 2));
        continue;
      }

      console.log(JSON.stringify({
        ok: false, ...summaryBase, action: "unrecognized",
        message: "Unrecognized command: " + trimmed + ". Type 'list', 'show <id>', or '/exit'.",
        persistence: false, durableRuntimeState: false, readOnly: true
      }, null, 2));
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
