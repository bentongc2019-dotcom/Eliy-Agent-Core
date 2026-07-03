import { describe, expect, it } from "vitest";
import * as domain from "../../../domain/index.js";

import type {
  EvidenceRef,
  Objective,
  ObjectiveStatus,
  OTUnit,
  OTUnitConfirmationResult,
  OTUnitDraftBuildResult,
  OTUnitDraftInput,
  OTUnitReviewInput,
  OTUnitReviewIntent,
  OTUnitReviewResult,
  OTUnitRevisionInput,
  OTUnitRevisionResult,
  OTUnitStatus,
  OTUnitTransition
} from "../../../domain/index.js";

describe("OTUnit domain public contract", () => {
  it("exports the expected OTUnit runtime contract surface", () => {
    expect(domain.OBJECTIVE_STATUSES).toEqual(["draft", "active", "completed", "archived"]);
    expect(domain.OTUNIT_STATUSES).toEqual(["proposed", "confirmed", "in_progress", "blocked", "closed"]);
    expect(domain.ALLOWED_OTUNIT_TRANSITIONS).toEqual([
      { from: "proposed", to: "confirmed" },
      { from: "confirmed", to: "in_progress" },
      { from: "in_progress", to: "blocked" },
      { from: "blocked", to: "in_progress" },
      { from: "in_progress", to: "closed" },
      { from: "confirmed", to: "closed" }
    ]);

    expect(typeof domain.isObjectiveStatus).toBe("function");
    expect(typeof domain.isOTUnitStatus).toBe("function");
    expect(typeof domain.validateObjective).toBe("function");
    expect(typeof domain.validateOTUnit).toBe("function");
    expect(typeof domain.validateOTUnitTransition).toBe("function");
    expect(typeof domain.confirmOTUnit).toBe("function");
    expect(typeof domain.createProposedOTUnitFromDraft).toBe("function");
    expect(typeof domain.validateEvidenceRefs).toBe("function");
    expect(typeof domain.createOTUnitReviewIntent).toBe("function");
    expect(typeof domain.reviseOTUnit).toBe("function");
  });

  it("keeps OTUnit type exports importable", () => {
    const objectiveStatus: ObjectiveStatus = "active";
    const otunitStatus: OTUnitStatus = "proposed";
    const evidenceRef: EvidenceRef = "evidence-1";

    const objective: Objective = {
      id: "objective-1",
      title: "Increase operating clarity",
      status: objectiveStatus,
      createdAt: "2026-07-03T00:00:00.000Z"
    };

    const otunit: OTUnit = {
      id: "otunit-1",
      objectiveId: objective.id,
      title: "Identify next constraint",
      owner: "user",
      dueDate: "2026-07-10",
      status: otunitStatus,
      evidenceRefs: [evidenceRef],
      requiresConfirmation: true,
      createdAt: "2026-07-03T00:00:00.000Z"
    };

    const confirmation: OTUnitConfirmationResult = {
      valid: true,
      otunit,
      errors: []
    };

    const transition: OTUnitTransition = {
      from: "proposed",
      to: "confirmed"
    };

    const draft: OTUnitDraftInput = {
      id: "otunit-1",
      objectiveId: "objective-1",
      title: "Identify next constraint",
      owner: "user",
      dueDate: "2026-07-10",
      evidenceRefs: ["evidence-1"]
    };

    const draftResult: OTUnitDraftBuildResult = {
      valid: true,
      otunit,
      errors: []
    };

    const reviewInput: OTUnitReviewInput = {
      otunitId: "otunit-1",
      reviewNote: "Review intent",
      difference: "Difference",
      action: "revise"
    };

    const reviewIntent: OTUnitReviewIntent = { ...reviewInput };

    const reviewResult: OTUnitReviewResult = {
      valid: true,
      review: reviewIntent,
      errors: []
    };

    const revisionInput: OTUnitRevisionInput = {
      otunitId: "otunit-1",
      title: "Revised title",
      owner: "user",
      dueDate: "2026-07-17",
      evidenceRefs: ["evidence-1"],
      requiresConfirmation: true
    };

    const revisionResult: OTUnitRevisionResult = {
      valid: true,
      otunit,
      errors: []
    };

    expect(objective.id).toBe("objective-1");
    expect(otunit.id).toBe("otunit-1");
    expect(confirmation.valid).toBe(true);
    expect(transition).toEqual({ from: "proposed", to: "confirmed" });
    expect(draft.evidenceRefs).toEqual(["evidence-1"]);
    expect(draftResult.valid).toBe(true);
    expect(reviewInput.action).toBe("revise");
    expect(reviewResult.review).toEqual(reviewIntent);
    expect(revisionInput.requiresConfirmation).toBe(true);
    expect(revisionResult.otunit).toEqual(otunit);
  });
});
