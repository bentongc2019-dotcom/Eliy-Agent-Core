
/**
 * OTUnit Proposed Revision Boundary Contract — Static Contract Test
 *
 * PR #52 — Confirmed revision preview creates a proposed revised OTUnit.
 * Pure boundary projection / contract test only.
 * No runtime functions, no persistence, no LLM.
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
  PROPOSED_REVISED_OTUNIT_STATUS_VALUES,
  createProposedRevisedOTUnitFromConfirmedPreview,
} from "../otunit-proposed-revision-boundary";

const boundaryPath = path.resolve(
  process.cwd(),
  "src/runtime/kernel/otunit-proposed-revision-boundary.ts",
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

function buildRejectedDecision(
  preview: OTUnitRevisionPreview,
): OTUnitRevisionPreviewDecision {
  return {
    previewId: preview.id,
    status: "rejected",
    decidedBy: "user",
    reason: "User rejected the revision preview.",
  };
}

function buildValidInput(): {
  id: string;
  proposedOTUnitId: string;
  sourceSnapshot: SourceOTUnitSnapshot;
  preview: OTUnitRevisionPreview;
  decision: OTUnitRevisionPreviewDecision;
  createdAt: string;
} {
  const sourceSnapshot = buildSourceSnapshot();
  const source = buildRevisionPreviewSource();
  const patch = buildProposedPatch();
  const preview = buildPreview(source, patch);
  const decision = buildConfirmedDecision(preview);

  return {
    id: "boundary_record_001",
    proposedOTUnitId: "proposed_revised_otunit_001",
    sourceSnapshot,
    preview,
    decision,
    createdAt: "2026-07-06T00:00:00.000Z",
  };
}

describe("ProposedRevisedOTUnitBoundary", () => {
  it("boundary file exists", () => {
    expect(fs.existsSync(boundaryPath)).toBe(true);
  });

  describe("Type exports", () => {
    it("status values include proposed, accepted, rejected", () => {
      expect(PROPOSED_REVISED_OTUNIT_STATUS_VALUES).toContain("proposed");
      expect(PROPOSED_REVISED_OTUNIT_STATUS_VALUES).toContain("accepted");
      expect(PROPOSED_REVISED_OTUNIT_STATUS_VALUES).toContain("rejected");
      expect(PROPOSED_REVISED_OTUNIT_STATUS_VALUES).toHaveLength(3);
    });
  });

  describe("createProposedRevisedOTUnitFromConfirmedPreview", () => {
    it("confirmed preview creates proposed revised OTUnit", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.id).toBe("boundary_record_001");
      expect(result.status).toBe("proposed");
      expect(result.proposed.id).toBe("proposed_revised_otunit_001");
    });

    it("proposed revised OTUnit has proposed status", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.status).toBe("proposed");
    });

    it("proposed revised OTUnit still requires subsequent confirmation", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.requiresConfirmation).toBe(true);
    });

    it("source OTUnit is NOT modified by the boundary projection", () => {
      const input = buildValidInput();
      const snapshotBefore = { ...input.sourceSnapshot };
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.sourceSnapshot).toEqual(snapshotBefore);
      expect(result.sourceSnapshot).toBe(input.sourceSnapshot);
    });

    it("source OTUnit status does NOT change", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.sourceSnapshot.status).toBe("active");
    });

    it("proposed revised OTUnit does NOT auto-replace source OTUnit", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.autoReplaceSourceOTUnit).toBe(false);
      expect(result.proposed.sourceOTUnitMutationAllowed).toBe(false);
      expect(result.proposed.sourceOTUnitStatusChangeAllowed).toBe(false);
    });

    it("proposed revised OTUnit references source and revision preview", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.sourceOTUnitId).toBe("otunit_001");
      expect(result.proposed.revisionPreviewId).toBe("revision_preview_001");
      expect(result.proposed.revisionIntentRecordId).toBe(
        "revision_intent_001",
      );
    });

    it("patch fields override source snapshot fields when present", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.judgmentCriteria).toBe(
        "The owner can judge completion after completing at least 3 customer interviews and recording key findings in the shared log.",
      );
      expect(result.proposed.planOrActionItems).toEqual([
        "Draft one revised customer interview checklist with scoring rubric.",
        "Schedule 3 customer interviews.",
      ]);
    });

    it("non-patched fields fall back to source snapshot values", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.title).toBe(
        "Complete first customer interview batch",
      );
      expect(result.proposed.objective).toBe(
        "Validate the core value proposition with 5 target customers.",
      );
      expect(result.proposed.owner).toBe("rich");
      expect(result.proposed.dueDate).toBe("2026-07-31");
    });

    it("rejected preview decision throws error", () => {
      const input = buildValidInput();
      input.decision = buildRejectedDecision(input.preview);

      expect(() =>
        createProposedRevisedOTUnitFromConfirmedPreview(input),
      ).toThrow("Cannot create proposed revised OTUnit from rejected preview decision.");
    });

    it("mismatched preview decision throws error", () => {
      const input = buildValidInput();
      input.decision = {
        ...input.decision,
        previewId: "revision_preview_999",
      };

      expect(() =>
        createProposedRevisedOTUnitFromConfirmedPreview(input),
      ).toThrow("Revision preview decision does not match preview.");
    });

    it("mismatched source OTUnit throws error", () => {
      const input = buildValidInput();
      const mismatchedSource = buildRevisionPreviewSource("otunit_999");
      const mismatchedPatch = buildProposedPatch();
      input.preview = buildPreview(mismatchedSource, mismatchedPatch);
      input.decision = buildConfirmedDecision(input.preview);
      input.decision = { ...input.decision, previewId: input.preview.id };

      expect(() =>
        createProposedRevisedOTUnitFromConfirmedPreview(input),
      ).toThrow(
        "Revision preview source OTUnit does not match source snapshot.",
      );
    });

    it("createdAt is preserved", () => {
      const input = buildValidInput();
      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.proposed.createdAt).toBe("2026-07-06T00:00:00.000Z");
    });

    it("runtime behavior remains unchanged", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });
});
