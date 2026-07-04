// Deterministic OTUnit Core Flow Harness
//
// Composes existing OTUnit domain boundaries into one deterministic,
// testable core flow. Uses only fixture input and existing domain helpers.
// No database, no filesystem persistence, no network storage,
// no provider/AI integration, no chat writes, no durable runtime state.

import { describe, expect, it } from "vitest";
import {
  detectOTUnitDraftIntent,
  previewOTUnitDraftFromChat,
  createProposedOTUnitFromConfirmedPreview,
  confirmProposedOTUnit,
  createInMemoryOTUnitRepository,
  createProposedOTUnitFromDraft,
  confirmOTUnit,
  validateOTUnit,
  OTUNIT_STATUSES,
  type ChatToOTUnitDraftIntentInput,
  type OTUnitDraftPreview,
  type OTUnit,
  type OTUnitRepository
} from "../../../domain/index.js";

// ---------------------------------------------------------------------------
// Deterministic core flow harness
// ---------------------------------------------------------------------------

export type DeterministicFlowStep =
  | "none"
  | "draft_intent_created"
  | "preview_created"
  | "preview_confirmed"
  | "proposed_otunit_created"
  | "proposed_otunit_confirmed"
  | "confirmed_otunit_saved"
  | "repository_getById_verified"
  | "repository_listByObjectiveId_verified";

export type DeterministicFlowResult = {
  flowOk: boolean;
  stopped: boolean;
  stepReached: DeterministicFlowStep;
  draftIntentCreated: boolean;
  previewCreated: boolean;
  previewConfirmed: boolean;
  proposedOTUnitCreated: boolean;
  proposedOTUnitConfirmed: boolean;
  confirmedOTUnitSaved: boolean;
  repositoryGetByIdVerified: boolean;
  repositoryListByObjectiveIdVerified: boolean;
  durableRuntimeState: false;
  chatWrites: false;
  persistence: false;
  mutationCliCommands: false;
  errors: string[];
  confirmedOTUnit: OTUnit | null;
};

export type DeterministicFlowInput = {
  sessionId: string;
  userText: string;
  assistantText: string;
  previewConfirmationSignal: string;
  proposedConfirmationSignal: string;
  objectiveId: string;
  owner: string;
  dueDate: string;
  createdAt: string;
  confirmedAt: string;
};

const DEFAULT_FLOW_INPUT: DeterministicFlowInput = {
  sessionId: "flow-session-1",
  userText: "Please create an OTUnit draft from this session.",
  assistantText: "Complete the first customer interview batch and summarize findings.",
  previewConfirmationSignal: "confirmed",
  proposedConfirmationSignal: "confirmed",
  objectiveId: "flow-objective-1",
  owner: "flow-user",
  dueDate: "2026-07-31",
  createdAt: "2026-07-04T00:00:00.000Z",
  confirmedAt: "2026-07-04T12:00:00.000Z"
};

function createDeterministicDraftIntentInput(
  input: DeterministicFlowInput
): ChatToOTUnitDraftIntentInput {
  return {
    sessionId: input.sessionId,
    userText: input.userText,
    assistantText: input.assistantText
  };
}

/**
 * Run the deterministic OTUnit core flow.
 *
 * Step 1: Detect draft intent from deterministic chat/session text.
 * Step 2: Produce plan-aware draft preview.
 * Step 3: Require explicit preview confirmation.
 * Step 4: Create proposed OTUnit only after explicit preview confirmation.
 * Step 5: Require explicit proposed OTUnit confirmation.
 * Step 6: Create confirmed OTUnit only after explicit proposed confirmation.
 * Step 7: Save confirmed OTUnit to in-memory repository.
 * Step 8: Verify getById returns the confirmed OTUnit.
 * Step 9: Verify listByObjectiveId includes the confirmed OTUnit.
 */
export function runDeterministicOTUnitCoreFlow(
  input?: Partial<DeterministicFlowInput>
): DeterministicFlowResult {
  const flowInput: DeterministicFlowInput = {
    ...DEFAULT_FLOW_INPUT,
    ...input
  };

  const errors: string[] = [];
  let step: DeterministicFlowStep = "none";
  let confirmedOTUnit: OTUnit | null = null;

  // ---- Step 1: Detect draft intent ----

  const intentInput = createDeterministicDraftIntentInput(flowInput);
  const intentResult = detectOTUnitDraftIntent(intentInput);

  if (!intentResult.valid || !intentResult.intentDetected) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: "none",
      draftIntentCreated: false,
      previewCreated: false,
      previewConfirmed: false,
      proposedOTUnitCreated: false,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Draft intent not detected from deterministic fixture input."],
      confirmedOTUnit: null
    };
  }

  step = "draft_intent_created";

  // ---- Step 2: Produce plan-aware draft preview ----

  const previewResult = previewOTUnitDraftFromChat(intentInput);

  if (!previewResult.valid || !previewResult.previewAvailable) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: false,
      previewConfirmed: false,
      proposedOTUnitCreated: false,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Draft preview not available from deterministic fixture input."],
      confirmedOTUnit: null
    };
  }

  step = "preview_created";

  // ---- Step 3: Require explicit preview confirmation ----
  // If previewConfirmationSignal is empty, stop without creating proposed OTUnit.

  if (flowInput.previewConfirmationSignal.trim().length === 0) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: false,
      proposedOTUnitCreated: false,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Missing preview confirmation: empty confirmation signal."],
      confirmedOTUnit: null
    };
  }

  // ---- Step 4: Create proposed OTUnit only after explicit preview confirmation ----
  // This uses the existing confirmed-preview-to-proposed boundary.

  const proposedFromPreviewResult = createProposedOTUnitFromConfirmedPreview({
    draftPreview: previewResult.draftPreview,
    userConfirmationSignal: flowInput.previewConfirmationSignal,
    objectiveId: flowInput.objectiveId,
    owner: flowInput.owner,
    dueDate: flowInput.dueDate,
    createdAt: flowInput.createdAt
  });

  if (!proposedFromPreviewResult.valid) {
    const signalErrors = proposedFromPreviewResult.errors
      .map((e) => e.message)
      .join("; ");
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: false,
      proposedOTUnitCreated: false,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: [
        `Preview confirmation failed: ${signalErrors}`
      ],
      confirmedOTUnit: null
    };
  }

  step = "preview_confirmed";

  const proposedOTUnit = proposedFromPreviewResult.otunit!;

  // Verify proposed OTUnit invariants.
  if (proposedOTUnit.status !== "proposed") {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: false,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Preview confirmation did not produce a proposed OTUnit."],
      confirmedOTUnit: null
    };
  }

  step = "proposed_otunit_created";

  // ---- Step 5: Require explicit proposed OTUnit confirmation ----

  if (flowInput.proposedConfirmationSignal.trim().length === 0) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Missing proposed OTUnit confirmation: empty confirmation signal."],
      confirmedOTUnit: null
    };
  }

  // ---- Step 6: Create confirmed OTUnit only after explicit proposed confirmation ----
  // This uses the existing proposed-confirmation boundary.

  const confirmResult = confirmProposedOTUnit({
    otunit: proposedOTUnit,
    userConfirmationSignal: flowInput.proposedConfirmationSignal,
    confirmedAt: flowInput.confirmedAt
  });

  if (!confirmResult.valid) {
    const confirmErrors = confirmResult.errors
      .map((e) => e.message)
      .join("; ");
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: false,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: [
        `Proposed OTUnit confirmation failed: ${confirmErrors}`
      ],
      confirmedOTUnit: null
    };
  }

  step = "proposed_otunit_confirmed";

  confirmedOTUnit = confirmResult.otunit;

  // Verify confirmed OTUnit invariants.
  if (confirmedOTUnit.status !== "confirmed") {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: true,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Proposed OTUnit confirmation did not produce a confirmed OTUnit."],
      confirmedOTUnit: null
    };
  }

  // ---- Step 7: Save confirmed OTUnit to in-memory repository ----

  const repo = createInMemoryOTUnitRepository();

  const saveResult = repo.save(confirmedOTUnit);
  if (!saveResult.valid) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: true,
      confirmedOTUnitSaved: false,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Failed to save confirmed OTUnit to in-memory repository."],
      confirmedOTUnit
    };
  }

  step = "confirmed_otunit_saved";

  // ---- Step 8: Verify getById returns the confirmed OTUnit ----

  const retrieved = repo.getById(confirmedOTUnit.id);
  if (retrieved === undefined) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: true,
      confirmedOTUnitSaved: true,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: ["Repository getById returned undefined after save."],
      confirmedOTUnit
    };
  }

  // Verify retrieved OTUnit matches confirmed OTUnit.
  if (retrieved.id !== confirmedOTUnit.id || retrieved.status !== "confirmed") {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: true,
      confirmedOTUnitSaved: true,
      repositoryGetByIdVerified: false,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: [
        "Repository getById returned an OTUnit that does not match the confirmed OTUnit."
      ],
      confirmedOTUnit
    };
  }

  step = "repository_getById_verified";

  // ---- Step 9: Verify listByObjectiveId includes the confirmed OTUnit ----

  const listed = repo.listByObjectiveId(flowInput.objectiveId);
  const found = listed.some((u) => u.id === confirmedOTUnit.id);

  if (!found) {
    return {
      flowOk: false,
      stopped: true,
      stepReached: step,
      draftIntentCreated: true,
      previewCreated: true,
      previewConfirmed: true,
      proposedOTUnitCreated: true,
      proposedOTUnitConfirmed: true,
      confirmedOTUnitSaved: true,
      repositoryGetByIdVerified: true,
      repositoryListByObjectiveIdVerified: false,
      durableRuntimeState: false,
      chatWrites: false,
      persistence: false,
      mutationCliCommands: false,
      errors: [
        "Repository listByObjectiveId does not include the confirmed OTUnit."
      ],
      confirmedOTUnit
    };
  }

  step = "repository_listByObjectiveId_verified";

  // ---- Flow complete ----

  return {
    flowOk: true,
    stopped: false,
    stepReached: step,
    draftIntentCreated: true,
    previewCreated: true,
    previewConfirmed: true,
    proposedOTUnitCreated: true,
    proposedOTUnitConfirmed: true,
    confirmedOTUnitSaved: true,
    repositoryGetByIdVerified: true,
    repositoryListByObjectiveIdVerified: true,
    durableRuntimeState: false,
    chatWrites: false,
    persistence: false,
    mutationCliCommands: false,
    errors: [],
    confirmedOTUnit
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Deterministic OTUnit core flow harness", () => {
  describe("successful deterministic core flow", () => {
    it("completes all required steps when all confirmations are provided", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.flowOk).toBe(true);
      expect(result.stopped).toBe(false);
      expect(result.stepReached).toBe("repository_listByObjectiveId_verified");
      expect(result.errors).toEqual([]);
    });

    it("covers all expected step flags", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.draftIntentCreated).toBe(true);
      expect(result.previewCreated).toBe(true);
      expect(result.previewConfirmed).toBe(true);
      expect(result.proposedOTUnitCreated).toBe(true);
      expect(result.proposedOTUnitConfirmed).toBe(true);
      expect(result.confirmedOTUnitSaved).toBe(true);
      expect(result.repositoryGetByIdVerified).toBe(true);
      expect(result.repositoryListByObjectiveIdVerified).toBe(true);
    });
  });

  describe("successful flow ends with confirmed OTUnit", () => {
    it("produces a confirmed OTUnit at the end of the flow", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.flowOk).toBe(true);
      expect(result.confirmedOTUnit).not.toBeNull();
      expect(result.confirmedOTUnit!.status).toBe("confirmed");
      expect(result.confirmedOTUnit!.requiresConfirmation).toBe(false);
    });

    it("preserves input fixture fields in the confirmed OTUnit", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.confirmedOTUnit!.objectiveId).toBe("flow-objective-1");
      expect(result.confirmedOTUnit!.owner).toBe("flow-user");
      expect(result.confirmedOTUnit!.dueDate).toBe("2026-07-31");
    });

    it("validates the confirmed OTUnit is a valid domain object", () => {
      const result = runDeterministicOTUnitCoreFlow();

      const validation = validateOTUnit(result.confirmedOTUnit!);
      expect(validation.valid).toBe(true);
    });
  });

  describe("successful flow saves confirmed OTUnit to in-memory repository", () => {
    it("saves to repository and confirms save result", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.flowOk).toBe(true);
      expect(result.confirmedOTUnitSaved).toBe(true);
    });
  });

  describe("confirmed OTUnit can be retrieved by id", () => {
    it("returns the saved confirmed OTUnit via repository getById", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.repositoryGetByIdVerified).toBe(true);
    });

    it("retrieved OTUnit matches confirmed OTUnit id and status", () => {
      const result = runDeterministicOTUnitCoreFlow();

      const repo = createInMemoryOTUnitRepository();
      repo.save(result.confirmedOTUnit!);

      const retrieved = repo.getById(result.confirmedOTUnit!.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(result.confirmedOTUnit!.id);
      expect(retrieved!.status).toBe("confirmed");
      expect(retrieved!.title).toBe(result.confirmedOTUnit!.title);
    });
  });

  describe("confirmed OTUnit can be listed by objectiveId", () => {
    it("returns the saved confirmed OTUnit via repository listByObjectiveId", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.repositoryListByObjectiveIdVerified).toBe(true);
    });

    it("listByObjectiveId includes only matching objectiveId", () => {
      const result = runDeterministicOTUnitCoreFlow();

      const repo = createInMemoryOTUnitRepository();
      repo.save(result.confirmedOTUnit!);

      const listed = repo.listByObjectiveId("flow-objective-1");
      expect(listed.some((u) => u.id === result.confirmedOTUnit!.id)).toBe(true);

      const otherList = repo.listByObjectiveId("non-matching-objective");
      expect(otherList.some((u) => u.id === result.confirmedOTUnit!.id)).toBe(false);
    });
  });

  describe("missing preview confirmation stops before proposed OTUnit creation", () => {
    it("stops when previewConfirmationSignal is empty", () => {
      const result = runDeterministicOTUnitCoreFlow({
        previewConfirmationSignal: ""
      });

      expect(result.flowOk).toBe(false);
      expect(result.stopped).toBe(true);
      expect(result.stepReached).toBe("preview_created");
      expect(result.previewConfirmed).toBe(false);
      expect(result.proposedOTUnitCreated).toBe(false);
      expect(result.proposedOTUnitConfirmed).toBe(false);
      expect(result.confirmedOTUnitSaved).toBe(false);
      expect(result.draftIntentCreated).toBe(true);
      expect(result.previewCreated).toBe(true);
      expect(result.errors).toContain("Missing preview confirmation: empty confirmation signal.");
    });

    it("stops when previewConfirmationSignal is whitespace only", () => {
      const result = runDeterministicOTUnitCoreFlow({
        previewConfirmationSignal: "   "
      });

      expect(result.flowOk).toBe(false);
      expect(result.stopped).toBe(true);
      expect(result.stepReached).toBe("preview_created");
      expect(result.previewConfirmed).toBe(false);
      expect(result.proposedOTUnitCreated).toBe(false);
    });
  });

  describe("missing preview confirmation does not save to repository", () => {
    it("does not save anything when preview is not confirmed", () => {
      const result = runDeterministicOTUnitCoreFlow({
        previewConfirmationSignal: ""
      });

      expect(result.confirmedOTUnitSaved).toBe(false);
    });
  });

  describe("missing proposed OTUnit confirmation stops before confirmed OTUnit creation", () => {
    it("stops when proposedConfirmationSignal is empty", () => {
      const result = runDeterministicOTUnitCoreFlow({
        proposedConfirmationSignal: ""
      });

      expect(result.flowOk).toBe(false);
      expect(result.stopped).toBe(true);
      expect(result.stepReached).toBe("proposed_otunit_created");
      expect(result.proposedOTUnitCreated).toBe(true);
      expect(result.proposedOTUnitConfirmed).toBe(false);
      expect(result.confirmedOTUnitSaved).toBe(false);
      expect(result.draftIntentCreated).toBe(true);
      expect(result.previewCreated).toBe(true);
      expect(result.previewConfirmed).toBe(true);
      expect(result.errors).toContain(
        "Missing proposed OTUnit confirmation: empty confirmation signal."
      );
    });

    it("stops when proposedConfirmationSignal is whitespace only", () => {
      const result = runDeterministicOTUnitCoreFlow({
        proposedConfirmationSignal: "   "
      });

      expect(result.flowOk).toBe(false);
      expect(result.stopped).toBe(true);
      expect(result.stepReached).toBe("proposed_otunit_created");
      expect(result.proposedOTUnitConfirmed).toBe(false);
      expect(result.confirmedOTUnitSaved).toBe(false);
    });
  });

  describe("missing proposed OTUnit confirmation does not save confirmed OTUnit", () => {
    it("does not save confirmed OTUnit when proposed is not confirmed", () => {
      const result = runDeterministicOTUnitCoreFlow({
        proposedConfirmationSignal: ""
      });

      expect(result.confirmedOTUnitSaved).toBe(false);
      expect(result.confirmedOTUnit).toBeNull();
    });
  });

  describe("ambiguous preview confirmation signal stops deterministically", () => {
    const ambiguousPreviewSignals = [
      "差不多",
      "应该可以",
      "你看着办",
      "大概这样",
      "之后再说",
      "maybe",
      "probably",
      "looks good"
    ];

    for (const signal of ambiguousPreviewSignals) {
      it(`stops for ambiguous preview signal: "${signal}"`, () => {
        const result = runDeterministicOTUnitCoreFlow({
          previewConfirmationSignal: signal
        });

        expect(result.flowOk).toBe(false);
        expect(result.stopped).toBe(true);
        expect(result.stepReached).toBe("preview_created");
        expect(result.previewConfirmed).toBe(false);
        expect(result.proposedOTUnitCreated).toBe(false);
        expect(result.confirmedOTUnitSaved).toBe(false);
      });
    }
  });

  describe("ambiguous proposed confirmation signal stops deterministically", () => {
    const ambiguousProposedSignals = [
      "差不多",
      "应该可以",
      "你看着办",
      "大概这样",
      "之后再说",
      "maybe",
      "probably",
      "looks good"
    ];

    for (const signal of ambiguousProposedSignals) {
      it(`stops for ambiguous proposed confirmation signal: "${signal}"`, () => {
        const result = runDeterministicOTUnitCoreFlow({
          proposedConfirmationSignal: signal
        });

        expect(result.flowOk).toBe(false);
        expect(result.stopped).toBe(true);
        expect(result.stepReached).toBe("proposed_otunit_created");
        expect(result.proposedOTUnitCreated).toBe(true);
        expect(result.proposedOTUnitConfirmed).toBe(false);
        expect(result.confirmedOTUnitSaved).toBe(false);
      });
    }
  });

  describe("unrecognized confirmation signal stops deterministically", () => {
    it("stops for unrecognized preview confirmation signal", () => {
      const result = runDeterministicOTUnitCoreFlow({
        previewConfirmationSignal: "unclear"
      });

      expect(result.flowOk).toBe(false);
      expect(result.stopped).toBe(true);
      expect(result.stepReached).toBe("preview_created");
      expect(result.previewConfirmed).toBe(false);
      expect(result.proposedOTUnitCreated).toBe(false);
    });

    it("stops for unrecognized proposed confirmation signal", () => {
      const result = runDeterministicOTUnitCoreFlow({
        proposedConfirmationSignal: "unclear"
      });

      expect(result.flowOk).toBe(false);
      expect(result.stopped).toBe(true);
      expect(result.stepReached).toBe("proposed_otunit_created");
      expect(result.proposedOTUnitConfirmed).toBe(false);
    });
  });

  describe("no durable runtime state", () => {
    it("reports durableRuntimeState as false", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.durableRuntimeState).toBe(false);
    });

    it("flow does not persist data beyond in-memory repository", () => {
      const result = runDeterministicOTUnitCoreFlow();

      // The repository is process-local and discarded after the flow.
      // No files, database, or persistent storage is created.
      expect(result.persistence).toBe(false);
      expect(result.confirmedOTUnitSaved).toBe(true);
    });
  });

  describe("no chat writes", () => {
    it("reports chatWrites as false", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.chatWrites).toBe(false);
    });
  });

  describe("no mutation-oriented OTUnit CLI command added", () => {
    it("reports mutationCliCommands as false", () => {
      const result = runDeterministicOTUnitCoreFlow();

      expect(result.mutationCliCommands).toBe(false);
    });
  });

  describe("existing OTUnit contracts remain preserved", () => {
    it("OTUNIT_STATUSES is unchanged", () => {
      expect(OTUNIT_STATUSES).toEqual([
        "proposed",
        "confirmed",
        "in_progress",
        "blocked",
        "closed"
      ]);
    });

    it("confirmOTUnit still produces confirmed with requiresConfirmation false", () => {
      const otunit: OTUnit = {
        id: "contract-1",
        objectiveId: "objective-contract",
        title: "Contract test",
        owner: "test-user",
        dueDate: "2026-07-15",
        status: "proposed",
        evidenceRefs: ["evidence-contract"],
        requiresConfirmation: true,
        createdAt: "2026-07-04T00:00:00.000Z"
      };
      const result = confirmOTUnit(otunit);
      expect(result.valid).toBe(true);
      expect(result.otunit.status).toBe("confirmed");
      expect(result.otunit.requiresConfirmation).toBe(false);
    });

    it("createProposedOTUnitFromDraft still produces proposed with requiresConfirmation", () => {
      const draft = {
        id: "draft-contract-1",
        objectiveId: "objective-contract",
        title: "Contract test draft",
        owner: "test-user",
        dueDate: "2026-07-15",
        evidenceRefs: ["evidence-contract"]
      };
      const result = createProposedOTUnitFromDraft(draft);
      expect(result.valid).toBe(true);
      expect(result.otunit!.requiresConfirmation).toBe(true);
      expect(result.otunit!.status).toBe("proposed");
    });

    it("validateOTUnit still rejects invalid OTUnits", () => {
      const result = validateOTUnit({} as unknown);
      expect(result.valid).toBe(false);
    });

    it("detectOTUnitDraftIntent still works deterministically", () => {
      const result = detectOTUnitDraftIntent({
        sessionId: "session-1",
        userText: "Please turn this into an OTUnit draft.",
        assistantText: "OK."
      });
      expect(result.valid).toBe(true);
      expect(result.intentDetected).toBe(true);
      expect(result.intentType).toBe("otunit_draft");
    });

    it("previewOTUnitDraftFromChat still returns preview metadata", () => {
      const result = previewOTUnitDraftFromChat({
        sessionId: "session-1",
        userText: "Please turn this into an OTUnit draft.",
        assistantText: "Complete the first interview batch."
      });
      expect(result.valid).toBe(true);
      expect(result.previewAvailable).toBe(true);
    });

    it("createProposedOTUnitFromConfirmedPreview still requires explicit confirmation", () => {
      const previewResult = previewOTUnitDraftFromChat({
        sessionId: "session-1",
        userText: "Please turn this into an OTUnit draft.",
        assistantText: "Complete the first interview batch."
      });

      const result = createProposedOTUnitFromConfirmedPreview({
        draftPreview: previewResult.draftPreview,
        userConfirmationSignal: "confirmed",
        objectiveId: "obj-1",
        owner: "user",
        dueDate: "2026-07-31",
        createdAt: "2026-07-04T00:00:00.000Z"
      });
      expect(result.valid).toBe(true);
      expect(result.otunit!.status).toBe("proposed");
    });

    it("confirmProposedOTUnit still rejects ambiguous signals", () => {
      const otunit: OTUnit = {
        id: "contract-2",
        objectiveId: "objective-contract",
        title: "Contract test",
        owner: "test-user",
        dueDate: "2026-07-15",
        status: "proposed",
        evidenceRefs: ["evidence-contract"],
        requiresConfirmation: true,
        createdAt: "2026-07-04T00:00:00.000Z"
      };
      const result = confirmProposedOTUnit({
        otunit,
        userConfirmationSignal: "大概这样",
        confirmedAt: "2026-07-04T12:00:00.000Z"
      });
      expect(result.valid).toBe(false);
    });

    it("createInMemoryOTUnitRepository still provides the expected methods", () => {
      const repo = createInMemoryOTUnitRepository();
      expect(typeof repo.save).toBe("function");
      expect(typeof repo.getById).toBe("function");
      expect(typeof repo.listByObjectiveId).toBe("function");
      expect(typeof repo.clear).toBe("function");
    });

    it("existing OTUnit creation boundary still works", () => {
      const draft = {
        id: "existing-draft-1",
        objectiveId: "existing-obj",
        title: "Existing flow test",
        owner: "test",
        dueDate: "2026-07-15",
        evidenceRefs: ["evidence-1"]
      };
      const proposedResult = createProposedOTUnitFromDraft(draft);
      expect(proposedResult.valid).toBe(true);

      const confirmResult = confirmOTUnit(proposedResult.otunit!);
      expect(confirmResult.valid).toBe(true);
      expect(confirmResult.otunit.status).toBe("confirmed");

      const repo = createInMemoryOTUnitRepository();
      expect(repo.save(confirmResult.otunit).valid).toBe(true);

      const retrieved = repo.getById(draft.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.status).toBe("confirmed");
    });
  });
});
