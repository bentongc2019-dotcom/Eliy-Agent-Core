import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";

import type { CapabilityManifest } from "./capability-contract";
import { loadHlamtRuntimeProjection } from "../agent/hlamt-runtime-projection";
import type {
  CapabilityExecutionActor,
  CapabilityExecutionContext,
  ResolvedCapabilityAsset,
} from "./capability-execution-context-contract";

export const HLAMT_SKILL_APPLICATION_EXPERIMENT_ASSET_PATH =
  "docs/experiments/hlamt-v0.2/hlamt-skill-application-candidate.md";

export interface ResolveCapabilityAssetInput {
  projectRoot: string;
  manifest: CapabilityManifest;
}

export interface AssembleCapabilityExecutionContextInput
  extends ResolveCapabilityAssetInput {
  payload: Record<string, unknown>;
  invocationId: string;
  createdAt: string;
  actor: CapabilityExecutionActor;
  hlamtInjectionRequested: boolean;
}

function fingerprint(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function summarizeHlamtAsset(rawText: string): string {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .slice(0, 4)
    .join(" ")
    .slice(0, 280);
}

function resolveProjectFile(projectRoot: string, assetPath: string): string {
  const root = resolve(projectRoot);
  const filePath = resolve(root, assetPath);
  const relativePath = relative(root, filePath);

  if (relativePath.startsWith("..") || relativePath === "") {
    throw new Error("Capability assetPath must resolve inside projectRoot");
  }

  return filePath;
}

export function resolveCapabilityAsset(
  input: ResolveCapabilityAssetInput,
): ResolvedCapabilityAsset {
  if (!input.manifest.assetPath) {
    throw new Error(`Capability assetPath is required: ${input.manifest.id}`);
  }

  const assetPath = resolveProjectFile(
    input.projectRoot,
    input.manifest.assetPath,
  );
  const instructions = readFileSync(assetPath, "utf8");

  return {
    capabilityId: input.manifest.id,
    capabilityVersion: input.manifest.version,
    assetPath: input.manifest.assetPath,
    instructions,
    referenceSources: [],
    assetFingerprint: fingerprint(instructions),
  };
}

export function assembleCapabilityExecutionContext(
  input: AssembleCapabilityExecutionContextInput,
): CapabilityExecutionContext {
  const asset = resolveCapabilityAsset(input);
  const stableContext = loadHlamtRuntimeProjection(input.projectRoot);
  const hlamtPath = resolveProjectFile(
    input.projectRoot,
    HLAMT_SKILL_APPLICATION_EXPERIMENT_ASSET_PATH,
  );
  const hlamtRawText = readFileSync(hlamtPath, "utf8");

  return {
    capability: {
      id: input.manifest.id,
      name: input.manifest.name,
      version: input.manifest.version,
      kind: input.manifest.kind,
    },
    stableContext,
    asset,
    hlamt: {
      sourcePath: HLAMT_SKILL_APPLICATION_EXPERIMENT_ASSET_PATH,
      summary: summarizeHlamtAsset(hlamtRawText),
      fingerprint: fingerprint(hlamtRawText),
      injectionRequested: input.hlamtInjectionRequested,
    },
    payload: structuredClone(input.payload),
    outputBoundary: {
      allowedOutputKinds: ["candidate"],
      requiresConfirmation: input.manifest.requiresConfirmation,
      canonicalMutationAllowed: false,
    },
    invocationMetadata: {
      invocationId: input.invocationId,
      createdAt: input.createdAt,
      actor: input.actor,
      invocationMode: "runtime_invoked",
    },
  };
}
