import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { evidenceExtractCapabilityManifest } from "../../../../skills/evidence-extract/evidence-extract-capability-manifest";
import { assembleCapabilityExecutionContext } from "../capability-execution-context-implementation";
import { invokeCapabilityWithRealLlmBoundary } from "../capability-invocation-real-llm-boundary";
import type { LlmCapabilityAdapter } from "../llm-capability-adapter-contract";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const payload = { input: "bounded input" };

function createContext(injectionRequested = true) {
  return assembleCapabilityExecutionContext({
    projectRoot,
    manifest: evidenceExtractCapabilityManifest,
    payload,
    invocationId: "real-context-001",
    createdAt: "2026-07-18T00:00:00.000Z",
    actor: "agent",
    hlamtInjectionRequested: injectionRequested,
  });
}

function createAdapter(hlamtInjectionVerified: boolean): LlmCapabilityAdapter {
  return async (input) => ({
    ok: true,
    mode: "real",
    capabilityId: input.capabilityId,
    handler: "fake-context-adapter",
    resultText: "fake result",
    invocationEvidence: {
      stableContextInjected: true,
      assetInstructionsInjected: true,
      hlamtInjectionVerified,
      outputBoundaryInjected: true,
      requestFingerprint: `sha256:${"a".repeat(64)}`,
      thinkingMode: "disabled",
      finishReason: "stop",
      contentPresent: true,
      contentLength: 11,
      reasoningContentPresent: false,
    },
  });
}

describe("real execution-context boundary", () => {
  it("rejects requested/verified disagreement", async () => {
    await expect(
      invokeCapabilityWithRealLlmBoundary({
        invocationId: "real-context-001",
        capabilityId: "evidence-extract",
        payload,
        createdAt: "2026-07-18T00:00:00.000Z",
        mode: "real",
        enableRealLlm: true,
        executionContext: createContext(true),
        llmAdapter: createAdapter(false),
      }),
    ).rejects.toThrow("real executionContext HLAMT injection evidence mismatch");
  });

  it("rejects top-level payload mismatch before invoking the adapter", async () => {
    let adapterCalls = 0;
    const adapter: LlmCapabilityAdapter = async (input) => {
      adapterCalls += 1;
      return createAdapter(true)(input);
    };

    await expect(
      invokeCapabilityWithRealLlmBoundary({
        invocationId: "real-context-001",
        capabilityId: "evidence-extract",
        payload: { input: "different" },
        createdAt: "2026-07-18T00:00:00.000Z",
        mode: "real",
        enableRealLlm: true,
        executionContext: createContext(true),
        llmAdapter: adapter,
      }),
    ).rejects.toThrow("real executionContext payload mismatch");

    expect(adapterCalls).toBe(0);
  });

  it("rejects a context that permits a canonical mutation before invoking the adapter", async () => {
    let adapterCalls = 0;
    const adapter: LlmCapabilityAdapter = async (input) => {
      adapterCalls += 1;
      return createAdapter(true)(input);
    };
    const context = createContext(true);
    context.outputBoundary.canonicalMutationAllowed = true;

    await expect(
      invokeCapabilityWithRealLlmBoundary({
        invocationId: "real-context-001",
        capabilityId: "evidence-extract",
        payload,
        createdAt: "2026-07-18T00:00:00.000Z",
        mode: "real",
        enableRealLlm: true,
        executionContext: context,
        llmAdapter: adapter,
      }),
    ).rejects.toThrow("real executionContext requires candidate-only output boundary");

    expect(adapterCalls).toBe(0);
  });
});
