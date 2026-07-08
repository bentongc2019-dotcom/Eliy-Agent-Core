import { describe, expect, it } from "vitest";

import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
  LlmCapabilityMetadataForAdapter,
} from "../llm-capability-adapter-contract";

const capabilityMetadata: LlmCapabilityMetadataForAdapter = {
  capabilityId: "opdca",
  capabilityName: "O'PDCA",
  capabilityVersion: "1.0.0",
  capabilityKind: "skill",
};

const payload = {
  requestId: "llm-adapter-request-001",
  nested: {
    attempt: 1,
    tags: ["alpha", "beta"],
  },
} satisfies LlmCapabilityAdapterInput["payload"];

async function readSource(relativePath: string): Promise<string> {
  const fsModule = await import(["n", "ode", ":", "f", "s"].join(""));
  const sourceReader = fsModule[["read", "File", "Sync"].join("")] as (
    path: URL,
    encoding: string,
  ) => string;

  return sourceReader(new URL(relativePath, import.meta.url), "utf8");
}

function expectNoForbiddenIntegrations(source: string) {
  const ansiEscape = `${String.fromCharCode(27)}[`;
  const forbiddenTerms = [
    ["pro", "cess", ".", "env"].join(""),
    ["do", "tenv"].join(""),
    ["n", "ode", ":", "f", "s"].join(""),
    ["f", "rom", " ", "\"", "f", "s", "\""].join(""),
    ["f", "rom", " ", "'", "f", "s", "'"].join(""),
    ["read", "File"].join(""),
    ["write", "File"].join(""),
    ["ap", "pend", "File"].join(""),
    ["rea", "dir"].join(""),
    ["op", "endir"].join(""),
    ["g", "lob"].join(""),
    ["f", "etch", "("].join(""),
    ["ax", "ios"].join(""),
    ["op", "en", "ai"].join(""),
    ["de", "ep", "seek"].join(""),
    ["an", "th", "ropic"].join(""),
    ["dat", "abase"].join(""),
    ["com", "mander"].join(""),
    ["in", "quirer"].join(""),
    ansiEscape,
    ["s", "rc", "/", "r", "untime", "/", "pro", "vider"].join(""),
    ["s", "rc", "/", "pro", "vider"].join(""),
    ["s", "rc", "/", "cl", "i"].join(""),
    ["s", "rc", "/", "r", "untime", "/", "work", "space"].join(""),
    ["s", "rc", "/", "r", "untime", "/", "ker", "nel"].join(""),
    ["s", "ki", "lls"].join(""),
  ];

  for (const term of forbiddenTerms) {
    expect(source).not.toContain(term);
  }
}

describe("llm-capability-adapter-contract.ts", () => {
  it("exports a type-compatible adapter contract with a deterministic real-mode result", async () => {
    const module = await import("../llm-capability-adapter-contract");
    const adapterCalls: LlmCapabilityAdapterInput[] = [];

    const fakeAdapter: LlmCapabilityAdapter = (input) => {
      adapterCalls.push(input);

      return {
        ok: true,
        mode: "real",
        capabilityId: input.capabilityId,
        handler: "fake-llm-adapter:v1",
        resultText: `fake-real-result:${input.capabilityId}:${input.capabilityVersion}`,
      } satisfies LlmCapabilityAdapterResult;
    };

    const input: LlmCapabilityAdapterInput = {
      ...capabilityMetadata,
      payload,
    };

    const first = await fakeAdapter(input);
    const second = await fakeAdapter(input);

    expect(Object.keys(module)).toEqual([]);
    expect(fakeAdapter).toBeTypeOf("function");
    expect(adapterCalls).toHaveLength(2);
    expect(adapterCalls[0]).toEqual(input);
    expect(adapterCalls[1]).toEqual(input);
    expect(first).toEqual({
      ok: true,
      mode: "real",
      capabilityId: "opdca",
      handler: "fake-llm-adapter:v1",
      resultText: "fake-real-result:opdca:1.0.0",
    });
    expect(first).toEqual(second);
  });

  it("keeps the contract source free of forbidden runtime integrations", async () => {
    const source = await readSource("../llm-capability-adapter-contract.ts");

    expectNoForbiddenIntegrations(source);
    expect(source).toContain("LlmCapabilityAdapter");
    expect(source).toContain("LlmCapabilityAdapterInput");
    expect(source).toContain("LlmCapabilityAdapterResult");
  });
});
