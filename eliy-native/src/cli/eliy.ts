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
  projectOTUnitRevisionLifecycleShowCommandCliWiringBoundary,
} from "../runtime/kernel/otunit-revision-lifecycle-show-command-cli-wiring-boundary.js";
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

 // Structured context snapshot: process-local session memory only.
 // Linked by confirmed OTUnit id. Read-only after confirmed OTUnit creation.
 // Does not persist after process exit.
 const structuredContextSnapshots = new Map<string, {
   objective: string;
   title: string;
   owner: string;
   dueDate: string;
   judgmentCriteria: string;
   planOrActionItems: string[];
   evidenceRefs: string[];
 }>();

  // Process-local follow-up record session memory.
  // Linked by confirmed OTUnit id. Read-only after saved.
  // Does not persist after process exit. Does not mutate OTUnit.
  interface FollowUpRecord {
    id: string;
    otunitId: string;
    text: string;
    createdAt: string;
  }

  const followUpRecords = new Map<string, FollowUpRecord[]>();
  let followUpRecordCounter = 0;

  function addFollowUpRecord(otunitId: string, text: string): FollowUpRecord {
    followUpRecordCounter++;
    const record: FollowUpRecord = {
      id: `session-follow-up-${followUpRecordCounter}`,
      otunitId,
      text,
      createdAt: new Date().toISOString()
    };
    const existing = followUpRecords.get(otunitId) || [];
    existing.push(record);
    followUpRecords.set(otunitId, existing);
    return record;
  }

  function getFollowUpRecords(otunitId: string): FollowUpRecord[] {
    return followUpRecords.get(otunitId) || [];
  }

  function getFollowUpRecordCount(otunitId: string): number {
    return getFollowUpRecords(otunitId).length;
  }

  // Process-local review/check record session memory.
  // Linked by confirmed OTUnit id. Read-only after saved.
  // Does not persist after process exit. Does not mutate OTUnit.
  interface ReviewCheckRecord {
    id: string;
    otunitId: string;
    resultText: string;
    differenceText: string;
    createdAt: string;
  }

  const reviewCheckRecords = new Map<string, ReviewCheckRecord[]>();
  let reviewCheckRecordCounter = 0;

  function addReviewCheckRecord(otunitId: string, resultText: string, differenceText: string): ReviewCheckRecord {
    reviewCheckRecordCounter++;
    const record: ReviewCheckRecord = {
      id: `session-check-record-${reviewCheckRecordCounter}`,
      otunitId,
      resultText,
      differenceText,
      createdAt: new Date().toISOString()
    };
    const existing = reviewCheckRecords.get(otunitId) || [];
    existing.push(record);
    reviewCheckRecords.set(otunitId, existing);
    return record;
  }

  function getReviewCheckRecords(otunitId: string): ReviewCheckRecord[] {
    return reviewCheckRecords.get(otunitId) || [];
  }

 function getReviewCheckRecordCount(otunitId: string): number {
   return getReviewCheckRecords(otunitId).length;
 }

  // Process-local adjust record session memory.
  // Linked by confirmed OTUnit id. Read-only after saved.
  // Does not persist after process exit. Does not mutate OTUnit.
  interface AdjustRecord {
    id: string;
    otunitId: string;
    actionText: string;
    reasonText: string;
    createdAt: string;
  }

  const adjustRecords = new Map<string, AdjustRecord[]>();
  let adjustRecordCounter = 0;

  function addAdjustRecord(otunitId: string, actionText: string, reasonText: string): AdjustRecord {
    adjustRecordCounter++;
    const record: AdjustRecord = {
      id: `session-adjust-record-${adjustRecordCounter}`,
      otunitId,
      actionText,
      reasonText,
      createdAt: new Date().toISOString()
    };
    const existing = adjustRecords.get(otunitId) || [];
    existing.push(record);
    adjustRecords.set(otunitId, existing);
    return record;
  }

  function getAdjustRecords(otunitId: string): AdjustRecord[] {
    return adjustRecords.get(otunitId) || [];
  }

 function getAdjustRecordCount(otunitId: string): number {
   return getAdjustRecords(otunitId).length;
 }
  // Process-local revision intent record session memory.
  // Linked by confirmed OTUnit id. Read-only after saved.
  // Does not persist after process exit. Does not mutate OTUnit.
  // Does not revise, close, replace, or create a new OTUnit.
  interface RevisionIntentRecord {
    id: string;
    otunitId: string;
    reasonText: string;
    directionText: string;
    createdAt: string;
  }
  const revisionIntentRecords = new Map<string, RevisionIntentRecord[]>();
  let revisionIntentRecordCounter = 0;
  function addRevisionIntentRecord(otunitId: string, reasonText: string, directionText: string): RevisionIntentRecord {
    revisionIntentRecordCounter++;
    const record: RevisionIntentRecord = {
      id: `session-revision-intent-record-${revisionIntentRecordCounter}`,
      otunitId,
      reasonText,
      directionText,
      createdAt: new Date().toISOString()
    };
    const existing = revisionIntentRecords.get(otunitId) || [];
    existing.push(record);
    revisionIntentRecords.set(otunitId, existing);
    return record;
  }
  function getRevisionIntentRecords(otunitId: string): RevisionIntentRecord[] {
    return revisionIntentRecords.get(otunitId) || [];
  }
  function getRevisionIntentRecordCount(otunitId: string): number {
    return getRevisionIntentRecords(otunitId).length;
  }

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

   // Store structured context snapshot linked by confirmed OTUnit id.
   // Read-only snapshot, process-local session memory only.
   // Does not persist after process exit.
   structuredContextSnapshots.set(confirmedOTUnit.id, {
     objective: objective,
     title: businessText,
     owner: owner,
     dueDate: dueDate,
     judgmentCriteria: judgmentCriteria,
     planOrActionItems: planOrActionItems,
     evidenceRefs: parsedEvidenceRefs
   });

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
console.log("Type 'follow <id>' to add a follow-up record.");
console.log("Type 'check <id>' to add a review/check record.");
console.log("Type 'adjust <id>' to add an adjust/improvement record.");
   console.log("Type 'revise-intent <id>' to add a revision intent record.");
console.log("Type 'show <id>' to show one OTUnit detail.");
    console.log("Type '/exit' to quit.");

    while (true) {
      const commandLine = await readLine("otunit> ");

      if (commandLine === null) {
        console.log("\nEliy Native OTUnit core loop exited.");
        return;
      }

     const trimmed = commandLine.trim();

     if (trimmed === "/exit" || trimmed === "exit") {
       console.log("\nEliy Native OTUnit core loop exited.");
       return;
     }

      if (trimmed.length === 0) {
        continue;
      }

     if (trimmed === "list") {
       const allOTUnits = repo.listByObjectiveId(objectiveId);
        const otunitsWithFollowUp = allOTUnits.map((u) => ({
          id: u.id,
          title: u.title,
          objectiveId: u.objectiveId,
          owner: u.owner,
          dueDate: u.dueDate,
          status: u.status,
          requiresConfirmation: u.requiresConfirmation,
        structuredContextAvailable: structuredContextSnapshots.has(u.id),
        followUpRecordCount: getFollowUpRecordCount(u.id),
        reviewCheckRecordCount: getReviewCheckRecordCount(u.id),
         adjustRecordCount: getAdjustRecordCount(u.id),
         revisionIntentRecordCount: getRevisionIntentRecordCount(u.id)
      }));
      const listOutput = {
         ok: true,
         ...summaryBase,
         action: "list",
         repositorySource: "process_local_in_memory",
          count: otunitsWithFollowUp.length,
         persistence: false,
         durableRuntimeState: false,
         readOnly: true,
          otunits: otunitsWithFollowUp
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

       const context = structuredContextSnapshots.get(showId);
       const structuredContextAvailable = context !== undefined;

       if (structuredContextAvailable && context !== undefined) {
         console.log("\n--- O 单 Detail ---");
         console.log("Objective: " + context.objective);
         console.log("OTUnit: " + context.title);
         console.log("Owner: " + context.owner);
         console.log("Due / Check Time: " + context.dueDate);
         console.log("Judgment Criteria: " + context.judgmentCriteria);
        console.log("Plan / Action Items:");
        context.planOrActionItems.forEach((item) => console.log(item));
        console.log("Evidence Refs: " + context.evidenceRefs.join(", "));
         console.log("Status: " + foundOTUnit.status);
         console.log("Repository: process-local in-memory");
         console.log("Persistence: false");

         // Print follow-up records (human-readable)
         const followRecords = getFollowUpRecords(showId);
         if (followRecords.length > 0) {
           console.log("");
           console.log("--- Follow-up Records ---");
           followRecords.forEach((rec, index) => {
             console.log((index + 1) + ". " + rec.text);
           });
         }
         // Print review/check records (human-readable)
         const checkRecords = getReviewCheckRecords(showId);
         if (checkRecords.length > 0) {
           console.log("");
           console.log("--- Review / Check Records ---");
           checkRecords.forEach((rec, index) => {
             console.log((index + 1) + ". Result: " + rec.resultText);
            console.log("   Difference / Variance: " + rec.differenceText);
          });
        }

        // Print adjust records (human-readable)
        const adjustRecs = getAdjustRecords(showId);
        if (adjustRecs.length > 0) {
          console.log("");
          console.log("--- Adjust Records ---");
          adjustRecs.forEach((rec, index) => {
            console.log((index + 1) + ". Action: " + rec.actionText);
            console.log("   Reason: " + rec.reasonText);
          });
        }
        // Print revision intent records (human-readable)
        const revisionIntents = getRevisionIntentRecords(showId);
        if (revisionIntents.length > 0) {
          console.log("");
          console.log("--- Revision Intent Records ---");
          revisionIntents.forEach((rec, index) => {
            console.log((index + 1) + ". Reason: " + rec.reasonText);
            console.log("   Proposed Revision Direction: " + rec.directionText);
            console.log("   Created At: " + rec.createdAt);
          });
        }
        // O'PDCA Summary: derived from existing structured context and session records
         console.log("");
         console.log("--- O'PDCA Summary ---");
         console.log("Objective / Plan:");
         console.log("Objective: " + context.objective);
         console.log("OTUnit: " + context.title);
         console.log("Judgment Criteria: " + context.judgmentCriteria);
         console.log("Plan / Action Items:");
         context.planOrActionItems.forEach((item) => console.log(item));

         console.log("");
         console.log("Do Records:");
         if (followRecords.length > 0) {
           followRecords.forEach((rec) => console.log("- " + rec.text));
         } else {
           console.log("No follow-up records in this process-local session.");
         }

         console.log("");
         console.log("Check Records:");
         if (checkRecords.length > 0) {
           checkRecords.forEach((rec) => {
             console.log("- Result: " + rec.resultText);
             console.log("  Difference / Variance: " + rec.differenceText);
           });
         } else {
           console.log("No review/check records in this process-local session.");
         }

        console.log("");
        console.log("Adjust Records:");
        if (adjustRecs.length > 0) {
          adjustRecs.forEach((rec) => {
            console.log("- Action: " + rec.actionText);
            console.log("  Reason: " + rec.reasonText);
          });
        } else {
          console.log("No adjust records in this process-local session.");
        }
        console.log("");
        console.log("Revision Intent:");
        console.log("Revision Intent Count: " + getRevisionIntentRecordCount(showId));
        const opdcaRevisionIntents = getRevisionIntentRecords(showId);
        if (opdcaRevisionIntents.length > 0) {
          opdcaRevisionIntents.forEach((rec) => {
            console.log("- Revision Reason: " + rec.reasonText);
            console.log("  Proposed Direction: " + rec.directionText);
          });
        } else {
          console.log("No revision intent records in this process-local session.");
        }

        console.log("");
        console.log("Current Status:");
         console.log("Status: " + foundOTUnit.status);
         console.log("Requires Confirmation: " + foundOTUnit.requiresConfirmation);
         console.log("Repository: process-local in-memory");
         console.log("Persistence: false");

      } else {
        console.log("Structured context snapshot not available for this OTUnit in the current process-local session.");
      }

      const showOutput: Record<string, unknown> = {
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
         },
         structuredContextAvailable: structuredContextAvailable
       };

       if (structuredContextAvailable && context !== undefined) {
         showOutput.structuredContext = {
           objective: context.objective,
           title: context.title,
           owner: context.owner,
           dueDate: context.dueDate,
           judgmentCriteria: context.judgmentCriteria,
           planOrActionItems: context.planOrActionItems,
           evidenceRefs: context.evidenceRefs
         };
       }

       showOutput.followUpRecordCount = getFollowUpRecordCount(showId);
       showOutput.reviewCheckRecordCount = getReviewCheckRecordCount(showId);
       showOutput.followUpRecords = getFollowUpRecords(showId).map(r => ({
         id: r.id,
         otunitId: r.otunitId,
         text: r.text,
         createdAt: r.createdAt
       }));

      showOutput.reviewCheckRecords = getReviewCheckRecords(showId).map(r => ({
        id: r.id,
        otunitId: r.otunitId,
        resultText: r.resultText,
        differenceText: r.differenceText,
        createdAt: r.createdAt
      }));

      showOutput.adjustRecordCount = getAdjustRecordCount(showId);
      showOutput.adjustRecords = getAdjustRecords(showId).map(r => ({
        id: r.id,
        otunitId: r.otunitId,
        actionText: r.actionText,
        reasonText: r.reasonText,
        createdAt: r.createdAt
      }));
      showOutput.revisionIntentRecordCount = getRevisionIntentRecordCount(showId);
      showOutput.revisionIntentRecords = getRevisionIntentRecords(showId).map(r => ({
        id: r.id,
        otunitId: r.otunitId,
        reasonText: r.reasonText,
        directionText: r.directionText,
        createdAt: r.createdAt
      }));

      if (structuredContextAvailable && context !== undefined) {
        showOutput.opdcaSummaryAvailable = true;
        showOutput.opdcaSummary = {
          objective: context.objective,
          planItems: context.planOrActionItems,
          doRecordCount: getFollowUpRecordCount(showId),
          checkRecordCount: getReviewCheckRecordCount(showId),
          adjustRecordCount: getAdjustRecordCount(showId),
          revisionIntentRecordCount: getRevisionIntentRecordCount(showId),
          currentStatus: {
            status: foundOTUnit.status,
            requiresConfirmation: foundOTUnit.requiresConfirmation,
            repositorySource: "process_local_in_memory",
            persistence: false
          }
        };
      } else {
        showOutput.opdcaSummaryAvailable = false;
      }
      console.log(JSON.stringify(showOutput, null, 2));
      continue;
      }

      if (trimmed === "follow" || trimmed.startsWith("follow ")) {
        const followId = trimmed.slice(7).trim();

        if (followId.length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "follow", found: false, id: "",
            message: "Missing id. Usage: follow <id>",
            followUpSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const foundOTUnit = repo.getById(followId);

        if (foundOTUnit === undefined) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "follow", found: false, id: followId,
            message: "OTUnit not found in this process-local session repository.",
            followUpSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Prompt for follow-up text
        const followUpTextLine = await readLine("Enter follow-up record text: ");

        if (followUpTextLine === null || followUpTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "follow", found: true, id: followId,
            message: "Blank follow-up text. No follow-up record saved.",
            followUpSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const followUpText = followUpTextLine.trim();

        // Print human-readable follow-up preview
        console.log("");
        console.log("--- Follow-up Preview ---");
        const followContext = structuredContextSnapshots.get(followId);
        console.log("OTUnit: " + (followContext ? followContext.title : foundOTUnit.title));
        console.log("OTUnit ID: " + followId);
        console.log("Follow-up Text: " + followUpText);
        console.log("Repository: process-local in-memory");
        console.log("Persistence: false");

        // Ask for explicit confirmation
        const confirmSignal = await readLine("Confirm save follow-up record? (confirm to save, /exit to quit): ");

        if (confirmSignal === null || confirmSignal.trim() === "/exit") {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "follow", found: true, id: followId,
            followUpPreviewPrinted: true,
            followUpConfirmed: false,
            followUpSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const isConfirmed = confirmSignal.trim() === "confirm" || confirmSignal.trim() === "确认";

        if (!isConfirmed) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "follow", found: true, id: followId,
            followUpPreviewPrinted: true,
            followUpConfirmed: false,
            followUpSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Save the follow-up record
        const savedRecord = addFollowUpRecord(followId, followUpText);

        console.log(JSON.stringify({
          ok: true, ...summaryBase, action: "follow", found: true, id: followId,
          followUpSaved: true,
          followUpRecord: {
            id: savedRecord.id,
            otunitId: savedRecord.otunitId,
            text: savedRecord.text,
            createdAt: savedRecord.createdAt
          },
          otunitMutated: false,
          otunitStatusChanged: false,
          repositorySource: "process_local_in_memory",
          persistence: false,
          durableRuntimeState: false,
          providerRequired: false,
          chatWrites: false
        }, null, 2));
        continue;
      }

      if (trimmed === "check" || trimmed.startsWith("check ")) {
        const checkId = trimmed.slice(6).trim();

        if (checkId.length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "check", found: false, id: "",
            message: "Missing id. Usage: check <id>",
            reviewCheckSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const foundOTUnit = repo.getById(checkId);

        if (foundOTUnit === undefined) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "check", found: false, id: checkId,
            message: "OTUnit not found in this process-local session repository.",
            reviewCheckSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Prompt for check result text
        const checkResultTextLine = await readLine("Enter check result text: ");

        if (checkResultTextLine === null || checkResultTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "check", found: true, id: checkId,
            message: "Blank check result text. No review/check record saved.",
            reviewCheckSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const checkResultText = checkResultTextLine.trim();

        // Prompt for difference/variance text
        const differenceTextLine = await readLine("Enter difference / variance text: ");

        if (differenceTextLine === null || differenceTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "check", found: true, id: checkId,
            message: "Blank difference / variance text. No review/check record saved.",
            reviewCheckSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const differenceText = differenceTextLine.trim();

        // Print human-readable review/check preview
        const checkContext = structuredContextSnapshots.get(checkId);
        console.log("");
        console.log("--- Review / Check Preview ---");
        console.log("OTUnit: " + (checkContext ? checkContext.title : foundOTUnit.title));
        console.log("OTUnit ID: " + checkId);
        console.log("Check Result: " + checkResultText);
        console.log("Difference / Variance: " + differenceText);
        console.log("Repository: process-local in-memory");
        console.log("Persistence: false");

        // Ask for explicit confirmation
        const confirmSignal = await readLine("Confirm save review/check record? (confirm to save, /exit to quit): ");

        if (confirmSignal === null || confirmSignal.trim() === "/exit") {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "check", found: true, id: checkId,
            reviewCheckPreviewPrinted: true,
            reviewCheckConfirmed: false,
            reviewCheckSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const isConfirmed = confirmSignal.trim() === "confirm" || confirmSignal.trim() === "确认";

        if (!isConfirmed) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "check", found: true, id: checkId,
            reviewCheckPreviewPrinted: true,
            reviewCheckConfirmed: false,
            reviewCheckSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Save the review/check record
        const savedRecord = addReviewCheckRecord(checkId, checkResultText, differenceText);

        console.log(JSON.stringify({
          ok: true, ...summaryBase, action: "check", found: true, id: checkId,
          reviewCheckSaved: true,
          reviewCheckRecord: {
            id: savedRecord.id,
            otunitId: savedRecord.otunitId,
            resultText: savedRecord.resultText,
            differenceText: savedRecord.differenceText,
            createdAt: savedRecord.createdAt
          },
          otunitMutated: false,
          otunitStatusChanged: false,
          otunitClosed: false,
          otunitRevised: false,
          adjustmentCreated: false,
          repositorySource: "process_local_in_memory",
          persistence: false,
          durableRuntimeState: false,
          providerRequired: false,
          chatWrites: false
        }, null, 2));
        continue;
      }
      if (trimmed === "adjust" || trimmed.startsWith("adjust ")) {
        const adjustId = trimmed.slice(7).trim();

        if (adjustId.length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "adjust", found: false, id: "",
            message: "Missing id. Usage: adjust <id>",
            adjustSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const foundOTUnit = repo.getById(adjustId);

        if (foundOTUnit === undefined) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "adjust", found: false, id: adjustId,
            message: "OTUnit not found in this process-local session repository.",
            adjustSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Prompt for adjustment / improvement action text
        const actionTextLine = await readLine("Enter adjustment / improvement action text: ");

        if (actionTextLine === null || actionTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "adjust", found: true, id: adjustId,
            message: "Blank adjustment text. No adjust record saved.",
            adjustSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const actionText = actionTextLine.trim();

        // Prompt for reason text
        const reasonTextLine = await readLine("Enter reason text: ");

        if (reasonTextLine === null || reasonTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "adjust", found: true, id: adjustId,
            message: "Blank reason text. No adjust record saved.",
            adjustSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const reasonText = reasonTextLine.trim();

        // Print human-readable adjust preview
        const adjustContext = structuredContextSnapshots.get(adjustId);
        console.log("");
        console.log("--- Adjust Preview ---");
        console.log("OTUnit: " + (adjustContext ? adjustContext.title : foundOTUnit.title));
        console.log("OTUnit ID: " + adjustId);
        console.log("Adjustment / Improvement Action: " + actionText);
        console.log("Reason: " + reasonText);
        console.log("Repository: process-local in-memory");
        console.log("Persistence: false");

        // Ask for explicit confirmation
        const confirmSignal = await readLine("Confirm save adjust record? (confirm to save, /exit to quit): ");

        if (confirmSignal === null || confirmSignal.trim() === "/exit") {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "adjust", found: true, id: adjustId,
            adjustPreviewPrinted: true,
            adjustConfirmed: false,
            adjustSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const isConfirmed = confirmSignal.trim() === "confirm" || confirmSignal.trim() === "确认";

        if (!isConfirmed) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "adjust", found: true, id: adjustId,
            adjustPreviewPrinted: true,
            adjustConfirmed: false,
            adjustSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Save the adjust record
        const savedRecord = addAdjustRecord(adjustId, actionText, reasonText);

        console.log(JSON.stringify({
          ok: true, ...summaryBase, action: "adjust", found: true, id: adjustId,
          adjustSaved: true,
          adjustRecord: {
            id: savedRecord.id,
            otunitId: savedRecord.otunitId,
            actionText: savedRecord.actionText,
            reasonText: savedRecord.reasonText,
            createdAt: savedRecord.createdAt
          },
          otunitMutated: false,
          otunitStatusChanged: false,
          otunitClosed: false,
          otunitRevised: false,
          otunitReplaced: false,
          repositorySource: "process_local_in_memory",
          persistence: false,
          durableRuntimeState: false,
          providerRequired: false,
          chatWrites: false
        }, null, 2));
        continue;
      }

      if (trimmed === "revise-intent" || trimmed.startsWith("revise-intent ")) {
        const reviseIntentId = trimmed.slice(13).trim();

        if (reviseIntentId.length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "revise-intent", found: false, id: "",
            message: "Missing id. Usage: revise-intent <id>",
            revisionIntentSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true,
            otunitMutated: false,
            otunitStatusChanged: false,
            otunitRevised: false,
            otunitClosed: false,
            otunitReplaced: false,
            newOTUnitCreated: false
          }, null, 2));
          continue;
        }

        const foundOTUnit = repo.getById(reviseIntentId);

        if (foundOTUnit === undefined) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "revise-intent", found: false, id: reviseIntentId,
            message: "OTUnit not found in this process-local session repository.",
            revisionIntentSaved: false,
            persistence: false, durableRuntimeState: false, readOnly: true,
            otunitMutated: false,
            otunitStatusChanged: false,
            otunitRevised: false,
            otunitClosed: false,
            otunitReplaced: false,
            newOTUnitCreated: false
          }, null, 2));
          continue;
        }

        // Prompt for revision reason text
        const reasonTextLine = await readLine("Enter revision reason text: ");

        if (reasonTextLine === null || reasonTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "revise-intent", found: true, id: reviseIntentId,
            message: "Blank revision reason text. No revision intent record saved.",
            revisionIntentSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            otunitRevised: false,
            otunitClosed: false,
            otunitReplaced: false,
            newOTUnitCreated: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const reasonText = reasonTextLine.trim();

        // Prompt for proposed revision direction text
        const directionTextLine = await readLine("Enter proposed revision direction text: ");

        if (directionTextLine === null || directionTextLine.trim().length === 0) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "revise-intent", found: true, id: reviseIntentId,
            message: "Blank proposed revision direction text. No revision intent record saved.",
            revisionIntentSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            otunitRevised: false,
            otunitClosed: false,
            otunitReplaced: false,
            newOTUnitCreated: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const directionText = directionTextLine.trim();

        // Print human-readable revision intent preview
        const reviseContext = structuredContextSnapshots.get(reviseIntentId);
        console.log("");
        console.log("--- Revision Intent Preview ---");
        console.log("OTUnit ID: " + reviseIntentId);
        console.log("Revision Reason: " + reasonText);
        console.log("Proposed Revision Direction: " + directionText);
        console.log("Repository: process-local in-memory");
        console.log("Persistence: false");

        // Ask for explicit confirmation
        const confirmSignal = await readLine("Confirm saving this revision intent record? (confirm to save, /exit to quit): ");

        if (confirmSignal === null || confirmSignal.trim() === "/exit") {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "revise-intent", found: true, id: reviseIntentId,
            revisionIntentPreviewPrinted: true,
            revisionIntentConfirmed: false,
            revisionIntentSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            otunitRevised: false,
            otunitClosed: false,
            otunitReplaced: false,
            newOTUnitCreated: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        const isConfirmed = confirmSignal.trim() === "confirm" || confirmSignal.trim() === "确认";

        if (!isConfirmed) {
          console.log(JSON.stringify({
            ok: false, ...summaryBase, action: "revise-intent", found: true, id: reviseIntentId,
            revisionIntentPreviewPrinted: true,
            revisionIntentConfirmed: false,
            revisionIntentSaved: false,
            otunitMutated: false,
            otunitStatusChanged: false,
            otunitRevised: false,
            otunitClosed: false,
            otunitReplaced: false,
            newOTUnitCreated: false,
            persistence: false, durableRuntimeState: false, readOnly: true
          }, null, 2));
          continue;
        }

        // Save the revision intent record
        const savedRecord = addRevisionIntentRecord(reviseIntentId, reasonText, directionText);

        console.log(JSON.stringify({
          ok: true, ...summaryBase, action: "revise-intent", found: true, id: reviseIntentId,
          revisionIntentSaved: true,
          revisionIntentRecord: {
            id: savedRecord.id,
            otunitId: savedRecord.otunitId,
            reasonText: savedRecord.reasonText,
            directionText: savedRecord.directionText,
            createdAt: savedRecord.createdAt
          },
          otunitMutated: false,
          otunitStatusChanged: false,
          otunitRevised: false,
          otunitClosed: false,
          otunitReplaced: false,
          newOTUnitCreated: false,
          repositorySource: "process_local_in_memory",
          persistence: false,
          durableRuntimeState: false,
          providerRequired: false,
          chatWrites: false
        }, null, 2));
        continue;
      }

     console.log(JSON.stringify({
       ok: false, ...summaryBase, action: "unrecognized",
       message: "Unrecognized command: " + trimmed + ". You are inside the OTUnit session command loop. Use list, show <id>, follow <id>, check <id>, adjust <id>, revise-intent <id>, /exit, or exit.",
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

async function runTerminalRevisionLifecycleShowCommand(): Promise<void> {
  const result = await projectOTUnitRevisionLifecycleShowCommandCliWiringBoundary({
    id: "cli-wiring-run-001"
  });

  console.log(result.stdout);
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

  const otunit = program
    .command("otunit")
    .description("OTUnit commands")
    .addHelpText("after", `

This is a deterministic inspection-only command.
It does not create, save, list, show, or confirm OTUnits from user input.
It does not wait for stdin.
It does not require provider config.
The revision lifecycle show path is wired separately as a deterministic read-only CLI command.`)
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

  const otunitRevision = otunit.command("revision").description("OTUnit revision commands");
  const otunitRevisionLifecycle = otunitRevision.command("lifecycle").description("OTUnit revision lifecycle commands");
  otunitRevisionLifecycle
    .command("show")
    .description("Show the revision lifecycle as deterministic plain text")
    .addHelpText("after", `

This command is read-only.
It does not mutate source OTUnits.
It does not persist to files, databases, or provider-backed state.`)
    .action(async () => {
      await runTerminalRevisionLifecycleShowCommand();
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
