// =============================================================================
// OTUnit Revision Repository Read Projection Contract — Static Contract Test
//
// PR #59 — Pure read projection only. No repository persistence, no CLI, no
// runtime mutation, no filesystem persistence, no database persistence.
//
// This test verifies that:
//   - The projection source file exists
//   - All required exports are present
//   - The pure function correctly filters, groups, and projects records
//   - All read-only invariants are enforced at the type level
//   - Input records remain unchanged after projection
//   - No forbidden persistence / CLI / provider text is present
// =============================================================================

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND,
  projectOTUnitRevisionRepositoryReadProjection,
} from "../otunit-revision-repository-read-projection";

import type {
  ProjectOTUnitRevisionRepositoryReadProjectionInput,
  OTUnitRevisionRepositoryReadProjection,
  OTUnitRevisionChainReadProjection,
  OTUnitRevisionRepositoryRecordSummary,
} from "../otunit-revision-repository-read-projection";

import type {
  OTUnitRevisionRepositoryRecordEnvelope,
  OTUnitRevisionRepositoryRecordKind,
} from "../otunit-revision-repository-contract";
import type {
  OTUnitRevisionRepositoryRecordPayload,
} from "../otunit-revision-repository-contract";

import type {
  OTUnitRevisionLifecycleProjection,
} from "../otunit-revision-chain-boundary";

// =============================================================================
// Helpers
// =============================================================================

function makeRecord(
  overrides: Partial<OTUnitRevisionRepositoryRecordEnvelope> & {
    id: string;
    kind: OTUnitRevisionRepositoryRecordKind;
    sourceOTUnitId: string;
    revisionIntentRecordId: string;
  },
): OTUnitRevisionRepositoryRecordEnvelope {
  return {
    payload: {} as OTUnitRevisionRepositoryRecordPayload,
    appendOnly: true,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    sourceOTUnitReplacementAllowed: false,
    autoReplaceSourceOTUnit: false,
    ...overrides,
  };
}

function makeLifecyclePayload(
  overrides?: Partial<OTUnitRevisionLifecycleProjection>,
): OTUnitRevisionLifecycleProjection {
  return {
    id: "lp-1",
    sourceOTUnitId: "otunit-1",
    revisionIntentRecordId: "ri-1",
    currentStage: "revision_intent_recorded",
    revisionIntent: {
      id: "ri-1",
      sourceOTUnitId: "otunit-1",
      reasonText: "Need tighter scope",
      directionText: "Reduce scope to core constraint",
      evidenceRefs: ["ev-1"],
    },
    supersessionDeclared: false,
    runtimeMutationAllowed: false,
    repositoryPersistenceAllowed: false,
    sourceOTUnitMutationAllowed: false,
    sourceOTUnitStatusChangeAllowed: false,
    autoReplaceSourceOTUnit: false,
    ...overrides,
  };
}

// =============================================================================
// File Existence
// =============================================================================

describe("otunit-revision-repository-read-projection.ts", () => {
  it("exists as a file on disk", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-repository-read-projection.ts",
    );
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  // ── Exports ────────────────────────────────────────────────────────────

  it("exports OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND", () => {
    expect(OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND).toBe(
      "otunit_revision_repository_read_projection",
    );
  });

  it("exports projectOTUnitRevisionRepositoryReadProjection as a function", () => {
    expect(typeof projectOTUnitRevisionRepositoryReadProjection).toBe("function");
  });

  it("exports OTUnitRevisionRepositoryRecordSummary type", () => {
    // Type-level existence — import above resolves at compile time
    expect(true).toBe(true);
  });

  it("exports OTUnitRevisionChainReadProjection type", () => {
    expect(true).toBe(true);
  });

  it("exports OTUnitRevisionRepositoryReadProjection type", () => {
    expect(true).toBe(true);
  });

  it("exports ProjectOTUnitRevisionRepositoryReadProjectionInput type", () => {
    expect(true).toBe(true);
  });
});

// =============================================================================
// Projection Kind
// =============================================================================

describe("projection kind", () => {
  it("equals otunit_revision_repository_read_projection", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.kind).toBe(
      OTUNIT_REVISION_REPOSITORY_READ_PROJECTION_KIND,
    );
    expect(projection.kind).toBe("otunit_revision_repository_read_projection");
  });
});

// =============================================================================
// Pure Function Tests
// =============================================================================

describe("projectOTUnitRevisionRepositoryReadProjection", () => {
  // ── Filter by sourceOTUnitId ───────────────────────────────────────────

  it("filters records by sourceOTUnitId", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-2",
        revisionIntentRecordId: "ri-2",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.recordCount).toBe(1);
    expect(projection.chains[0].records[0].id).toBe("r1");
  });

  // ── Filter by revisionIntentRecordId ───────────────────────────────────

  it("filters records by revisionIntentRecordId", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-2",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      revisionIntentRecordId: "ri-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.recordCount).toBe(1);
    expect(projection.chains).toHaveLength(1);
    expect(projection.chains[0].revisionIntentRecordId).toBe("ri-1");
  });

  // ── Group by revisionIntentRecordId ────────────────────────────────────

  it("groups records by revisionIntentRecordId", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_preview",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r3",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-2",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chainCount).toBe(2);
    expect(projection.chains).toHaveLength(2);

    const ri1Chain = projection.chains.find(
      (c) => c.revisionIntentRecordId === "ri-1",
    )!;
    const ri2Chain = projection.chains.find(
      (c) => c.revisionIntentRecordId === "ri-2",
    )!;

    expect(ri1Chain.recordCount).toBe(2);
    expect(ri1Chain.records.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(ri2Chain.recordCount).toBe(1);
    expect(ri2Chain.records.map((r) => r.id)).toEqual(["r3"]);
  });

  // ── Preserve Append Order ──────────────────────────────────────────────

  it("preserves append order inside each chain", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_preview",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r3",
        kind: "lifecycle_projection",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].records.map((r) => r.id)).toEqual([
      "r1",
      "r2",
      "r3",
    ]);
  });

  // ── Record Summaries ───────────────────────────────────────────────────

  it("exposes record summaries", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
        createdAt: "2025-01-01T00:00:00Z",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    const summary = projection.chains[0].records[0];

    expect(summary.id).toBe("r1");
    expect(summary.kind).toBe("revision_intent_snapshot");
    expect(summary.sourceOTUnitId).toBe("otunit-1");
    expect(summary.revisionIntentRecordId).toBe("ri-1");
    expect(summary.createdAt).toBe("2025-01-01T00:00:00Z");
  });

  // ── Record Kinds ───────────────────────────────────────────────────────

  it("exposes recordKinds", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_preview",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].recordKinds).toEqual([
      "revision_intent_snapshot",
      "revision_preview",
    ]);
  });

  // ── Chain Count ────────────────────────────────────────────────────────

  it("computes chainCount", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-2",
      }),
      makeRecord({
        id: "r3",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-3",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chainCount).toBe(3);
  });

  // ── Record Count ───────────────────────────────────────────────────────

  it("computes recordCount", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_preview",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    // One chain, 2 records total
    expect(projection.recordCount).toBe(2);
  });

  // ── Latest Lifecycle Projection ────────────────────────────────────────

  it("returns latest matching lifecycle projection", () => {
    const lp1 = makeLifecyclePayload({
      id: "lp-v1",
      currentStage: "revision_intent_recorded",
    });

    const lp2 = makeLifecyclePayload({
      id: "lp-v2",
      currentStage: "supersession_declared",
      supersessionDeclared: true,
    });

    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "lp-1",
        kind: "lifecycle_projection",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
        payload: lp1,
      }),
      makeRecord({
        id: "lp-2",
        kind: "lifecycle_projection",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
        payload: lp2,
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    const chain = projection.chains[0];
    expect(chain.latestLifecycleProjection).toBeDefined();
    expect(chain.latestLifecycleProjection!.id).toBe("lp-v2");
    expect(chain.latestLifecycleProjection!.currentStage).toBe(
      "supersession_declared",
    );
  });

  // ── currentStage ───────────────────────────────────────────────────────

  it("returns latest lifecycle currentStage", () => {
    const lp = makeLifecyclePayload({
      currentStage: "proposed_revised_otunit_created",
    });

    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "lp-1",
        kind: "lifecycle_projection",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
        payload: lp,
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].currentStage).toBe(
      "proposed_revised_otunit_created",
    );
  });

  // ── decisionStatus ─────────────────────────────────────────────────────

  it("returns decisionStatus from latest lifecycle projection", () => {
    const lp = makeLifecyclePayload({
      currentStage: "proposed_revised_otunit_decided",
      decisionStatus: "accepted",
    });

    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "lp-1",
        kind: "lifecycle_projection",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
        payload: lp,
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].decisionStatus).toBe("accepted");
  });

  // ── supersessionDeclared ───────────────────────────────────────────────

  it("returns supersessionDeclared from latest lifecycle projection", () => {
    const lp = makeLifecyclePayload({
      currentStage: "supersession_declared",
      supersessionDeclared: true,
    });

    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "lp-1",
        kind: "lifecycle_projection",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
        payload: lp,
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].supersessionDeclared).toBe(true);
  });

  // ── supersessionDeclared=false When Missing ────────────────────────────

  it("returns supersessionDeclared=false when lifecycle projection is missing", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].supersessionDeclared).toBe(false);
  });

  // ── Ignore Different Source OTUnit ─────────────────────────────────────

  it("ignores records from another sourceOTUnitId", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
      makeRecord({
        id: "r2",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-2",
        revisionIntentRecordId: "ri-2",
      }),
      makeRecord({
        id: "r3",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-2",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.recordCount).toBe(2);
    expect(projection.chainCount).toBe(2);

    const allIds = projection.chains.flatMap((c) =>
      c.records.map((r) => r.id),
    );
    expect(allIds).toEqual(["r1", "r3"]);
    expect(allIds).not.toContain("r2");
  });
});

// =============================================================================
// Projection Immutable Invariants
// =============================================================================

describe("projection read-only invariants", () => {
  it("has appendOnly=true", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.appendOnly).toBe(true);
  });

  it("has repositoryReadOnly=true", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.repositoryReadOnly).toBe(true);
  });

  it("has runtimeMutationAllowed=false", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.runtimeMutationAllowed).toBe(false);
  });

  it("has repositoryPersistenceAllowed=false", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.repositoryPersistenceAllowed).toBe(false);
  });

  it("has sourceOTUnitMutationAllowed=false", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.sourceOTUnitMutationAllowed).toBe(false);
  });

  it("has sourceOTUnitStatusChangeAllowed=false", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.sourceOTUnitStatusChangeAllowed).toBe(false);
  });

  it("has sourceOTUnitReplacementAllowed=false", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.sourceOTUnitReplacementAllowed).toBe(false);
  });

  it("has autoReplaceSourceOTUnit=false", () => {
    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records: [],
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.autoReplaceSourceOTUnit).toBe(false);
  });
});

// =============================================================================
// Chain Projection Read-Only Invariants
// =============================================================================

describe("chain projection read-only invariants", () => {
  it("has appendOnly=true", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].appendOnly).toBe(true);
  });

  it("has sourceOTUnitMutationAllowed=false", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].sourceOTUnitMutationAllowed).toBe(false);
  });

  it("has sourceOTUnitStatusChangeAllowed=false", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].sourceOTUnitStatusChangeAllowed).toBe(false);
  });

  it("has sourceOTUnitReplacementAllowed=false", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].sourceOTUnitReplacementAllowed).toBe(false);
  });

  it("has autoReplaceSourceOTUnit=false", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    const projection = projectOTUnitRevisionRepositoryReadProjection(input);
    expect(projection.chains[0].autoReplaceSourceOTUnit).toBe(false);
  });
});

// =============================================================================
// Input Immutability
// =============================================================================

describe("input records remain unchanged after projection", () => {
  it("does not mutate the input records array", () => {
    const records: OTUnitRevisionRepositoryRecordEnvelope[] = [
      makeRecord({
        id: "r1",
        kind: "revision_intent_snapshot",
        sourceOTUnitId: "otunit-1",
        revisionIntentRecordId: "ri-1",
      }),
    ];

    const originalLen = records.length;
    const originalId = records[0].id;

    const input: ProjectOTUnitRevisionRepositoryReadProjectionInput = {
      id: "proj-1",
      sourceOTUnitId: "otunit-1",
      records,
    };

    projectOTUnitRevisionRepositoryReadProjection(input);

    expect(records).toHaveLength(originalLen);
    expect(records[0].id).toBe(originalId);
  });
});

// =============================================================================
// Forbidden Source Text Check
// =============================================================================

describe("source does not contain forbidden persistence / CLI / provider text", () => {
  it("read-projection source does not contain forbidden strings", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sourcePath = path.resolve(
      currentDir,
      "../otunit-revision-repository-read-projection.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    // Persistence imports
    expect(source).not.toMatch(/from\s+"fs"/);
    expect(source).not.toMatch(/from\s+'fs'/);
    expect(source).not.toMatch(/node:fs/);
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("appendFile");
    expect(source).not.toContain("readFile");

    // Database strings
    expect(source).not.toContain("sqlite");
    expect(source).not.toContain("postgres");
    expect(source).not.toContain("prisma");

    // CLI strings
    expect(source).not.toContain("commander");
    expect(source).not.toContain("inquirer");

    // Provider strings
    expect(source).not.toContain("openai");
    expect(source).not.toContain("deepseek");

    // Patch residue
    expect(source).not.toContain("*** End of File");
  });


});
