/**
 * OTUnit Revision Chain Boundary Index
 *
 * Stable boundary surface for the OTUnit revision chain.
 * Index only. No repository persistence, no CLI, no runtime mutation.
 *
 * PR #56 — Index and re-export only.
 * All 5 boundary modules (PR #50–#55) remain untouched.
 */

// ── Boundary Module Registry ──────────────────────────────────────────────────

export const OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES = [
  "otunit-revision-preview-boundary",
  "otunit-proposed-revision-boundary",
  "otunit-proposed-revision-decision-boundary",
  "otunit-supersession-boundary",
  "otunit-revision-lifecycle-projection-boundary",
] as const;

export type OTUnitRevisionChainBoundaryModule =
  (typeof OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES)[number];

// ── Chain Stage Order ─────────────────────────────────────────────────────────

export const OTUNIT_REVISION_CHAIN_STAGE_ORDER = [
  "revision_intent_recorded",
  "revision_previewed",
  "proposed_revised_otunit_created",
  "proposed_revised_otunit_decided",
  "supersession_declared",
] as const;

export type OTUnitRevisionChainStage =
  (typeof OTUNIT_REVISION_CHAIN_STAGE_ORDER)[number];

// ── Re-export: otunit-revision-preview-boundary (PR #50) ─────────────────────

export {
  OTUNIT_REVISION_PREVIEW_STATUS_VALUES,
} from "./otunit-revision-preview-boundary";

export type {
  OTUnitRevisionPreviewStatus,
  OTUnitRevisionPreviewActor,
  OTUnitRevisionPreviewSource,
  OTUnitRevisionPreviewPatch,
  OTUnitRevisionPreview,
  OTUnitRevisionPreviewDecision,
  OTUnitRevisionPreviewBoundaryRecord,
} from "./otunit-revision-preview-boundary";

// ── Re-export: otunit-proposed-revision-boundary (PR #52) ────────────────────

export {
  PROPOSED_REVISED_OTUNIT_STATUS_VALUES,
  createProposedRevisedOTUnitFromConfirmedPreview,
} from "./otunit-proposed-revision-boundary";

export type {
  ProposedRevisedOTUnitStatus,
  SourceOTUnitSnapshot,
  ProposedRevisedOTUnit,
  ProposedRevisedOTUnitBoundaryRecord,
  CreateProposedRevisedOTUnitInput,
} from "./otunit-proposed-revision-boundary";

// ── Re-export: otunit-proposed-revision-decision-boundary (PR #53) ───────────

export {
  PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES,
  decideProposedRevisedOTUnit,
} from "./otunit-proposed-revision-decision-boundary";

export type {
  ProposedRevisedOTUnitDecisionStatus,
  ProposedRevisedOTUnitDecisionActor,
  ProposedRevisedOTUnitDecision,
  ProposedRevisedOTUnitDecisionBoundaryRecord,
  DecideProposedRevisedOTUnitInput,
} from "./otunit-proposed-revision-decision-boundary";

// ── Re-export: otunit-supersession-boundary (PR #54) ─────────────────────────

export {
  OTUNIT_SUPERSESSION_STATUS_VALUES,
  OTUNIT_SUPERSESSION_RELATION_VALUES,
  declareOTUnitSupersessionFromAcceptedDecision,
} from "./otunit-supersession-boundary";

export type {
  OTUnitSupersessionStatus,
  OTUnitSupersessionRelation,
  OTUnitSupersessionRelationRecord,
  OTUnitSupersessionBoundaryRecord,
  DeclareOTUnitSupersessionInput,
} from "./otunit-supersession-boundary";

// ── Re-export: otunit-revision-lifecycle-projection-boundary (PR #55) ────────

export {
  OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES,
  projectOTUnitRevisionLifecycle,
} from "./otunit-revision-lifecycle-projection-boundary";

export type {
  OTUnitRevisionLifecycleStage,
  OTUnitRevisionIntentSnapshot,
  OTUnitRevisionLifecycleProjectionInput,
  OTUnitRevisionLifecycleProjection,
} from "./otunit-revision-lifecycle-projection-boundary";
