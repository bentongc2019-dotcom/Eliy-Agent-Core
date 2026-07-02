import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../../..");
const docPath = join(projectRoot, "docs/local-real-provider-smoke.md");
const forbiddenPatterns = [
  /sk-/i,
  /Authorization:/i,
  /BEGIN PRIVATE KEY/i
];

function expectNoForbiddenText(text: string): void {
  for (const pattern of forbiddenPatterns) {
    expect(text).not.toMatch(pattern);
  }
}

describe("Local real provider smoke doc", () => {
  it("documents the manual local smoke boundary without secret material", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toMatch(/manual local smoke/i);
    expect(doc).toMatch(/not automated CI/i);
    expect(doc).toMatch(/ELIY_PROVIDER_BASE_URL/);
    expect(doc).toMatch(/ELIY_PROVIDER_API_KEY/);
    expect(doc).toMatch(/ELIY_PROVIDER_MODEL/);
    expect(doc).toMatch(/ELIY_PROVIDER_TIMEOUT_MS/);
    expect(doc).toMatch(/cd eliy-native/);
    expect(doc).toMatch(/printf 'hello\\n\/exit\\n' \| corepack pnpm chat/);
    expect(doc).toMatch(/command used:/i);
    expect(doc).toMatch(/provider enabled: Yes\/No/i);
    expect(doc).toMatch(/response received: Yes\/No/i);
    expect(doc).toMatch(/secret output: No/i);
    expect(doc).toMatch(/package-lock generated: No/i);
    expect(doc).toMatch(/git status:/i);
    expect(doc).toMatch(/do not paste real keys/i);
    expect(doc).toMatch(/optional `ELIY_PROVIDER_TIMEOUT_MS`/i);
    expect(doc).toMatch(/if config is incomplete, it falls back to the deterministic skeleton response/i);
    expect(doc).toMatch(/no deploy/i);
    expect(doc).toMatch(/no PM2 restart/i);
    expectNoForbiddenText(doc);
  });
});
