import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createEliyRuntimeSystemMessage } from "../../../provider/identity-boundary";
import {
  HLAMT_RUNTIME_PROJECTION_MAX_LENGTH,
  loadHlamtRuntimeProjection,
} from "../../agent/hlamt-runtime-projection";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));

describe("HLAMT stable runtime projection", () => {
  it("loads a bounded, versioned, fingerprinted projection from root HLAMT.md", () => {
    const projection = loadHlamtRuntimeProjection(projectRoot);

    expect(projection.sourcePath).toBe("HLAMT.md");
    expect(projection.version).toBe("1.0.0");
    expect(projection.content).toContain("Human Intelligence Augmentation");
    expect(projection.content).toContain("Human authority");
    expect(projection.content).toContain("Epistemic clarity");
    expect(projection.content).toContain("Explicit delegation");
    expect(projection.content).toContain("Translation boundary");
    expect(projection.content.length).toBeLessThanOrEqual(
      HLAMT_RUNTIME_PROJECTION_MAX_LENGTH,
    );
    expect(projection.fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(projection).not.toHaveProperty("rawText");
  });

  it("does not let HAC_AGENT.md changes alter the stable projection", () => {
    const isolatedRoot = mkdtempSync(join(tmpdir(), "eliy-hlamt-projection-"));
    writeFileSync(
      join(isolatedRoot, "HLAMT.md"),
      readFileSync(join(projectRoot, "HLAMT.md"), "utf8"),
    );
    writeFileSync(join(isolatedRoot, "HAC_AGENT.md"), "first compatibility text");
    const first = loadHlamtRuntimeProjection(isolatedRoot);

    writeFileSync(join(isolatedRoot, "HAC_AGENT.md"), "conflicting replacement text");
    const second = loadHlamtRuntimeProjection(isolatedRoot);

    expect(second).toEqual(first);
  });

  it("assembles identity from the projection without a second principle source", () => {
    const projection = loadHlamtRuntimeProjection(projectRoot);
    const systemMessage = createEliyRuntimeSystemMessage(projection);
    const identitySource = readFileSync(
      join(projectRoot, "src/provider/identity-boundary.ts"),
      "utf8",
    );

    expect(systemMessage).toContain(projection.content);
    expect(systemMessage).toContain(`version=${projection.version}`);
    expect(systemMessage).not.toContain(projection.sourcePath);
    expect(systemMessage).not.toContain(projection.fingerprint);
    expect(identitySource).not.toContain("preserve user agency");
    expect(identitySource).not.toContain("Human-Agency-Centered runtime assistant");
  });
});
