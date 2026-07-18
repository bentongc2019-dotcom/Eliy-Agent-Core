import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const HLAMT_RUNTIME_PROJECTION_MAX_LENGTH = 1_800;
export const HLAMT_RUNTIME_PROJECTION_SOURCE_PATH = "HLAMT.md";

const START_MARKER = "<!-- ELIY_STABLE_RUNTIME_PROJECTION_START -->";
const END_MARKER = "<!-- ELIY_STABLE_RUNTIME_PROJECTION_END -->";

const ProjectionSourceSchema = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    systemPurpose: z.string().trim().min(1).max(400),
    humanAuthority: z.string().trim().min(1).max(400),
    augmentationBeforeSubstitution: z.string().trim().min(1).max(400),
    epistemicClarity: z.string().trim().min(1).max(400),
    explicitDelegation: z.string().trim().min(1).max(400),
    translationBoundary: z.string().trim().min(1).max(400),
  })
  .strict();

export interface HlamtRuntimeProjection {
  sourcePath: typeof HLAMT_RUNTIME_PROJECTION_SOURCE_PATH;
  version: string;
  content: string;
  fingerprint: string;
}

function fingerprint(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function readProjectionJson(rawText: string): unknown {
  const start = rawText.indexOf(START_MARKER);
  const end = rawText.indexOf(END_MARKER);

  if (start < 0 || end < 0 || end <= start) {
    throw new Error("HLAMT.md requires one bounded stable runtime projection");
  }

  const boundedBlock = rawText
    .slice(start + START_MARKER.length, end)
    .trim()
    .replace(/^```json\s*/u, "")
    .replace(/\s*```$/u, "");

  try {
    return JSON.parse(boundedBlock) as unknown;
  } catch {
    throw new Error("HLAMT.md stable runtime projection must be valid JSON");
  }
}

function assembleContent(source: z.infer<typeof ProjectionSourceSchema>): string {
  return [
    `System purpose: ${source.systemPurpose}`,
    `Human authority: ${source.humanAuthority}`,
    `Augmentation before substitution: ${source.augmentationBeforeSubstitution}`,
    `Epistemic clarity: ${source.epistemicClarity}`,
    `Explicit delegation: ${source.explicitDelegation}`,
    `Translation boundary: ${source.translationBoundary}`,
  ].join("\n");
}

export function loadHlamtRuntimeProjection(
  projectRoot: string,
): HlamtRuntimeProjection {
  const rawText = readFileSync(
    resolve(projectRoot, HLAMT_RUNTIME_PROJECTION_SOURCE_PATH),
    "utf8",
  );
  const parsed = ProjectionSourceSchema.safeParse(readProjectionJson(rawText));

  if (!parsed.success) {
    throw new Error("HLAMT.md stable runtime projection has an invalid schema");
  }

  const content = assembleContent(parsed.data);

  if (content.length > HLAMT_RUNTIME_PROJECTION_MAX_LENGTH) {
    throw new Error("HLAMT.md stable runtime projection exceeds its length boundary");
  }

  return {
    sourcePath: HLAMT_RUNTIME_PROJECTION_SOURCE_PATH,
    version: parsed.data.version,
    content,
    fingerprint: fingerprint(content),
  };
}
