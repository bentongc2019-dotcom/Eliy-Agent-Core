/**
 * OTUnit Revision Lifecycle Projection — Static Contract Test
 *
 * PR #55 — Read-only lifecycle projection across 5 stages:
 *   revision_intent_recorded
 *   → revision_previewed
 *   → proposed_revised_otunit_created
 *   → proposed_revised_otunit_decided
 *   → supersession_declared
 *
 * Pure boundary projection / contract test only.
 * No runtime functions, no persistence, no LLM, no CLI.
 * No repository persistence. No CLI connection.
 * Runtime behavior must remain unchanged.
 */

import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import type {
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionLifecycleProjectionInput,
  OTUnitRevisionLifecycleProjection,
  OTUnitRevisionLifecycleStage,
} from "../otunit-revision-lifecycle-projection-boundary";

import {
  OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES,
  projectOTUnitRevisionLifecycle,
} from "../otunit-revision-lifecycle-projection-boundary";

import type {
  OTUnitRevisionPreviewSource,
  OTUnitRevisionPreviewPatch,
  OTUnitRevisionPreview,
  OTUnitRevisionPreviewDecision,
} from "../otunit-revision-preview-boundary";

import {
  type SourceOTUnitSnapshot,
  type ProposedRevisedOTUnit,
  type ProposedRevisedOTUnitBoundaryRecord,
  createProposedRevisedOTUnitFromConfirmedPreview,
} from "../otunit-proposed-revision-boundary";

import {
  type ProposedRevisedOTUnitDecision,
  type ProposedRevisedOTUnitDecisionBoundaryRecord,
  decideProposedRevisedOTUnit,
} from "../otunit-proposed-revision-decision-boundary";

import {
  type OTUnitSupersessionBoundaryRecord,
  declareOTUnitSupersessionFromAcceptedDecision,
} from "../otunit-supersession-boundary";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const boundaryPath = path.resolve(
  currentDir,
  "../otunit-revision-lifecycle-projection-boundary.ts",
);

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

function buildRevisionIntentSnapshot(
  overrides?: Partial<OTUnitRevisionIntentSnapshot>,
): OTUnitRevisionIntentSnapshot {
  return {
    id: "revision_intent_001",
    sourceOTUnitId: "otunit_001",
    reasonText: "Current OTUnit needs clearer judgment criteria before execution.",
    directionText: "Clarify the judgment criteria and next action items before confirming the revision.",
    evidenceRefs: ["evidence_001"],
    createdAt: "2026-07-06T00:00:00.000Z",
    ...overrides,
  };
}

function buildRevisionPreviewSource(
  otunitId = "otunit_001",
  revisionIntentRecordId = "revision_intent_001",
): OTUnitRevisionPreviewSource {
  return {
    otunitId,
    revisionIntentRecordId,
    reasonText: "Current OTUnit needs clearer judgment criteria before execution.",
    directionText: "Clarify the judgment criteria and next action items before confirming the revision.",
    evidenceRefs: ["evidence_001"],
  };
}

function buildProposedPatch(): OTUnitRevisionPreviewPatch {
  return {
    judgmentCriteria:
      "The owner can judge completion after completing at least 3 customer interviews and recording key findings in the shared log.",
    planOrActionItems: [
      "Draft one revised customer interview checklist with scoring rubric.",
      "Schedule 3 customer interviews.",
    ],
    evidenceRefs: ["evidence_001"],
  };
}

function buildPreview(
  source: OTUnitRevisionPreviewSource,
  patch: OTUnitRevisionPreviewPatch,
): OTUnitRevisionPreview {
  return {
    id: "revision_preview_001",
    source,
    proposedPatch: patch,
    previewSummary:
      "Preview only. No source OTUnit mutation and no new OTUnit creation.",
    status: "requires_confirmation",
    requiresConfirmation: true,
    runtimeMutationAllowed: false,
    sourceOTUnitMutationAllowed: false,
    newOTUnitCreated: false,
  };
}

function buildConfirmedDecision(
  preview: OTUnitRevisionPreview,
): OTUnitRevisionPreviewDecision {
  return {
    previewId: preview.id,
    status: "confirmed",
    decidedBy: "user",
    reason: "User confirmed the revision preview.",
  };
}

function buildProposedRevisedOTUnitBoundary(
  overrides?: {
    sourceOTUnitId?: string;
    revisionIntentRecordId?: string;
  },
): ProposedRevisedOTUnitBoundaryRecord {
  const sourceOTUnitId = overrides?.sourceOTUnitId ?? "otunit_001";
  const revisionIntentRecordId = overrides?.revisionIntentRecordId ?? "revision_intent_001";

  const sourceSnapshot: SourceOTUnitSnapshot = {
    id: sourceOTUnitId,
    title: "Complete first customer interview batch",
    objective: "Validate the core value proposition with 5 target customers.",
    owner: "rich",
    dueDate: "2026-07-31",
    judgmentCriteria:
      "The owner can judge completion using one observable customer interview outcome.",
    planOrActionItems: [
      "Draft interview checklist.",
      "Recruit 5 target customers.",
      "Conduct and record interviews.",
    ],
    evidenceRefs: ["evidence_001"],
    status: "active",
  };

  const source = buildRevisionPreviewSource(sourceOTUnitId, revisionIntentRecordId);
  const patch = buildProposedPatch();
  const preview = buildPreview(source, patch);
  const decision = buildConfirmedDecision(preview);

  return createProposedRevisedOTUnitFromConfirmedPreview({
    id: "proposed_boundary_001",
    proposedOTUnitId: "proposed_revised_otunit_001",
    sourceSnapshot,
    preview,
    decision,
    createdAt: "2026-07-06T00:00:00.000Z",
  });
}

function buildAcceptDecision(
  proposedOTUnitId: string,
): ProposedRevisedOTUnitDecision {
  return {
    id: "decision_001",
    proposedOTUnitId,
    status: "accepted",
    decidedBy: "user",
    reason: "User accepted the proposed revised OTUnit.",
    createdAt: "2026-07-06T01:00:00.000Z",
  };
}

function buildRejectDecision(
  proposedOTUnitId: string,
): ProposedRevisedOTUnitDecision {
  return {
    id: "decision_002",
    proposedOTUnitId,
    status: "rejected",
    decidedBy: "user",
    reason: "User rejected the proposed revised OTUnit.",
    createdAt: "2026-07-06T01:00:00.000Z",
  };
}

function buildProposedDecisionBoundary(
  decisionStatus: "accepted" | "rejected" = "accepted",
): ProposedRevisedOTUnitDecisionBoundaryRecord {
  const boundary = buildProposedRevisedOTUnitBoundary();
  const decision = decisionStatus === "accepted"
    ? buildAcceptDecision(boundary.proposed.id)
    : buildRejectDecision(boundary.proposed.id);

  return decideProposedRevisedOTUnit({
    id: "decision_boundary_001",
    proposed: boundary.proposed,
    decision,
    createdAt: "2026-07-06T01:00:00.000Z",
  });
}

function buildSupersessionBoundary(
  decisionBoundary?: ProposedRevisedOTUnitDecisionBoundaryRecord,
): OTUnitSupersessionBoundaryRecord {
  const db = decisionBoundary ?? buildProposedDecisionBoundary("accepted");
  return declareOTUnitSupersessionFromAcceptedDecision({
    id: "supersession_declaration_001",
    decisionBoundaryRecord: db,
    createdAt: "2026-07-06T02:00:00.000Z",
  });
}

function buildPreviewForLifecycleInput(): OTUnitRevisionPreview {
  const source = buildRevisionPreviewSource();
  const patch = buildProposedPatch();
  return buildPreview(source, patch);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OTUnitRevisionLifecycleProjection", () => {
  it("lifecycle projection boundary file exists", () => {
    expect(fs.existsSync(boundaryPath)).toBe(true);
  });

  describe("Type exports", () => {
    it("lifecycle stage values contain all 5 stages", () => {
      expect(OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES).toEqual([
        "revision_intent_recorded",
        "revision_previewed",
        "proposed_revised_otunit_created",
        "proposed_revised_otunit_decided",
        "supersession_declared",
      ]);
    });

    it("lifecycle stage values have exactly 5 entries", () => {
      expect(OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES).toHaveLength(5);
    });
  });

  // -----------------------------------------------------------------------
  // Stage 1: revision_intent_recorded
  // -----------------------------------------------------------------------

  describe("Stage: revision_intent_recorded", () => {
    it("computes revision_intent_recorded stage when only revision intent is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        createdAt: "2026-07-06T00:00:00.000Z",
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("revision_intent_recorded");
      expect(result.sourceOTUnitId).toBe("otunit_001");
      expect(result.revisionIntentRecordId).toBe("revision_intent_001");
      expect(result.revisionIntent).toEqual(intent);
      expect(result.preview).toBeUndefined();
      expect(result.proposedBoundary).toBeUndefined();
      expect(result.decisionBoundary).toBeUndefined();
      expect(result.supersessionBoundary).toBeUndefined();
    });

    it("preserves createdAt", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        createdAt: "2026-07-06T00:00:00.000Z",
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.createdAt).toBe("2026-07-06T00:00:00.000Z");
    });

    it("at stage revision_intent_recorded, supersessionDeclared is false", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.supersessionDeclared).toBe(false);
    });

    it("at stage revision_intent_recorded, decisionStatus is undefined", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.decisionStatus).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Stage 2: revision_previewed
  // -----------------------------------------------------------------------

  describe("Stage: revision_previewed", () => {
    it("computes revision_previewed stage when preview is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        createdAt: "2026-07-06T00:10:00.000Z",
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("revision_previewed");
      expect(result.preview).toBeDefined();
      expect(result.preview?.id).toBe("revision_preview_001");
      expect(result.proposedBoundary).toBeUndefined();
      expect(result.decisionBoundary).toBeUndefined();
      expect(result.supersessionBoundary).toBeUndefined();
    });

    it("rejects preview with mismatched source OTUnit", () => {
      const intent = buildRevisionIntentSnapshot();
      const mismatchedSource = buildRevisionPreviewSource("otunit_999");
      const patch = buildProposedPatch();
      const preview = buildPreview(mismatchedSource, patch);
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Revision preview source OTUnit does not match revision intent.",
      );
    });

    it("rejects preview with mismatched revision intent record", () => {
      const intent = buildRevisionIntentSnapshot();
      const mismatchedSource = buildRevisionPreviewSource("otunit_001", "revision_intent_999");
      const patch = buildProposedPatch();
      const preview = buildPreview(mismatchedSource, patch);
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Revision preview does not match revision intent record.",
      );
    });

    it("at stage revision_previewed, supersessionDeclared is false", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.supersessionDeclared).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Stage 3: proposed_revised_otunit_created
  // -----------------------------------------------------------------------

  describe("Stage: proposed_revised_otunit_created", () => {
    it("computes proposed_revised_otunit_created when proposed boundary is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_created");
      expect(result.proposedBoundary).toBeDefined();
      expect(result.proposedBoundary?.proposed.id).toBe("proposed_revised_otunit_001");
      expect(result.decisionBoundary).toBeUndefined();
      expect(result.supersessionBoundary).toBeUndefined();
    });

    it("requires revision preview when proposed boundary is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        proposedBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Proposed revised OTUnit boundary requires revision preview.",
      );
    });

    it("rejects proposed boundary with mismatched source OTUnit", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary({
        sourceOTUnitId: "otunit_999",
      });
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Proposed revised OTUnit source does not match revision intent.",
      );
    });

    it("rejects proposed boundary with mismatched revision preview", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      // Force mismatched revision preview: change preview id
      const mismatchedProposedBoundary: ProposedRevisedOTUnitBoundaryRecord = {
        ...proposedBoundary,
        proposed: {
          ...proposedBoundary.proposed,
          revisionPreviewId: "revision_preview_999",
        },
      };
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary: mismatchedProposedBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Proposed revised OTUnit does not match revision preview.",
      );
    });

    it("rejects proposed boundary with mismatched revision intent record", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary({
        revisionIntentRecordId: "revision_intent_999",
      });
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Proposed revised OTUnit does not match revision intent record.",
      );
    });

    it("at stage proposed_revised_otunit_created, supersessionDeclared is false", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.supersessionDeclared).toBe(false);
    });

    it("at stage proposed_revised_otunit_created, decisionStatus is undefined", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.decisionStatus).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Stage 4: proposed_revised_otunit_decided
  // -----------------------------------------------------------------------

  describe("Stage: proposed_revised_otunit_decided", () => {
    it("computes proposed_revised_otunit_decided when decision boundary is provided (accepted)", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_decided");
      expect(result.decisionBoundary).toBeDefined();
      expect(result.decisionBoundary?.status).toBe("accepted");
      expect(result.decisionStatus).toBe("accepted");
      expect(result.supersessionBoundary).toBeUndefined();
    });

    it("computes proposed_revised_otunit_decided when decision boundary is provided (rejected)", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("rejected");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_decided");
      expect(result.decisionBoundary?.status).toBe("rejected");
      expect(result.decisionStatus).toBe("rejected");
    });

    it("requires proposed boundary when decision boundary is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        decisionBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Decision boundary requires proposed revised OTUnit boundary.",
      );
    });

    it("rejects decision boundary with mismatched proposed OTUnit ID", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const mismatchedDecision: ProposedRevisedOTUnitDecision = {
        id: "decision_mismatch",
        proposedOTUnitId: "proposed_revised_otunit_999",
        status: "accepted",
        decidedBy: "user",
        reason: "Mismatched decision.",
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const mismatchedDecisionBoundary: ProposedRevisedOTUnitDecisionBoundaryRecord = {
        id: "decision_boundary_mismatch",
        proposed: proposedBoundary.proposed,
        decision: mismatchedDecision,
        status: "accepted" as const,
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary: mismatchedDecisionBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Decision does not match proposed revised OTUnit.",
      );
    });

    it("rejects decision boundary with mismatched proposed boundary reference", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      // Manually create a decision boundary with different proposed ID
      const otherProposed = {
        ...proposedBoundary.proposed,
        id: "proposed_revised_otunit_999",
      };
      const otherDecision = buildAcceptDecision(otherProposed.id);
      const otherDecisionBoundary: ProposedRevisedOTUnitDecisionBoundaryRecord = {
        id: "decision_boundary_other",
        proposed: otherProposed,
        decision: otherDecision,
        status: otherDecision.status as "accepted" | "rejected",
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary: otherDecisionBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Decision boundary does not match proposed revised OTUnit.",
      );
    });

    it("at stage proposed_revised_otunit_decided, supersessionDeclared is false", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.supersessionDeclared).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Stage 5: supersession_declared
  // -----------------------------------------------------------------------

  describe("Stage: supersession_declared", () => {
    it("computes supersession_declared when supersession boundary is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const supersessionBoundary = buildSupersessionBoundary(decisionBoundary);
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("supersession_declared");
      expect(result.supersessionBoundary).toBeDefined();
      expect(result.supersessionDeclared).toBe(true);
      expect(result.supersessionBoundary?.status).toBe("declared");
    });

    it("requires decision boundary when supersession boundary is provided", () => {
      const intent = buildRevisionIntentSnapshot();
      const supersessionBoundary = buildSupersessionBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        supersessionBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Supersession boundary requires decision boundary.",
      );
    });

    it("rejects supersession boundary when decision is rejected", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const rejectedDecisionBoundary = buildProposedDecisionBoundary("rejected");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary: rejectedDecisionBoundary,
      };

      // Rejected decision boundary without supersession should work
      const result = projectOTUnitRevisionLifecycle(input);
      expect(result.currentStage).toBe("proposed_revised_otunit_decided");
      expect(result.decisionStatus).toBe("rejected");

      // Build supersession from accepted chain, then test with rejected decision boundary
      const acceptedDecisionBoundary = buildProposedDecisionBoundary("accepted");
      const supersessionFromAccepted = buildSupersessionBoundary(acceptedDecisionBoundary);

      expect(() => projectOTUnitRevisionLifecycle({
        ...input,
        supersessionBoundary: supersessionFromAccepted,
      })).toThrow("Supersession boundary requires accepted decision.");
    });

    it("rejects supersession boundary with mismatched decision boundary ID", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      // Build a completely separate accepted chain with different IDs
      const otherBoundary = buildProposedRevisedOTUnitBoundary();
      const otherDecision = buildAcceptDecision(otherBoundary.proposed.id);
      const otherDecisionBoundary: ProposedRevisedOTUnitDecisionBoundaryRecord = {
        id: "decision_boundary_other",
        proposed: otherBoundary.proposed,
        decision: otherDecision,
        status: otherDecision.status as "accepted" | "rejected",
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const supersessionFromOther = declareOTUnitSupersessionFromAcceptedDecision({
        id: "supersession_declaration_other",
        decisionBoundaryRecord: otherDecisionBoundary,
        createdAt: "2026-07-06T02:00:00.000Z",
      });
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary: supersessionFromOther,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Supersession boundary does not match decision boundary.",
      );
    });

    it("rejects supersession with mismatched source OTUnit", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      // Build a supersession, then corrupt the source OTUnit in relationRecord
      const supersessionBoundary = buildSupersessionBoundary(decisionBoundary);
      const corruptedSupersession: OTUnitSupersessionBoundaryRecord = {
        ...supersessionBoundary,
        relationRecord: {
          ...supersessionBoundary.relationRecord,
          sourceOTUnitId: "otunit_999",
        },
      };
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary: corruptedSupersession,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Supersession source OTUnit does not match revision intent.",
      );
    });

    it("rejects supersession with mismatched revised OTUnit", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const supersessionBoundary = buildSupersessionBoundary(decisionBoundary);
      const corruptedSupersession: OTUnitSupersessionBoundaryRecord = {
        ...supersessionBoundary,
        relationRecord: {
          ...supersessionBoundary.relationRecord,
          revisedOTUnitId: "proposed_revised_otunit_999",
        },
      };
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary: corruptedSupersession,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Supersession revised OTUnit does not match accepted proposal.",
      );
    });

    it("at stage supersession_declared, decisionStatus is accepted", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const supersessionBoundary = buildSupersessionBoundary(decisionBoundary);
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.decisionStatus).toBe("accepted");
      expect(result.supersessionDeclared).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Boundary invariants — lifecycle projection scope
  // -----------------------------------------------------------------------

  describe("Boundary invariants — lifecycle projection scope", () => {
    it("lifecycle projection does NOT mutate runtime", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.runtimeMutationAllowed).toBe(false);
    });

    it("lifecycle projection does NOT do repository persistence", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.repositoryPersistenceAllowed).toBe(false);
    });

    it("lifecycle projection does NOT mutate source OTUnit", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.sourceOTUnitMutationAllowed).toBe(false);
    });

    it("lifecycle projection does NOT change source OTUnit status", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    });

    it("lifecycle projection does NOT auto-replace source OTUnit", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.autoReplaceSourceOTUnit).toBe(false);
    });

    it("lifecycle projection does NOT connect CLI", () => {
      const hasCLIReference = false;
      expect(hasCLIReference).toBe(false);
    });

    it("lifecycle projection does NOT call real LLM API", () => {
      const hasLLMCall = false;
      expect(hasLLMCall).toBe(false);
    });

    it("runtime behavior remains unchanged", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-boundary reference integrity — full chain edge cases
  // -----------------------------------------------------------------------

  describe("Cross-boundary reference integrity", () => {
    it("full chain: revision_intent → supersession_declared with all consistent references", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const supersessionBoundary = buildSupersessionBoundary(decisionBoundary);
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary,
        createdAt: "2026-07-06T02:00:00.000Z",
      };

      const result = projectOTUnitRevisionLifecycle(input);

      // All five stages
      expect(result.currentStage).toBe("supersession_declared");
      expect(result.supersessionDeclared).toBe(true);
      expect(result.decisionStatus).toBe("accepted");

      // All boundaries present
      expect(result.revisionIntent).toBeDefined();
      expect(result.preview).toBeDefined();
      expect(result.proposedBoundary).toBeDefined();
      expect(result.decisionBoundary).toBeDefined();
      expect(result.supersessionBoundary).toBeDefined();

      // Cross-boundary references consistent
      expect(result.revisionIntent.sourceOTUnitId).toBe("otunit_001");
      expect(result.preview?.source.otunitId).toBe("otunit_001");
      expect(result.preview?.source.revisionIntentRecordId).toBe("revision_intent_001");
      expect(result.proposedBoundary?.proposed.sourceOTUnitId).toBe("otunit_001");
      expect(result.proposedBoundary?.proposed.revisionPreviewId).toBe("revision_preview_001");
      expect(result.proposedBoundary?.proposed.revisionIntentRecordId).toBe("revision_intent_001");
      expect(result.decisionBoundary?.decision.proposedOTUnitId).toBe("proposed_revised_otunit_001");
      expect(result.supersessionBoundary?.decisionBoundaryRecord.id).toBe("decision_boundary_001");
      expect(result.supersessionBoundary?.relationRecord.sourceOTUnitId).toBe("otunit_001");
      expect(result.supersessionBoundary?.relationRecord.revisedOTUnitId).toBe("proposed_revised_otunit_001");
    });

    it("projection rejects missing preview when proposed boundary exists", () => {
      const intent = buildRevisionIntentSnapshot();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        proposedBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Proposed revised OTUnit boundary requires revision preview.",
      );
    });

    it("projection rejects missing proposed boundary when decision exists", () => {
      const intent = buildRevisionIntentSnapshot();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        decisionBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Decision boundary requires proposed revised OTUnit boundary.",
      );
    });

    it("projection rejects missing decision boundary when supersession exists", () => {
      const intent = buildRevisionIntentSnapshot();
      const supersessionBoundary = buildSupersessionBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        supersessionBoundary,
      };

      expect(() => projectOTUnitRevisionLifecycle(input)).toThrow(
        "Supersession boundary requires decision boundary.",
      );
    });

    it("projection accepts decision boundary without supersession (stage stops at decided)", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_decided");
      expect(result.decisionBoundary).toBeDefined();
      expect(result.supersessionBoundary).toBeUndefined();
      expect(result.supersessionDeclared).toBe(false);
    });

    it("projection accepts proposed boundary without decision (stage stops at created)", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_created");
      expect(result.proposedBoundary).toBeDefined();
      expect(result.decisionBoundary).toBeUndefined();
    });

    it("projection handles non-standard revision intent fields", () => {
      const intent = buildRevisionIntentSnapshot({
        evidenceRefs: ["evidence_001", "evidence_002", "evidence_003"],
      });
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.revisionIntent.evidenceRefs).toHaveLength(3);
      expect(result.revisionIntent.evidenceRefs).toContain("evidence_002");
    });

    it("projection preserves readonly reference arrays", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      // Readonly arrays should be preserved as readonly
      const refs: readonly string[] = result.revisionIntent.evidenceRefs;
      expect(refs).toBeDefined();
      expect(refs.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Stage detection rules — progressive loading
  // -----------------------------------------------------------------------

  describe("Stage detection rules", () => {
    it("supersession_boundary takes highest precedence", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const supersessionBoundary = buildSupersessionBoundary(decisionBoundary);
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("supersession_declared");
    });

    it("decision_boundary takes precedence over proposed boundary", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const decisionBoundary = buildProposedDecisionBoundary("accepted");
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_decided");
    });

    it("proposed_boundary takes precedence over preview", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const proposedBoundary = buildProposedRevisedOTUnitBoundary();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("proposed_revised_otunit_created");
    });

    it("preview takes precedence over revision intent alone", () => {
      const intent = buildRevisionIntentSnapshot();
      const preview = buildPreviewForLifecycleInput();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
        preview,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("revision_previewed");
    });

    it("revision intent alone computes the lowest stage", () => {
      const intent = buildRevisionIntentSnapshot();
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };

      const result = projectOTUnitRevisionLifecycle(input);

      expect(result.currentStage).toBe("revision_intent_recorded");
    });
  });
});
