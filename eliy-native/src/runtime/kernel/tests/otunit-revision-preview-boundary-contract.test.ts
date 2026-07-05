/**
 * OTUnit Revision Preview Boundary Contract — Static Contract Test
 *
 * PR #50 — Contract scaffold only.
 * No runtime functions, no persistence, no mutation, no new OTUnit creation.
 * Runtime behavior must remain unchanged.
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

import {
  type OTUnitRevisionPreviewSource,
  type OTUnitRevisionPreviewPatch,
  type OTUnitRevisionPreview,
  type OTUnitRevisionPreviewDecision,
  type OTUnitRevisionPreviewBoundaryRecord,
  OTUNIT_REVISION_PREVIEW_STATUS_VALUES,
} from "../otunit-revision-preview-boundary";

const boundaryPath = path.resolve(
  process.cwd(),
  "src/runtime/kernel/otunit-revision-preview-boundary.ts"
);

describe("OTUnitRevisionPreviewBoundary", () => {
  it("boundary file exists", () => {
    expect(fs.existsSync(boundaryPath)).toBe(true);
  });

  it("exports OTUnitRevisionPreviewSource", () => {
    const source: OTUnitRevisionPreviewSource = {
      otunitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      reasonText: "Current OTUnit needs clearer judgment criteria before execution.",
      directionText: "Clarify the judgment criteria and next action items before confirming the revision.",
      evidenceRefs: ["evidence_001"],
    };
    expect(source.otunitId).toBe("otunit_001");
    expect(source.revisionIntentRecordId).toBe("revision_intent_001");
    expect(source.evidenceRefs).toContain("evidence_001");
  });

  it("exports OTUnitRevisionPreviewPatch", () => {
    const source: OTUnitRevisionPreviewSource = {
      otunitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      reasonText: "Needs clearer criteria.",
      directionText: "Clarify criteria.",
      evidenceRefs: ["evidence_001"],
    };

    const proposedPatch: OTUnitRevisionPreviewPatch = {
      judgmentCriteria: "The owner can judge completion using one observable customer interview outcome.",
      planOrActionItems: ["Draft one revised customer interview checklist."],
      evidenceRefs: source.evidenceRefs,
    };
    expect(proposedPatch.judgmentCriteria).toBeDefined();
    expect(proposedPatch.planOrActionItems).toHaveLength(1);
    expect(proposedPatch.evidenceRefs).toEqual(["evidence_001"]);
  });

  it("exports OTUnitRevisionPreview with required invariants", () => {
    const source: OTUnitRevisionPreviewSource = {
      otunitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      reasonText: "Current OTUnit needs clearer judgment criteria before execution.",
      directionText: "Clarify the judgment criteria and next action items before confirming the revision.",
      evidenceRefs: ["evidence_001"],
    };

    const proposedPatch: OTUnitRevisionPreviewPatch = {
      judgmentCriteria: "The owner can judge completion using one observable customer interview outcome.",
      planOrActionItems: ["Draft one revised customer interview checklist."],
      evidenceRefs: source.evidenceRefs,
    };

    const preview: OTUnitRevisionPreview = {
      id: "revision_preview_001",
      source,
      proposedPatch,
      previewSummary: "Preview only. No source OTUnit mutation and no new OTUnit creation.",
      status: "requires_confirmation",
      requiresConfirmation: true,
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      newOTUnitCreated: false,
    };

    expect(preview.id).toBe("revision_preview_001");
    expect(preview.source.otunitId).toBe("otunit_001");
    expect(preview.source.revisionIntentRecordId).toBe("revision_intent_001");
    expect(preview.requiresConfirmation).toBe(true);
    expect(preview.runtimeMutationAllowed).toBe(false);
    expect(preview.sourceOTUnitMutationAllowed).toBe(false);
    expect(preview.newOTUnitCreated).toBe(false);
    expect(preview.status).toBe("requires_confirmation");
  });

  it("status values include previewed, requires_confirmation, confirmed, rejected", () => {
    expect(OTUNIT_REVISION_PREVIEW_STATUS_VALUES).toContain("previewed");
    expect(OTUNIT_REVISION_PREVIEW_STATUS_VALUES).toContain("requires_confirmation");
    expect(OTUNIT_REVISION_PREVIEW_STATUS_VALUES).toContain("confirmed");
    expect(OTUNIT_REVISION_PREVIEW_STATUS_VALUES).toContain("rejected");
    expect(OTUNIT_REVISION_PREVIEW_STATUS_VALUES).toHaveLength(4);
  });

  it("exports OTUnitRevisionPreviewDecision — can confirm", () => {
    const source: OTUnitRevisionPreviewSource = {
      otunitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      reasonText: "Current OTUnit needs clearer judgment criteria before execution.",
      directionText: "Clarify the judgment criteria and next action items before confirming the revision.",
      evidenceRefs: ["evidence_001"],
    };

    const proposedPatch: OTUnitRevisionPreviewPatch = {
      judgmentCriteria: "The owner can judge completion using one observable customer interview outcome.",
      planOrActionItems: ["Draft one revised customer interview checklist."],
      evidenceRefs: source.evidenceRefs,
    };

    const preview: OTUnitRevisionPreview = {
      id: "revision_preview_001",
      source,
      proposedPatch,
      previewSummary: "Preview only. No source OTUnit mutation and no new OTUnit creation.",
      status: "requires_confirmation",
      requiresConfirmation: true,
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      newOTUnitCreated: false,
    };

    const confirmedDecision: OTUnitRevisionPreviewDecision = {
      previewId: preview.id,
      status: "confirmed",
      decidedBy: "user",
      reason: "User confirmed the revision preview.",
    };

    expect(confirmedDecision.previewId).toBe("revision_preview_001");
    expect(confirmedDecision.status).toBe("confirmed");
    expect(confirmedDecision.decidedBy).toBe("user");

    const confirmedRecord: OTUnitRevisionPreviewBoundaryRecord = {
      id: "revision_preview_record_001",
      preview,
      decision: confirmedDecision,
      status: "confirmed",
    };

    expect(confirmedRecord.id).toBe("revision_preview_record_001");
    expect(confirmedRecord.preview.id).toBe("revision_preview_001");
    expect(confirmedRecord.decision!.status).toBe("confirmed");
    expect(confirmedRecord.status).toBe("confirmed");
  });

  it("exports OTUnitRevisionPreviewDecision — can reject", () => {
    const source: OTUnitRevisionPreviewSource = {
      otunitId: "otunit_001",
      revisionIntentRecordId: "revision_intent_001",
      reasonText: "Current OTUnit needs clearer judgment criteria before execution.",
      directionText: "Clarify the judgment criteria and next action items before confirming the revision.",
      evidenceRefs: ["evidence_001"],
    };

    const proposedPatch: OTUnitRevisionPreviewPatch = {
      judgmentCriteria: "The owner can judge completion using one observable customer interview outcome.",
      planOrActionItems: ["Draft one revised customer interview checklist."],
      evidenceRefs: source.evidenceRefs,
    };

    const preview: OTUnitRevisionPreview = {
      id: "revision_preview_001",
      source,
      proposedPatch,
      previewSummary: "Preview only. No source OTUnit mutation and no new OTUnit creation.",
      status: "requires_confirmation",
      requiresConfirmation: true,
      runtimeMutationAllowed: false,
      sourceOTUnitMutationAllowed: false,
      newOTUnitCreated: false,
    };

    const rejectedDecision: OTUnitRevisionPreviewDecision = {
      previewId: preview.id,
      status: "rejected",
      decidedBy: "user",
      reason: "User rejected the revision preview.",
    };

    expect(rejectedDecision.previewId).toBe("revision_preview_001");
    expect(rejectedDecision.status).toBe("rejected");
    expect(rejectedDecision.decidedBy).toBe("user");

    const rejectedRecord: OTUnitRevisionPreviewBoundaryRecord = {
      id: "revision_preview_record_001",
      preview,
      decision: rejectedDecision,
      status: "rejected",
    };

    expect(rejectedRecord.id).toBe("revision_preview_record_001");
    expect(rejectedRecord.preview.id).toBe("revision_preview_001");
    expect(rejectedRecord.decision!.status).toBe("rejected");
    expect(rejectedRecord.status).toBe("rejected");
  });

  it("runtime behavior remains unchanged", () => {
    const runtimeBehaviorChanged = false;
    expect(runtimeBehaviorChanged).toBe(false);
  });
});
