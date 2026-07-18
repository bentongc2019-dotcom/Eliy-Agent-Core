import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { evidenceExtractCapabilityManifest } from "../../../../skills/evidence-extract/evidence-extract-capability-manifest";
import {
  assembleCapabilityExecutionContext,
  HLAMT_SKILL_APPLICATION_EXPERIMENT_ASSET_PATH,
  resolveCapabilityAsset,
} from "../capability-execution-context-implementation";
import { loadHlamtContext } from "../../kernel/loaders/hlamt-loader";
import { runDeterministicSkill } from "../../kernel/skills/index";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const payload = {
  input:
    "客户说产品不好用，所以产品定位失败，应该马上重做整个产品。",
};

describe("HLAMT Skill Application execution context", () => {
  it("preserves the existing root HLAMT summary and deterministic Skill prefix", () => {
    const hlamtContext = loadHlamtContext(projectRoot);
    const expectedSummary =
      "Runtime Asset hypothesis for human intelligence augmentation context. For L0 / L1: - load at runtime start - summarize into `hlamt_context_summary`";

    expect(hlamtContext.hlamt_context_summary).toBe(expectedSummary);
    expect(
      runDeterministicSkill({
        skill_name: "evidence-extract",
        input_summary: "bounded input",
        hlamt_context: hlamtContext,
      }).text,
    ).toBe(`[HLAMT] ${expectedSummary} Evidence candidate: bounded input`);
  });

  it("resolves the actual evidence-extract manifest and bounded Skill asset", () => {
    const asset = resolveCapabilityAsset({
      projectRoot,
      manifest: evidenceExtractCapabilityManifest,
    });

    expect(evidenceExtractCapabilityManifest).toMatchObject({
      id: "evidence-extract",
      kind: "skill",
      assetPath: "skills/evidence-extract/SKILL.md",
      requiresConfirmation: true,
    });
    expect(asset.capabilityId).toBe("evidence-extract");
    expect(asset.instructions).toContain("Reported Fact");
    expect(asset.instructions).toContain("Unsupported Conclusion");
    expect(asset.instructions).toContain("Evidence Needed");
    expect(asset.instructions).toContain("candidate");
    expect(asset.instructions).toContain("canonical");
    expect(asset.assetFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("loads one HLAMT asset for both conditions and changes only injection requested", () => {
    const common = {
      projectRoot,
      manifest: evidenceExtractCapabilityManifest,
      payload,
      invocationId: "hlamt-proof-001",
      createdAt: "2026-07-18T00:00:00.000Z",
      actor: "agent" as const,
    };
    const baseline = assembleCapabilityExecutionContext({
      ...common,
      hlamtInjectionRequested: false,
    });
    const candidate = assembleCapabilityExecutionContext({
      ...common,
      hlamtInjectionRequested: true,
    });

    expect(baseline.hlamt.summary).toContain("Epistemic Clarity");
    expect(baseline.hlamt.sourcePath).toBe(
      HLAMT_SKILL_APPLICATION_EXPERIMENT_ASSET_PATH,
    );
    expect(candidate.hlamt.summary).toBe(baseline.hlamt.summary);
    expect(candidate.hlamt.sourcePath).toBe(baseline.hlamt.sourcePath);
    expect(candidate.hlamt.fingerprint).toBe(baseline.hlamt.fingerprint);
    expect(candidate.asset).toEqual(baseline.asset);
    expect(candidate.payload).toEqual(baseline.payload);
    expect(candidate.outputBoundary).toEqual({
      allowedOutputKinds: ["candidate"],
      requiresConfirmation: true,
      canonicalMutationAllowed: false,
    });
    expect(candidate.outputBoundary).toEqual(baseline.outputBoundary);
    expect(baseline.hlamt.injectionRequested).toBe(false);
    expect(candidate.hlamt.injectionRequested).toBe(true);
  });
});
