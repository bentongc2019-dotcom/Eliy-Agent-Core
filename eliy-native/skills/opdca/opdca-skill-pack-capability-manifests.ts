import type { CapabilityManifest } from "../../src/runtime/capabilities/capability-contract";

export const opdcaSkillPackCapabilityManifests: readonly CapabilityManifest[] = [
  {
    id: "opdca",
    name: "O’PDCA Skill Pack",
    kind: "skill",
    composition: "pack",
    decompositionStatus: "provisional",
    description:
      "An objective-driven, PDCA-based management system for planning, budgeting, review, improvement, and management development.",
    assetPath: "skills/opdca/SKILL.md",
    referencesPath: "skills/opdca/references",
    visibility: "enabled",
    invocationModes: ["automatic", "user_invoked", "runtime_invoked"],
    requiresApproval: false,
    requiresConfirmation: true,
    status: "draft",
    version: "0.1.0",
  },
];
