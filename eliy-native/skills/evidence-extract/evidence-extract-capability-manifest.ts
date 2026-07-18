import type { CapabilityManifest } from "../../src/runtime/capabilities/capability-contract";

export const evidenceExtractCapabilityManifest: CapabilityManifest = {
  id: "evidence-extract",
  name: "Evidence Extract",
  kind: "skill",
  composition: "single",
  decompositionStatus: "none",
  description:
    "Produces bounded evidence candidates while preserving epistemic distinctions and user authority.",
  assetPath: "skills/evidence-extract/SKILL.md",
  referencesPath: "skills/evidence-extract/references",
  visibility: "enabled",
  invocationModes: ["user_invoked", "runtime_invoked"],
  requiresApproval: false,
  requiresConfirmation: true,
  status: "draft",
  version: "0.1.0",
};

export const evidenceExtractCapabilityManifests: readonly CapabilityManifest[] = [
  evidenceExtractCapabilityManifest,
];
