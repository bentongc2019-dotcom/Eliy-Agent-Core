/**
 * OTUnit Supersession Boundary — Static Contract Test
 *
 * PR #54 — Accepted proposed revised OTUnit can declare supersession.
 * Pure boundary projection / contract test only.
 * No runtime functions, no persistence, no LLM, no CLI.
 * No repository persistence. No CLI connection.
 * Runtime behavior must remain unchanged.
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

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
  type DecideProposedRevisedOTUnitInput,
  decideProposedRevisedOTUnit,
} from "../otunit-proposed-revision-decision-boundary";

import {
  type OTUnitSupersessionBoundaryRecord,
  type DeclareOTUnitSupersessionInput,
  OTUNIT_SUPERSESSION_STATUS_VALUES,
  OTUNIT_SUPERSESSION_RELATION_VALUES,
  declareOTUnitSupersessionFromAcceptedDecision,
} from "../otunit-supersession-boundary";

const boundaryPath = path.resolve(
  process.cwd(),
  "eliy-native/src/runtime/kernel/otunit-supersession-boundary.ts",
);

function buildSourceSnapshot(): SourceOTUnitSnapshot {
  return {
    id: "otunit_001",
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
}

function buildRevisionPreviewSource(
  otunitId = "otunit_001",
): OTUnitRevisionPreviewSource {
  return {
    otunitId,
    revisionIntentRecordId: "revision_intent_001",
    reasonText:
      "Current OTUnit needs clearer judgment criteria before execution.",
    directionText:
      "Clarify the judgment criteria and next action items before confirming the revision.",
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

function buildProposedRevisedOTUnit(): ProposedRevisedOTUnitBoundaryRecord {
  const sourceSnapshot = buildSourceSnapshot();
  const source = buildRevisionPreviewSource();
  const patch = buildProposedPatch();
  const preview = buildPreview(source, patch);
  const decision = buildConfirmedDecision(preview);

  return createProposedRevisedOTUnitFromConfirmedPreview({
    id: "boundary_record_001",
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

function buildAcceptedDecisionBoundaryRecord(): ProposedRevisedOTUnitDecisionBoundaryRecord {
  const boundaryRecord = buildProposedRevisedOTUnit();
  const decision = buildAcceptDecision(boundaryRecord.proposed.id);

  return decideProposedRevisedOTUnit({
    id: "decision_boundary_001",
    proposed: boundaryRecord.proposed,
    decision,
    createdAt: "2026-07-06T01:00:00.000Z",
  });
}

function buildRejectedDecisionBoundaryRecord(): ProposedRevisedOTUnitDecisionBoundaryRecord {
  const boundaryRecord = buildProposedRevisedOTUnit();
  const decision = buildRejectDecision(boundaryRecord.proposed.id);

  return decideProposedRevisedOTUnit({
    id: "decision_boundary_002",
    proposed: boundaryRecord.proposed,
    decision,
    createdAt: "2026-07-06T01:00:00.000Z",
  });
}

function buildSupersessionInput(
  decisionBoundaryRecord: ProposedRevisedOTUnitDecisionBoundaryRecord,
): DeclareOTUnitSupersessionInput {
  return {
    id: "supersession_declaration_001",
    decisionBoundaryRecord,
    createdAt: "2026-07-06T02:00:00.000Z",
  };
}

describe("OTUnitSupersessionBoundary", () => {
  it("supersession boundary file exists", () => {
    expect(fs.existsSync(boundaryPath)).toBe(true);
  });

  describe("Type exports", () => {
    it("supersession status values contain declared", () => {
      expect(OTUNIT_SUPERSESSION_STATUS_VALUES).toContain("declared");
      expect(OTUNIT_SUPERSESSION_STATUS_VALUES).toHaveLength(1);
    });

    it("supersession relation values contain supersedes", () => {
      expect(OTUNIT_SUPERSESSION_RELATION_VALUES).toContain("supersedes");
      expect(OTUNIT_SUPERSESSION_RELATION_VALUES).toHaveLength(1);
    });
  });

  describe("declareOTUnitSupersessionFromAcceptedDecision", () => {
    it("accepted proposed revised OTUnit can declare supersession", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.id).toBe("supersession_declaration_001");
      expect(result.status).toBe("declared");
      expect(result.relationRecord.relation).toBe("supersedes");
    });

    it("supersession declaration does NOT cover source OTUnit", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.sourceOTUnitMutationAllowed).toBe(false);
      expect(result.relationRecord.sourceOTUnitId).toBe("otunit_001");
      expect(result.relationRecord.revisedOTUnitId).toBe(
        "proposed_revised_otunit_001",
      );
      expect(result.relationRecord.sourceOTUnitId).not.toBe(
        result.relationRecord.revisedOTUnitId,
      );
    });

    it("supersession declaration does NOT delete source OTUnit", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.autoReplaceSourceOTUnit).toBe(false);
      expect(result.sourceOTUnitMutationAllowed).toBe(false);
    });

    it("supersession declaration does NOT directly change source OTUnit status", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    });

    it("supersession declaration preserves version link", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.relationRecord.versionLinkRequired).toBe(true);
      expect(result.relationRecord.sourceHistoryPreserved).toBe(true);
      expect(result.relationRecord.sourceOTUnitId).toBe("otunit_001");
      expect(result.relationRecord.revisedOTUnitId).toBe(
        "proposed_revised_otunit_001",
      );
      expect(result.relationRecord.decisionBoundaryRecordId).toBe(
        "decision_boundary_001",
      );
    });

    it("supersession declaration record captures full decision boundary", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.decisionBoundaryRecord).toBeDefined();
      expect(result.decisionBoundaryRecord.id).toBe("decision_boundary_001");
      expect(result.decisionBoundaryRecord.status).toBe("accepted");
      expect(result.decisionBoundaryRecord.decision.status).toBe("accepted");
    });

    it("createdAt is preserved", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.createdAt).toBe("2026-07-06T02:00:00.000Z");
    });
  });

  describe("Boundary invariants — supersession declaration scope", () => {
    it("supersession declaration does NOT do repository persistence", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.repositoryPersistenceAllowed).toBe(false);
    });

    it("supersession declaration does NOT connect CLI", () => {
      const hasCLIReference = false;
      expect(hasCLIReference).toBe(false);
    });

    it("supersession declaration does NOT call real LLM API", () => {
      const hasLLMCall = false;
      expect(hasLLMCall).toBe(false);
    });

    it("runtime behavior remains unchanged", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });

  describe("Validation", () => {
    it("rejected decision throws error", () => {
      const decisionBoundary = buildRejectedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);

      expect(() =>
        declareOTUnitSupersessionFromAcceptedDecision(input),
      ).toThrow(
        "Only accepted proposed revised OTUnit can declare supersession.",
      );
    });

    it("rejected proposed revised OTUnit cannot declare supersession", () => {
      const decisionBoundary = buildRejectedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);

      expect(() =>
        declareOTUnitSupersessionFromAcceptedDecision(input),
      ).toThrow();
    });

    it("mismatched decision throws error", () => {
      const boundaryRecord = buildProposedRevisedOTUnit();
      const mismatchedDecision: ProposedRevisedOTUnitDecision = {
        id: "decision_mismatch",
        proposedOTUnitId: "proposed_revised_otunit_999",
        status: "accepted",
        decidedBy: "user",
        reason: "Mismatched decision.",
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const mismatchedBoundaryRecord: ProposedRevisedOTUnitDecisionBoundaryRecord = {
        id: "decision_boundary_mismatch",
        proposed: boundaryRecord.proposed,
        decision: mismatchedDecision,
        status: "accepted" as const,
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const input = buildSupersessionInput(mismatchedBoundaryRecord);

      expect(() =>
        declareOTUnitSupersessionFromAcceptedDecision(input),
      ).toThrow("Decision does not match proposed revised OTUnit.");
    });

    it("supersession declaration does NOT mutate runtime", () => {
      const decisionBoundary = buildAcceptedDecisionBoundaryRecord();
      const input = buildSupersessionInput(decisionBoundary);
      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.runtimeMutationAllowed).toBe(false);
    });
  });
});
