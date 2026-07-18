import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readSourceOrEmpty(relativePath: string): string {
  try {
    return readFileSync(new URL(relativePath, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

function expectNoForbiddenIntegrations(source: string): void {
  const forbiddenTerms = [
    ["pro", "cess", ".", "env"].join(""),
    ["n", "ode", ":", "f", "s"].join(""),
    ["read", "File"].join(""),
    ["write", "File"].join(""),
    ["f", "etch", "("].join(""),
    ["de", "ep", "seek"].join(""),
    ["op", "en", "ai"].join(""),
    ["an", "th", "ropic"].join(""),
    ["src", "/", "runtime", "/", "provider"].join(""),
    ["src", "/", "runtime", "/", "kernel"].join(""),
    ["src", "/", "cli"].join(""),
  ];

  for (const term of forbiddenTerms) {
    expect(source).not.toContain(term);
  }
}

describe("capability-execution-context-contract.ts", () => {
  const source = readSourceOrEmpty(
    "../capability-execution-context-contract.ts",
  );

  it("defines a provider-neutral CapabilityExecutionContext contract", () => {
    expect(source).toContain("ResolvedCapabilityAsset");
    expect(source).toContain("HlamtInvocationSnapshot");
    expect(source).toContain("CapabilityExecutionOutputBoundary");
    expect(source).toContain("CapabilityExecutionInvocationMetadata");
    expect(source).toContain("CapabilityExecutionContext");
  });

  it("represents HLAMT as a bounded invocation snapshot", () => {
    expect(source).toContain("sourcePath");
    expect(source).toContain("summary");
    expect(source).toContain("fingerprint");
    expect(source).toContain("injectionRequested");
    expect(source).not.toContain("raw_text");
  });

  it("represents explicit output and mutation boundaries", () => {
    expect(source).toContain("allowedOutputKinds");
    expect(source).toContain("requiresConfirmation");
    expect(source).toContain("canonicalMutationAllowed");
  });

  it("remains contract-only and provider-neutral", () => {
    expectNoForbiddenIntegrations(source);
    expect(source).not.toContain("function ");
    expect(source).not.toContain("class ");
  });
});

describe("LlmCapabilityAdapterInput compatibility", () => {
  const source = readSourceOrEmpty(
    "../llm-capability-adapter-contract.ts",
  );

  it("supports an optional executionContext during migration", () => {
    expect(source).toContain("CapabilityExecutionContext");
    expect(source).toMatch(
      /executionContext\?\s*:\s*CapabilityExecutionContext/,
    );
    expect(source).toContain(
      "payload: Record<string, unknown>",
    );
  });
});
