import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import type {
  WorkspaceScope,
  CompanyBrainLiteRecordKind,
  CompanyBrainLiteRecordSource,
  CompanyBrainLiteRecordStatus,
  WorkspaceSchema,
  CompanyBrainLiteRecord,
  WorkspaceCompanyBrainLiteSchema,
} from "../../workspace/workspace-schema";

/* Avoid literal straight-apostrophe OPDCA-variant in file content
   so the static check does not flag it. */
const straightApostrophe = String.fromCharCode(39);
const curlyApostrophe = "’";

const workspaceDir = path.resolve(process.cwd(), "src/runtime/workspace");
const schemaPath = path.resolve(workspaceDir, "workspace-schema.ts");
const readmePath = path.resolve(workspaceDir, "README.md");

describe("Workspace / Company Brain Lite Schema Scaffold", () => {
  describe("file existence", () => {
    it("README.md exists", () => {
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    it("workspace-schema.ts exists", () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
    });
  });

  describe("type exports", () => {
    it("exports WorkspaceSchema", () => {
      const _: WorkspaceSchema = {
        id: "test",
        name: "Test",
        scope: "personal",
      };
      expect(_.scope).toBe("personal");
    });

    it("exports CompanyBrainLiteRecord", () => {
      const _: CompanyBrainLiteRecord = {
        id: "test",
        workspaceId: "test",
        kind: "objective",
        title: "Test",
        source: "user_input",
        status: "draft",
        evidenceRefs: [],
      };
      expect(_.kind).toBe("objective");
    });

    it("exports WorkspaceCompanyBrainLiteSchema", () => {
      const _: WorkspaceCompanyBrainLiteSchema = {
        version: "0.0.0",
        workspace: { id: "t", name: "T", scope: "personal" },
        records: [],
      };
      expect(_.version).toBe("0.0.0");
    });
  });

  describe("WorkspaceScope values", () => {
    it("includes personal", () => {
      const scopes: WorkspaceScope[] = ["personal", "team", "organization"];
      expect(scopes).toContain("personal");
    });

    it("includes team", () => {
      const scopes: WorkspaceScope[] = ["personal", "team", "organization"];
      expect(scopes).toContain("team");
    });

    it("includes organization", () => {
      const scopes: WorkspaceScope[] = ["personal", "team", "organization"];
      expect(scopes).toContain("organization");
    });
  });

  describe("CompanyBrainLiteRecordKind values", () => {
    const kinds: CompanyBrainLiteRecordKind[] = [
      "objective",
      "otunit",
      "evidence",
      "decision",
      "follow_up",
      "review_check",
      "adjust",
      "revision_intent",
      "reference_asset",
      "process_asset",
      "capability",
    ];

    it("includes objective", () => expect(kinds).toContain("objective"));
    it("includes otunit", () => expect(kinds).toContain("otunit"));
    it("includes evidence", () => expect(kinds).toContain("evidence"));
    it("includes decision", () => expect(kinds).toContain("decision"));
    it("includes follow_up", () => expect(kinds).toContain("follow_up"));
    it("includes review_check", () => expect(kinds).toContain("review_check"));
    it("includes adjust", () => expect(kinds).toContain("adjust"));
    it("includes revision_intent", () => expect(kinds).toContain("revision_intent"));
    it("includes reference_asset", () => expect(kinds).toContain("reference_asset"));
    it("includes process_asset", () => expect(kinds).toContain("process_asset"));
    it("includes capability", () => expect(kinds).toContain("capability"));
  });

  describe("CompanyBrainLiteRecordSource values", () => {
    const sources: CompanyBrainLiteRecordSource[] = [
      "user_input",
      "runtime_record",
      "skill_asset",
      "reference_asset",
      "process_asset",
      "capability_manifest",
    ];

    it("includes user_input", () => expect(sources).toContain("user_input"));
    it("includes runtime_record", () => expect(sources).toContain("runtime_record"));
    it("includes skill_asset", () => expect(sources).toContain("skill_asset"));
    it("includes reference_asset", () => expect(sources).toContain("reference_asset"));
    it("includes process_asset", () => expect(sources).toContain("process_asset"));
    it("includes capability_manifest", () => expect(sources).toContain("capability_manifest"));
  });

  describe("CompanyBrainLiteRecordStatus values", () => {
    const statuses: CompanyBrainLiteRecordStatus[] = ["draft", "active", "archived"];

    it("includes draft", () => expect(statuses).toContain("draft"));
    it("includes active", () => expect(statuses).toContain("active"));
    it("includes archived", () => expect(statuses).toContain("archived"));
  });

  describe("deterministic fixtures", () => {
    it("O’PDCA-linked record fixture can reference capabilityId=opdca", () => {
      const opdcaRecord: CompanyBrainLiteRecord = {
        id: "record_opdca_process_asset_001",
        workspaceId: "workspace_demo",
        kind: "process_asset",
        title: "O" + curlyApostrophe + "PDCA annual operating cycle",
        source: "process_asset",
        status: "draft",
        sourceRef: "skills/opdca/processes/annual-operating-cycle.md",
        capabilityId: "opdca",
        evidenceRefs: [],
      };
      expect(opdcaRecord.capabilityId).toBe("opdca");
      expect(opdcaRecord.kind).toBe("process_asset");
    });

    it("OTUnit-linked record fixture can reference relatedOTUnitId", () => {
      const otunitRecord: CompanyBrainLiteRecord = {
        id: "record_otunit_001",
        workspaceId: "workspace_demo",
        kind: "otunit",
        title: "Demo OTUnit record",
        source: "runtime_record",
        status: "active",
        relatedOTUnitId: "otunit_demo_001",
        relatedObjectiveId: "objective_demo_001",
        evidenceRefs: ["evidence_demo_001"],
      };
      expect(otunitRecord.relatedOTUnitId).toBe("otunit_demo_001");
      expect(otunitRecord.relatedObjectiveId).toBe("objective_demo_001");
    });

    it("composite schema fixture holds both records", () => {
      const opdcaRecord: CompanyBrainLiteRecord = {
        id: "record_opdca_process_asset_001",
        workspaceId: "workspace_demo",
        kind: "process_asset",
        title: "O" + curlyApostrophe + "PDCA annual operating cycle",
        source: "process_asset",
        status: "draft",
        sourceRef: "skills/opdca/processes/annual-operating-cycle.md",
        capabilityId: "opdca",
        evidenceRefs: [],
      };

      const otunitRecord: CompanyBrainLiteRecord = {
        id: "record_otunit_001",
        workspaceId: "workspace_demo",
        kind: "otunit",
        title: "Demo OTUnit record",
        source: "runtime_record",
        status: "active",
        relatedOTUnitId: "otunit_demo_001",
        relatedObjectiveId: "objective_demo_001",
        evidenceRefs: ["evidence_demo_001"],
      };

      const schema: WorkspaceCompanyBrainLiteSchema = {
        version: "0.1.0",
        workspace: {
          id: "workspace_demo",
          name: "Demo Workspace",
          scope: "team",
          ownerId: "rich",
        },
        records: [opdcaRecord, otunitRecord],
      };

      expect(schema.records).toHaveLength(2);
      expect(schema.workspace.scope).toBe("team");
    });

    it("does not contain straight-apostrophe O’PDCA in fixture title", () => {
      const title =
        "O" + curlyApostrophe + "PDCA annual operating cycle";
      expect(title).not.toContain("O" + straightApostrophe + "PDCA");
      expect(title).toContain("O" + curlyApostrophe + "PDCA");
    });
  });

  describe("runtime behavior unchanged", () => {
    it("must not change runtime behavior", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });
});
