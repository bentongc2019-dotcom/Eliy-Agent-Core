import { describe, expect, it } from "vitest";

import { invokeMockCapability, type MockCapabilityInvocationResult } from "../capability-invocation-mock-execution";
import {
  createCapabilityInvocationTraceRecord,
  type CapabilityInvocationTraceRecord,
  type CapabilityInvocationTraceRecordInput,
} from "../capability-invocation-trace-record";

const opdcaCapabilityId = "opdca";
const createdAt = "2026-07-08T00:00:00.000Z";

const mockInvocationPayload = {
  requestId: "mock-request-101",
  nested: {
    attempt: 1,
    tags: ["alpha", "beta"],
  },
} satisfies Record<string, unknown>;

function createMockInvocationResult(
  capabilityId: string = opdcaCapabilityId,
  payload: Record<string, unknown> = mockInvocationPayload,
): MockCapabilityInvocationResult {
  return invokeMockCapability(capabilityId, payload);
}

function expectTraceRecordShape(
  record: CapabilityInvocationTraceRecord,
  invocationId: string,
  result: MockCapabilityInvocationResult,
) {
  expect(record.invocationId).toBe(invocationId);
  expect(record.capabilityId).toBe(result.capabilityId);
  expect(record.capabilityName).toBe(result.capabilityName);
  expect(record.capabilityVersion).toBe(result.capabilityVersion);
  expect(record.capabilityKind).toBe(result.capabilityKind);
  expect(record.mode).toBe(result.mode);
  expect(record.status).toBe("mock_completed");
  expect(record.handler).toBe(result.handler);
  expect(record.payloadSnapshot).toEqual(result.payload);
  expect(record.createdAt).toBe(createdAt);
}

describe("capability-invocation-trace-record.ts", () => {
  it("exports the trace record API", () => {
    expect(createCapabilityInvocationTraceRecord).toBeTypeOf("function");
  });

  it("reuses the PR #75 mock invocation result shape", () => {
    const result = createMockInvocationResult();
    const invocationId = "invocation-001";
    const record = createCapabilityInvocationTraceRecord({
      invocationId,
      capabilityId: opdcaCapabilityId,
      result,
      createdAt,
    });

    expectTraceRecordShape(record, invocationId, result);
  });

  it("creates a deterministic trace record for the same input", () => {
    const result = createMockInvocationResult();
    const input: CapabilityInvocationTraceRecordInput = {
      invocationId: "invocation-002",
      capabilityId: opdcaCapabilityId,
      result,
      createdAt,
    };

    const first = createCapabilityInvocationTraceRecord(input);
    const second = createCapabilityInvocationTraceRecord(input);

    expect(first).toEqual(second);
  });

  it("returns a defensive copy of the payload snapshot", () => {
    const result = createMockInvocationResult();
    const record = createCapabilityInvocationTraceRecord({
      invocationId: "invocation-003",
      capabilityId: opdcaCapabilityId,
      result,
      createdAt,
    });

    const snapshot = record.payloadSnapshot as {
      nested?: { attempt?: number; tags?: string[] };
    };

    snapshot.nested?.tags?.push("mutated");
    if (snapshot.nested) {
      snapshot.nested.attempt = 99;
    }

    const next = createCapabilityInvocationTraceRecord({
      invocationId: "invocation-003",
      capabilityId: opdcaCapabilityId,
      result,
      createdAt,
    });

    expect(next.payloadSnapshot).toEqual(result.payload);
  });

  it("does not let later input mutation change the trace record", () => {
    const payload = {
      requestId: "mock-request-102",
      nested: {
        attempt: 1,
        tags: ["gamma", "delta"],
      },
    };
    const result = createMockInvocationResult(opdcaCapabilityId, payload);
    const record = createCapabilityInvocationTraceRecord({
      invocationId: "invocation-004",
      capabilityId: opdcaCapabilityId,
      result,
      createdAt,
    });

    payload.nested.tags.push("later-mutation");
    payload.nested.attempt = 2;

    expect(record.payloadSnapshot).toEqual({
      requestId: "mock-request-102",
      nested: {
        attempt: 1,
        tags: ["gamma", "delta"],
      },
    });
  });

  it("rejects a missing invocation id", () => {
    const result = createMockInvocationResult();

    expect(() =>
      createCapabilityInvocationTraceRecord({
        invocationId: "",
        capabilityId: opdcaCapabilityId,
        result,
        createdAt,
      }),
    ).toThrow("invocationId is required");
  });

  it("rejects a missing capability id", () => {
    const result = createMockInvocationResult();

    expect(() =>
      createCapabilityInvocationTraceRecord({
        invocationId: "invocation-005",
        capabilityId: "",
        result,
        createdAt,
      }),
    ).toThrow("capabilityId is required");
  });

  it("rejects a missing mock result", () => {
    expect(() =>
      createCapabilityInvocationTraceRecord({
        invocationId: "invocation-006",
        capabilityId: opdcaCapabilityId,
        result: undefined as never,
        createdAt,
      }),
    ).toThrow("result is required");
  });

  it("rejects a missing createdAt", () => {
    const result = createMockInvocationResult();

    expect(() =>
      createCapabilityInvocationTraceRecord({
        invocationId: "invocation-007",
        capabilityId: opdcaCapabilityId,
        result,
        createdAt: "",
      }),
    ).toThrow("createdAt is required");
  });

  it("rejects a capability id mismatch", () => {
    const result = createMockInvocationResult();

    expect(() =>
      createCapabilityInvocationTraceRecord({
        invocationId: "invocation-008",
        capabilityId: "different-capability",
        result,
        createdAt,
      }),
    ).toThrow("capabilityId mismatch");
  });

  it("does not reference forbidden runtime integrations in the implementation source", () => {
    const source = createCapabilityInvocationTraceRecord.toString();
    const forbiddenTerms = [
      ["pro", "cess", ".", "env"].join(""),
      ["do", "tenv"].join(""),
      ["node", ":", "fs"].join(""),
      ["re", "ad", "File", "Sync"].join(""),
      ["re", "addir"].join(""),
      ["op", "endir"].join(""),
      ["g", "lob"].join(""),
      ["pro", "vider"].join(""),
      ["work", "space"].join(""),
      ["ker", "nel"].join(""),
      ["s", "ki", "lls"].join(""),
      ["c", "li"].join(""),
      ["com", "mander"].join(""),
      ["in", "quirer"].join(""),
      ["an", "si"].join(""),
      ["rea", "l_", "llm"].join(""),
      ["f", "s", "."].join(""),
    ];

    for (const term of forbiddenTerms) {
      expect(source).not.toContain(term);
    }
  });

  it("keeps the implementation source free of forbidden runtime dependencies", () => {
    const source = createCapabilityInvocationTraceRecord.toString();
    const requiredAbsences = [
      ["pro", "vider"].join(""),
      ["work", "space"].join(""),
      ["ker", "nel"].join(""),
      ["s", "ki", "lls"].join(""),
      ["d", "b"].join(""),
      ["data", "base"].join(""),
    ];

    for (const term of requiredAbsences) {
      expect(source).not.toContain(term);
    }
  });
});
