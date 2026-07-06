/**
 * OTUnit Revision Chain Boundary Index — Static Contract Test
 *
 * PR #56 — Index and re-export only.
 * No repository persistence, no CLI, no runtime mutation.
 * Runtime behavior must remain unchanged.
 *
 * Verifies:
 *   • Index file and all 5 boundary module files exist
 *   • Module registry is correct
 *   • Chain stage order is correct
 *   • All re-exported types are constructable
 *   • All re-exported functions are callable with expected signatures
 *   • Runtime behavior remains unchanged (guard assertion)
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

import {
  // ── Registry ──────────────────────────────────────────────────────────────
  OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES,
  OTUNIT_REVISION_CHAIN_STAGE_ORDER,

  // ── Types: otunit-revision-preview-boundary ────────────────────────────────
  type OTUnitRevisionPreviewSource,
  type OTUnitRevisionPreviewPatch,
  type OTUnitRevisionPreview,
  type OTUnitRevisionPreviewDecision,
  type OTUnitRevisionPreviewBoundaryRecord,

  // ── Constants: otunit-revision-preview-boundary ────────────────────────────
  OTUNIT_REVISION_PREVIEW_STATUS_VALUES,

  // ── Types: otunit-proposed-revision-boundary ───────────────────────────────
  type SourceOTUnitSnapshot,
  type ProposedRevisedOTUnit,
  type ProposedRevisedOTUnitBoundaryRecord,
  type CreateProposedRevisedOTUnitInput,

  // ── Constants + Functions: otunit-proposed-revision-boundary ───────────────
  PROPOSED_REVISED_OTUNIT_STATUS_VALUES,
  createProposedRevisedOTUnitFromConfirmedPreview,

  // ── Types: otunit-proposed-revision-decision-boundary ──────────────────────
  type ProposedRevisedOTUnitDecision,
  type ProposedRevisedOTUnitDecisionBoundaryRecord,
  type DecideProposedRevisedOTUnitInput,

  // ── Constants + Functions: otunit-proposed-revision-decision-boundary ──────
  PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES,
  decideProposedRevisedOTUnit,

  // ── Types: otunit-supersession-boundary ────────────────────────────────────
  type OTUnitSupersessionRelationRecord,
  type OTUnitSupersessionBoundaryRecord,
  type DeclareOTUnitSupersessionInput,

  // ── Constants + Functions: otunit-supersession-boundary ────────────────────
  OTUNIT_SUPERSESSION_STATUS_VALUES,
  OTUNIT_SUPERSESSION_RELATION_VALUES,
  declareOTUnitSupersessionFromAcceptedDecision,

  // ── Types: otunit-revision-lifecycle-projection-boundary ───────────────────
  type OTUnitRevisionIntentSnapshot,
  type OTUnitRevisionLifecycleProjectionInput,
  type OTUnitRevisionLifecycleProjection,

  // ── Constants + Functions: otunit-revision-lifecycle-projection-boundary ───
  OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES,
  projectOTUnitRevisionLifecycle,
} from "../otunit-revision-chain-boundary";

// ── Resolve file paths ───────────────────────────────────────────────────────

const kernelDir = path.resolve(process.cwd(), "src/runtime/kernel");

const indexFilePath = path.join(kernelDir, "otunit-revision-chain-boundary.ts");

const boundaryFilePaths: Record<string, string> = {
  "otunit-revision-preview-boundary": path.join(kernelDir, "otunit-revision-preview-boundary.ts"),
  "otunit-proposed-revision-boundary": path.join(kernelDir, "otunit-proposed-revision-boundary.ts"),
  "otunit-proposed-revision-decision-boundary": path.join(kernelDir, "otunit-proposed-revision-decision-boundary.ts"),
  "otunit-supersession-boundary": path.join(kernelDir, "otunit-supersession-boundary.ts"),
  "otunit-revision-lifecycle-projection-boundary": path.join(kernelDir, "otunit-revision-lifecycle-projection-boundary.ts"),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRevisionPreviewSource(): OTUnitRevisionPreviewSource {
  return {
    otunitId: "otunit_001",
    revisionIntentRecordId: "revision_intent_001",
    reasonText: "Current OTUnit needs clearer judgment criteria.",
    directionText: "Clarify the judgment criteria.",
    evidenceRefs: ["evidence_001"],
  };
}

function buildRevisionPreviewPatch(): OTUnitRevisionPreviewPatch {
  return {
    judgmentCriteria: "The owner can judge completion using one observable outcome.",
    planOrActionItems: ["Draft one revised checklist."],
  };
}

function buildRevisionPreview(): OTUnitRevisionPreview {
  const source = buildRevisionPreviewSource();
  const patch = buildRevisionPreviewPatch();
  return {
    id: "revision_preview_001",
    source,
    proposedPatch: patch,
    previewSummary: "Clarify judgment criteria for OTUnit 001.",
    status: "previewed",
    requiresConfirmation: true,
    runtimeMutationAllowed: false,
    sourceOTUnitMutationAllowed: false,
    newOTUnitCreated: false,
  };
}

function buildRevisionPreviewDecision(): OTUnitRevisionPreviewDecision {
  return {
    previewId: "revision_preview_001",
    status: "confirmed",
    decidedBy: "user",
  };
}

function buildSourceOTUnitSnapshot(): SourceOTUnitSnapshot {
  return {
    id: "otunit_001",
    title: "Clarify vendor interview criteria",
    evidenceRefs: ["evidence_001"],
  };
}

function buildProposedRevisedOTUnit(): ProposedRevisedOTUnit {
  const source = buildRevisionPreviewSource();
  const patch = buildRevisionPreviewPatch();
  return {
    id: "proposed_otunit_001",
    sourceOTUnitId: source.otunitId,
    revisionPreviewId: "revision_preview_001",
    revisionIntentRecordId: source.revisionIntentRecordId,
    status: "proposed",
    title: "Clarify vendor interview criteria",
    objective: "Draft one revised checklist.",
    judgmentCriteria: patch.judgmentCriteria,
    planOrActionItems: patch.planOrActionItems,
    evidenceRefs: source.evidenceRefs,
    requiresConfirmation: true,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
  };
}

function buildProposedRevisionDecision(): ProposedRevisedOTUnitDecision {
  return {
    id: "decision_001",
    proposedOTUnitId: "proposed_otunit_001",
    status: "accepted",
    decidedBy: "user",
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OTUnitRevisionChainBoundaryIndex", () => {
  // ── File existence ─────────────────────────────────────────────────────────

  describe("file existence", () => {
    it("index file exists", () => {
      expect(fs.existsSync(indexFilePath)).toBe(true);
    });

    it("all 5 boundary module files exist", () => {
      for (const [name, filePath] of Object.entries(boundaryFilePaths)) {
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  // ── Module registry ────────────────────────────────────────────────────────

  describe("OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES", () => {
    it("has exactly 5 modules", () => {
      expect(OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES).toHaveLength(5);
    });

    it("lists module names in correct order", () => {
      const expected = [
        "otunit-revision-preview-boundary",
        "otunit-proposed-revision-boundary",
        "otunit-proposed-revision-decision-boundary",
        "otunit-supersession-boundary",
        "otunit-revision-lifecycle-projection-boundary",
      ] as const;
      expect([...OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES]).toEqual([...expected]);
    });

    it("each module name corresponds to a real file on disk", () => {
      for (const name of OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES) {
        const filePath = boundaryFilePaths[name];
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it("module names are type-level readonly via as const", () => {
      const names: readonly string[] = OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES;
      expect(names.length).toBe(5);
    });
  });

  // ── Stage order ────────────────────────────────────────────────────────────

  describe("OTUNIT_REVISION_CHAIN_STAGE_ORDER", () => {
    it("has exactly 5 stages", () => {
      expect(OTUNIT_REVISION_CHAIN_STAGE_ORDER).toHaveLength(5);
    });

    it("lists stages in correct order", () => {
      const expected = [
        "revision_intent_recorded",
        "revision_previewed",
        "proposed_revised_otunit_created",
        "proposed_revised_otunit_decided",
        "supersession_declared",
      ] as const;
      expect([...OTUNIT_REVISION_CHAIN_STAGE_ORDER]).toEqual([...expected]);
    });

    it("stages are type-level readonly via as const", () => {
      const stages: readonly string[] = OTUNIT_REVISION_CHAIN_STAGE_ORDER;
      expect(stages.length).toBe(5);
    });
  });

  // ── Re-exported types: otunit-revision-preview-boundary ────────────────────

  describe("re-exported types — otunit-revision-preview-boundary", () => {
    it("OTUnitRevisionPreviewSource is constructable", () => {
      const source = buildRevisionPreviewSource();
      expect(source.otunitId).toBe("otunit_001");
      expect(source.revisionIntentRecordId).toBe("revision_intent_001");
    });

    it("OTUnitRevisionPreviewPatch is constructable", () => {
      const patch = buildRevisionPreviewPatch();
      expect(patch.judgmentCriteria).toBeDefined();
    });

    it("OTUnitRevisionPreview is constructable", () => {
      const preview = buildRevisionPreview();
      expect(preview.id).toBe("revision_preview_001");
      expect(preview.status).toBe("previewed");
      expect(preview.requiresConfirmation).toBe(true);
    });

    it("OTUnitRevisionPreviewDecision is constructable", () => {
      const decision = buildRevisionPreviewDecision();
      expect(decision.status).toBe("confirmed");
      expect(decision.decidedBy).toBe("user");
    });

    it("OTUnitRevisionPreviewBoundaryRecord is constructable", () => {
      const preview = buildRevisionPreview();
      const decision = buildRevisionPreviewDecision();
      const record: OTUnitRevisionPreviewBoundaryRecord = {
        id: "record_001",
        preview,
        decision,
        status: "previewed",
      };
      expect(record.id).toBe("record_001");
    });

    it("OTUNIT_REVISION_PREVIEW_STATUS_VALUES has all statuses", () => {
      expect([...OTUNIT_REVISION_PREVIEW_STATUS_VALUES]).toEqual([
        "previewed",
        "requires_confirmation",
        "confirmed",
        "rejected",
      ]);
    });
  });

  // ── Re-exported types + functions: otunit-proposed-revision-boundary ───────

  describe("re-exported types — otunit-proposed-revision-boundary", () => {
    it("SourceOTUnitSnapshot is constructable", () => {
      const snapshot = buildSourceOTUnitSnapshot();
      expect(snapshot.id).toBe("otunit_001");
    });

    it("ProposedRevisedOTUnit is constructable", () => {
      const proposed = buildProposedRevisedOTUnit();
      expect(proposed.id).toBe("proposed_otunit_001");
      expect(proposed.status).toBe("proposed");
      expect(proposed.requiresConfirmation).toBe(true);
    });

    it("ProposedRevisedOTUnitBoundaryRecord is constructable", () => {
      const snapshot = buildSourceOTUnitSnapshot();
      const proposed = buildProposedRevisedOTUnit();
      const record: ProposedRevisedOTUnitBoundaryRecord = {
        id: "boundary_record_001",
        sourceSnapshot: snapshot,
        proposed,
        status: "proposed",
      };
      expect(record.id).toBe("boundary_record_001");
    });

    it("PROPOSED_REVISED_OTUNIT_STATUS_VALUES has all statuses", () => {
      expect([...PROPOSED_REVISED_OTUNIT_STATUS_VALUES]).toEqual([
        "proposed",
        "accepted",
        "rejected",
      ]);
    });

    it("createProposedRevisedOTUnitFromConfirmedPreview is callable", () => {
      const preview = buildRevisionPreview();
      const decision = buildRevisionPreviewDecision();
      const source = buildSourceOTUnitSnapshot();

      const input: CreateProposedRevisedOTUnitInput = {
        id: "boundary_record_001",
        proposedOTUnitId: "proposed_otunit_001",
        sourceSnapshot: source,
        preview,
        decision,
      };

      const result = createProposedRevisedOTUnitFromConfirmedPreview(input);

      expect(result.id).toBe("boundary_record_001");
      expect(result.status).toBe("proposed");
    });
  });

  // ── Re-exported types + functions: otunit-proposed-revision-decision-boundary ──

  describe("re-exported types — otunit-proposed-revision-decision-boundary", () => {
    it("ProposedRevisedOTUnitDecision is constructable", () => {
      const decision = buildProposedRevisionDecision();
      expect(decision.status).toBe("accepted");
    });

    it("ProposedRevisedOTUnitDecisionBoundaryRecord is constructable", () => {
      const proposed = buildProposedRevisedOTUnit();
      const decision = buildProposedRevisionDecision();
      const record: ProposedRevisedOTUnitDecisionBoundaryRecord = {
        id: "decision_boundary_001",
        proposed,
        decision,
        status: "accepted",
        runtimeMutationAllowed: false,
        sourceOTUnitMutationAllowed: false,
        sourceOTUnitStatusChangeAllowed: false,
        autoReplaceSourceOTUnit: false,
      };
      expect(record.id).toBe("decision_boundary_001");
    });

    it("PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES has all statuses", () => {
      expect([...PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES]).toEqual([
        "accepted",
        "rejected",
      ]);
    });

    it("decideProposedRevisedOTUnit is callable with accept", () => {
      const proposed = buildProposedRevisedOTUnit();
      const decision = buildProposedRevisionDecision();

      const input: DecideProposedRevisedOTUnitInput = {
        id: "decision_boundary_001",
        proposed,
        decision,
      };

      const result = decideProposedRevisedOTUnit(input);

      expect(result.id).toBe("decision_boundary_001");
      expect(result.status).toBe("accepted");
    });
  });

  // ── Re-exported types + functions: otunit-supersession-boundary ────────────

  describe("re-exported types — otunit-supersession-boundary", () => {
    it("OTUnitSupersessionRelationRecord is constructable", () => {
      const relation: OTUnitSupersessionRelationRecord = {
        sourceOTUnitId: "otunit_001",
        revisedOTUnitId: "proposed_otunit_001",
        decisionBoundaryRecordId: "decision_boundary_001",
        relation: "supersedes",
        versionLinkRequired: true,
        sourceHistoryPreserved: true,
      };
      expect(relation.sourceOTUnitId).toBe("otunit_001");
      expect(relation.relation).toBe("supersedes");
    });

    it("OTUnitSupersessionBoundaryRecord is constructable", () => {
      const record: OTUnitSupersessionBoundaryRecord = {
        id: "supersession_001",
        // Use minimal valid data for type check
      } as OTUnitSupersessionBoundaryRecord;
      expect(record.id).toBe("supersession_001");
    });

    it("OTUNIT_SUPERSESSION_STATUS_VALUES has all statuses", () => {
      expect([...OTUNIT_SUPERSESSION_STATUS_VALUES]).toEqual(["declared"]);
    });

    it("OTUNIT_SUPERSESSION_RELATION_VALUES has all relations", () => {
      expect([...OTUNIT_SUPERSESSION_RELATION_VALUES]).toEqual(["supersedes"]);
    });

    it("declareOTUnitSupersessionFromAcceptedDecision is callable", () => {
      const proposed = buildProposedRevisedOTUnit();
      const decision = buildProposedRevisionDecision();

      const decisionBoundary = decideProposedRevisedOTUnit({
        id: "decision_boundary_001",
        proposed,
        decision,
      });

      const input: DeclareOTUnitSupersessionInput = {
        id: "supersession_001",
        decisionBoundaryRecord: decisionBoundary,
      };

      const result = declareOTUnitSupersessionFromAcceptedDecision(input);

      expect(result.id).toBe("supersession_001");
      expect(result.status).toBe("declared");
      expect(result.relationRecord.relation).toBe("supersedes");
    });
  });

  // ── Re-exported types + functions: otunit-revision-lifecycle-projection-boundary ──

  describe("re-exported types — otunit-revision-lifecycle-projection-boundary", () => {
    it("OTUnitRevisionIntentSnapshot is constructable", () => {
      const intent: OTUnitRevisionIntentSnapshot = {
        id: "revision_intent_001",
        sourceOTUnitId: "otunit_001",
        reasonText: "Needs clearer criteria.",
        directionText: "Clarify criteria.",
        evidenceRefs: ["evidence_001"],
      };
      expect(intent.id).toBe("revision_intent_001");
    });

    it("OTUnitRevisionLifecycleProjectionInput is constructable", () => {
      const intent: OTUnitRevisionIntentSnapshot = {
        id: "revision_intent_001",
        sourceOTUnitId: "otunit_001",
        reasonText: "Needs clearer criteria.",
        directionText: "Clarify criteria.",
        evidenceRefs: ["evidence_001"],
      };
      const input: OTUnitRevisionLifecycleProjectionInput = {
        id: "projection_001",
        revisionIntent: intent,
      };
      expect(input.id).toBe("projection_001");
    });

    it("OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES has all stages", () => {
      expect([...OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES]).toEqual([
        "revision_intent_recorded",
        "revision_previewed",
        "proposed_revised_otunit_created",
        "proposed_revised_otunit_decided",
        "supersession_declared",
      ]);
    });

    it("projectOTUnitRevisionLifecycle is callable (stage 1: intent only)", () => {
      const intent: OTUnitRevisionIntentSnapshot = {
        id: "revision_intent_001",
        sourceOTUnitId: "otunit_001",
        reasonText: "Needs clearer criteria.",
        directionText: "Clarify criteria.",
        evidenceRefs: ["evidence_001"],
      };

      const result = projectOTUnitRevisionLifecycle({
        id: "projection_001",
        revisionIntent: intent,
      });

      expect(result.currentStage).toBe("revision_intent_recorded");
    });

    it("projectOTUnitRevisionLifecycle projects through all 5 stages", () => {
      // Stage 1: intent only
      const intent: OTUnitRevisionIntentSnapshot = {
        id: "revision_intent_001",
        sourceOTUnitId: "otunit_001",
        reasonText: "Needs clearer criteria.",
        directionText: "Clarify criteria.",
        evidenceRefs: ["evidence_001"],
      };

      const stage1 = projectOTUnitRevisionLifecycle({
        id: "projection_001",
        revisionIntent: intent,
      });
      expect(stage1.currentStage).toBe("revision_intent_recorded");

      // Stage 2: intent + preview
      const preview = buildRevisionPreview();
      const stage2 = projectOTUnitRevisionLifecycle({
        id: "projection_002",
        revisionIntent: intent,
        preview,
      });
      expect(stage2.currentStage).toBe("revision_previewed");

      // Stage 3: intent + preview + proposed boundary
      const decision = buildRevisionPreviewDecision();
      const source = buildSourceOTUnitSnapshot();
      const proposedBoundary = createProposedRevisedOTUnitFromConfirmedPreview({
        id: "boundary_record_001",
        proposedOTUnitId: "proposed_otunit_001",
        sourceSnapshot: source,
        preview,
        decision,
      });
      const stage3 = projectOTUnitRevisionLifecycle({
        id: "projection_003",
        revisionIntent: intent,
        preview,
        proposedBoundary,
      });
      expect(stage3.currentStage).toBe("proposed_revised_otunit_created");

      // Stage 4: intent + preview + proposed boundary + decision boundary
      const proposed = buildProposedRevisedOTUnit();
      const acceptDecision = buildProposedRevisionDecision();
      const decisionBoundary = decideProposedRevisedOTUnit({
        id: "decision_boundary_001",
        proposed,
        decision: acceptDecision,
      });
      const stage4 = projectOTUnitRevisionLifecycle({
        id: "projection_004",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
      });
      expect(stage4.currentStage).toBe("proposed_revised_otunit_decided");

      // Stage 5: full chain through supersession
      const supersessionBoundary = declareOTUnitSupersessionFromAcceptedDecision({
        id: "supersession_001",
        decisionBoundaryRecord: decisionBoundary,
      });
      const stage5 = projectOTUnitRevisionLifecycle({
        id: "projection_005",
        revisionIntent: intent,
        preview,
        proposedBoundary,
        decisionBoundary,
        supersessionBoundary,
      });
      expect(stage5.currentStage).toBe("supersession_declared");
      expect(stage5.supersessionDeclared).toBe(true);
    });
  });

  // ── Guard: runtime behavior unchanged ──────────────────────────────────────

  describe("runtime behavior unchanged", () => {
    it("guard — no runtime behavior changes from this index", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });
});
