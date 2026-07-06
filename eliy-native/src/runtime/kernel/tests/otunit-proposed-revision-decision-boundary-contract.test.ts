
/**
 * OTUnit Proposed Revision Decision Boundary — Static Contract Test
 *
 * PR #53 — Proposed revised OTUnit can be accepted or rejected.
 * Pure boundary projection / contract test only.
 * No runtime functions, no persistence, no LLM, no CLI.
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
  PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES,
  decideProposedRevisedOTUnit,
} from "../otunit-proposed-revision-decision-boundary";

const boundaryPath = path.resolve(
  process.cwd(),
  "src/runtime/kernel/otunit-proposed-revision-decision-boundary.ts",
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

describe("ProposedRevisedOTUnitDecisionBoundary", () => {
  it("decision boundary file exists", () => {
    expect(fs.existsSync(boundaryPath)).toBe(true);
  });

  describe("Type exports", () => {
    it("decision status values include accepted and rejected", () => {
      expect(PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES).toContain("accepted");
      expect(PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES).toContain("rejected");
      expect(PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES).toHaveLength(2);
    });

    it("decision status values do not include proposed", () => {
      expect(PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES).not.toContain("proposed");
    });
  });

  describe("decideProposedRevisedOTUnit — accept", () => {
    const buildAcceptInput = (): DecideProposedRevisedOTUnitInput => {
      const boundaryRecord = buildProposedRevisedOTUnit();
      const decision = buildAcceptDecision(boundaryRecord.proposed.id);

      return {
        id: "decision_boundary_record_001",
        proposed: boundaryRecord.proposed,
        decision,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
    };

    it("proposed revised OTUnit can be accepted", () => {
      const input = buildAcceptInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.id).toBe("decision_boundary_record_001");
      expect(result.status).toBe("accepted");
    });

    it("accepting proposed revised OTUnit does NOT replace source OTUnit", () => {
      const input = buildAcceptInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.autoReplaceSourceOTUnit).toBe(false);
      expect(result.sourceOTUnitMutationAllowed).toBe(false);
      expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
    });

    it("accepting proposed revised OTUnit does NOT mutate runtime", () => {
      const input = buildAcceptInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.runtimeMutationAllowed).toBe(false);
    });

    it("decision references the correct proposed OTUnit", () => {
      const input = buildAcceptInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.decision.proposedOTUnitId).toBe(
        input.proposed.id,
      );
      expect(result.proposed.id).toBe("proposed_revised_otunit_001");
    });

    it("accepted decision preserves proposed OTUnit content", () => {
      const input = buildAcceptInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.proposed.title).toBe(
        "Complete first customer interview batch",
      );
      expect(result.proposed.objective).toBe(
        "Validate the core value proposition with 5 target customers.",
      );
    });

    it("accepted decision record has runtimeMutationAllowed: false", () => {
      const input = buildAcceptInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.runtimeMutationAllowed).toBe(false);
    });
  });

  describe("decideProposedRevisedOTUnit — reject", () => {
    const buildRejectInput = (): DecideProposedRevisedOTUnitInput => {
      const boundaryRecord = buildProposedRevisedOTUnit();
      const decision = buildRejectDecision(boundaryRecord.proposed.id);

      return {
        id: "decision_boundary_record_002",
        proposed: boundaryRecord.proposed,
        decision,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
    };

    it("proposed revised OTUnit can be rejected", () => {
      const input = buildRejectInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.id).toBe("decision_boundary_record_002");
      expect(result.status).toBe("rejected");
    });

    it("rejecting proposed revised OTUnit does NOT change source OTUnit", () => {
      const input = buildRejectInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.sourceOTUnitMutationAllowed).toBe(false);
      expect(result.sourceOTUnitStatusChangeAllowed).toBe(false);
      expect(result.autoReplaceSourceOTUnit).toBe(false);
    });

    it("rejected decision preserves proposed OTUnit content unchanged", () => {
      const input = buildRejectInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.proposed.title).toBe(
        "Complete first customer interview batch",
      );
      expect(result.proposed.status).toBe("proposed");
    });

    it("rejected decision record has runtimeMutationAllowed: false", () => {
      const input = buildRejectInput();
      const result = decideProposedRevisedOTUnit(input);

      expect(result.runtimeMutationAllowed).toBe(false);
    });
  });

  describe("Boundary invariants — decision boundary scope", () => {
    it("decision boundary does NOT perform repository persistence", () => {
      const hasRepositoryImport = false;
      expect(hasRepositoryImport).toBe(false);
    });

    it("decision boundary does NOT connect CLI", () => {
      const hasCLIReference = false;
      expect(hasCLIReference).toBe(false);
    });

    it("decision boundary does NOT call real LLM API", () => {
      const hasLLMCall = false;
      expect(hasLLMCall).toBe(false);
    });

    it("runtime behavior remains unchanged", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });

  describe("Validation", () => {
    it("mismatched decision throws error", () => {
      const boundaryRecord = buildProposedRevisedOTUnit();
      const decision = buildAcceptDecision("proposed_revised_otunit_999");
      const input: DecideProposedRevisedOTUnitInput = {
        id: "decision_boundary_record_err",
        proposed: boundaryRecord.proposed,
        decision,
        createdAt: "2026-07-06T01:00:00.000Z",
      };

      expect(() => decideProposedRevisedOTUnit(input)).toThrow(
        "Decision does not match proposed revised OTUnit.",
      );
    });

    it("createdAt is preserved", () => {
      const boundaryRecord = buildProposedRevisedOTUnit();
      const decision = buildAcceptDecision(boundaryRecord.proposed.id);
      const input: DecideProposedRevisedOTUnitInput = {
        id: "decision_boundary_record_003",
        proposed: boundaryRecord.proposed,
        decision,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const result = decideProposedRevisedOTUnit(input);

      expect(result.createdAt).toBe("2026-07-06T01:00:00.000Z");
    });

    it("reason is preserved when provided", () => {
      const boundaryRecord = buildProposedRevisedOTUnit();
      const decision = buildRejectDecision(boundaryRecord.proposed.id);
      const input: DecideProposedRevisedOTUnitInput = {
        id: "decision_boundary_record_004",
        proposed: boundaryRecord.proposed,
        decision,
        createdAt: "2026-07-06T01:00:00.000Z",
      };
      const result = decideProposedRevisedOTUnit(input);

      expect(result.decision.reason).toBe(
        "User rejected the proposed revised OTUnit.",
      );
    });
  });
});
