import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EliyNativeRuntime } from "../runtime.js";
import { LocalRuntimeStore } from "../stores/local-store.js";
import { loadHacAgentGovernance } from "../policies/hac-agent.js";
import { loadHlamtContext } from "../loaders/hlamt-loader.js";
import { createRuntimeResult } from "../result/index.js";
import { transitionOtUnitStatus } from "../state/otunit-state-machine.js";

function createProjectRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "eliy-native-"));
  writeFileSync(join(root, "HAC_AGENT.md"), `# HAC-Agent Governance\n\n- require_confirmation_for_writes: true\n`);
  writeFileSync(join(root, "HLAMT.md"), `# HLAMT.md\n\nRuntime Asset hypothesis for human intelligence augmentation context.\n`);
  return root;
}

describe("Eliy Native Runtime Kernel", () => {
  let projectRoot: string;
  let runtime: EliyNativeRuntime;

  beforeEach(() => {
    projectRoot = createProjectRoot();
    runtime = new EliyNativeRuntime(projectRoot, {
      now: () => "2026-06-30T00:00:00.000Z",
      idFactory: (prefix) => `${prefix}_test`,
      actorId: "rich"
    });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("loads HAC-Agent governance and HLAMT context", () => {
    const governance = loadHacAgentGovernance(projectRoot);
    const hlamt = loadHlamtContext(projectRoot);

    expect(governance.require_confirmation_for_writes).toBe(true);
    expect(governance.audit_critical_transitions).toBe(true);
    expect(hlamt.used_hlamt_context).toBe(true);
    expect(hlamt.hlamt_context_summary.length).toBeGreaterThan(0);
  });

  it("keeps workspaces isolated on disk", () => {
    const store = new LocalRuntimeStore(projectRoot);
    expect(store.workspaceDir("workspace_a")).toContain("data/workspaces/workspace_a");
    expect(store.workspaceDir("workspace_b")).toContain("data/workspaces/workspace_b");
    expect(store.workspaceDir("workspace_a")).not.toEqual(store.workspaceDir("workspace_b"));

    store.writeWorkspace({
      workspace_id: "workspace_a",
      name: "A",
      status: "active",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z"
    });
    store.writeWorkspace({
      workspace_id: "workspace_b",
      name: "B",
      status: "active",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z"
    });

    expect(store.readWorkspace("workspace_a")?.name).toBe("A");
    expect(store.readWorkspace("workspace_b")?.name).toBe("B");
  });

  it("creates a workspace, objective, OTUnit, evidence, review, adjust and audit trail", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const currentWorkspace = runtime.currentWorkspace();
    expect(currentWorkspace.data!.workspace?.workspace_id).toBe(workspaceId);

    expect(runtime.store.readPolicy(workspaceId)).not.toBeNull();
    expect(runtime.hacGovernance.require_confirmation_for_writes).toBe(true);
    expect(runtime.hlamtContext.used_hlamt_context).toBe(true);

    const objectiveResult = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      period: "2026-07-01:2026-09-30",
      workspace_id: workspaceId,
      confirmed: true
    });
    const objectiveId = objectiveResult.data!.objective!.objective_id;
    const otunitResult = runtime.createOtUnit({
      objective_id: objectiveId,
      title: "完成第一批体验客户访谈",
      owner_id: "rich",
      review_at: "2026-07-15",
      workspace_id: workspaceId,
      company_id: workspaceResult.data!.company.company_id,
      confirmed: true
    });
    const otunitId = otunitResult.data!.otunit!.otunit_id;

    expect(runtime.updateOtUnitStatus(otunitId, "accepted", workspaceId, true).ok).toBe(true);

    const followup = runtime.followUpOtUnit({
      otunit_id: otunitId,
      text: "今天完成 3 位客户访谈",
      workspace_id: workspaceId
    });
    const candidateId = followup.data!.candidate.candidate_id;
    expect(followup.data!.otunit.follow_up_records).toHaveLength(1);

    const evidence = runtime.confirmEvidence(candidateId, "rich", workspaceId);
    expect(evidence.data!.evidence.linked_otunit_ids).toContain(otunitId);
    expect(evidence.data!.otunit.evidence_refs).toContain(evidence.data!.evidence.evidence_id);

    const review = runtime.createReview(otunitId, workspaceId, true);
    expect(review.data!.review!.evidence_ids).toHaveLength(1);
    expect(review.data!.otunit!.status).toBe("checking");

    const adjust = runtime.applyAdjust(review.data!.adjust!.adjust_id, workspaceId, true);
    expect(adjust.data!.adjust!.status).toBe("applied");
    expect(adjust.data!.otunit!.status).toBe("completed");

    const closed = runtime.closeOtUnit(otunitId, "已完成并形成下一步建议", workspaceId, true);
    expect(closed.data!.otunit!.status).toBe("closed");

    const objectiveStatus = runtime.updateObjectiveAchievement(objectiveId, "Demo loop complete", workspaceId, true);
    expect(objectiveStatus.data!.objective!.status).toBe("achieved");
    expect(runtime.listAudit(workspaceId).data!.audit.length).toBeGreaterThan(0);
  });

  it("does not persist an unconfirmed objective candidate", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;

    const result = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId
    });

    expect(result.requires_confirmation).toBe(true);
    expect(result.confirmation_action).toMatchObject({ action: "create_objective" });
    expect(result.candidates).toHaveLength(1);
    expect(runtime.store.listObjectives(workspaceId)).toHaveLength(0);
  });

  it("persists an objective after explicit confirmation", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;

    const result = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any);

    expect(result.requires_confirmation).toBe(false);
    expect(result.data!.objective!.title).toBe("Q3 收入目标");
    expect(runtime.store.listObjectives(workspaceId)).toHaveLength(1);
  });

  it("does not persist an unconfirmed OTUnit candidate", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const objective = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.objective!;

    const result = runtime.createOtUnit({
      objective_id: objective.objective_id,
      title: "完成第一批体验客户访谈",
      owner_id: "rich",
      workspace_id: workspaceId
    });

    expect(result.requires_confirmation).toBe(true);
    expect(result.confirmation_action).toMatchObject({ action: "create_otunit" });
    expect(result.candidates).toHaveLength(1);
    expect(runtime.store.listOtUnits(workspaceId)).toHaveLength(0);
  });

  it("does not persist a required-confirmation OTUnit status transition without confirmation", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const objective = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.objective!;
    const otunit = runtime.createOtUnit({
      objective_id: objective.objective_id,
      title: "完成第一批体验客户访谈",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.otunit!;
    const auditBefore = runtime.store.readAuditLog(workspaceId).length;

    const result = runtime.updateOtUnitStatus(otunit.otunit_id, "accepted", workspaceId);

    expect(result.requires_confirmation).toBe(true);
    expect(result.confirmation_action).toMatchObject({ action: "update_otunit_status" });
    expect(result.data!.proposal).toMatchObject({ from: "proposed", to: "accepted" });
    expect(runtime.store.readOtUnit(workspaceId, otunit.otunit_id)?.status).toBe("proposed");
    expect(runtime.store.readAuditLog(workspaceId)).toHaveLength(auditBefore);
  });

  it("persists and audits a confirmed OTUnit status transition", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const objective = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.objective!;
    const otunit = runtime.createOtUnit({
      objective_id: objective.objective_id,
      title: "完成第一批体验客户访谈",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.otunit!;
    const auditBefore = runtime.store.readAuditLog(workspaceId).length;

    const result = runtime.updateOtUnitStatus(otunit.otunit_id, "accepted", workspaceId, true);

    expect(result.requires_confirmation).toBe(false);
    expect(runtime.store.readOtUnit(workspaceId, otunit.otunit_id)?.status).toBe("accepted");
    expect(runtime.store.readAuditLog(workspaceId)).toHaveLength(auditBefore + 1);
  });

  it("does not persist an applied adjust when validation fails", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const objective = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.objective!;
    const otunit = runtime.createOtUnit({
      objective_id: objective.objective_id,
      title: "完成第一批体验客户访谈",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.otunit!;
    const adjustId = "adjust_invalid";
    runtime.store.writeAdjust({
      adjust_id: adjustId,
      workspace_id: workspaceId,
      company_id: workspaceResult.data!.company.company_id,
      objective_id: objective.objective_id,
      otunit_id: otunit.otunit_id,
      review_id: "review_invalid",
      proposal: "Invalid transition proposal",
      status: "proposed",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
      confirmed_at: null,
      applied_at: null
    } as any);
    const auditBefore = runtime.store.readAuditLog(workspaceId).length;

    const result = runtime.applyAdjust(adjustId, workspaceId, true);

    expect(result.ok).toBe(false);
    expect(runtime.store.readAdjust(workspaceId, adjustId)?.status).toBe("proposed");
    expect(runtime.store.readOtUnit(workspaceId, otunit.otunit_id)?.status).toBe("proposed");
    expect(runtime.store.readAuditLog(workspaceId)).toHaveLength(auditBefore);
  });

  it("does not persist evidence when the linked OTUnit is missing", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const objective = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.objective!;
    const candidate = runtime.store.writeEvidenceCandidate({
      candidate_id: "candidate_missing_otunit",
      workspace_id: workspaceId,
      company_id: workspaceResult.data!.company.company_id,
      objective_id: objective.objective_id,
      otunit_id: "otunit_missing",
      source_type: "otunit_followup",
      source_ref: "otunit_missing",
      content: "今天完成 3 位客户访谈",
      captured_at: "2026-06-30T00:00:00.000Z",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z"
    });
    const auditBefore = runtime.store.readAuditLog(workspaceId).length;

    const result = runtime.confirmEvidence(candidate.candidate_id, "rich", workspaceId);

    expect(result.ok).toBe(false);
    expect(runtime.store.listEvidence(workspaceId)).toHaveLength(0);
    expect(runtime.store.readAuditLog(workspaceId)).toHaveLength(auditBefore);
  });

  it("persists an OTUnit after explicit confirmation", () => {
    const workspaceResult = runtime.createWorkspace({ name: "Demo Workspace", company: "Demo Company" });
    const workspaceId = workspaceResult.data!.workspace.workspace_id;
    const objective = runtime.createObjective({
      title: "Q3 收入目标",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any).data!.objective!;

    const result = runtime.createOtUnit({
      objective_id: objective.objective_id,
      title: "完成第一批体验客户访谈",
      owner_id: "rich",
      workspace_id: workspaceId,
      confirmed: true
    } as any);

    expect(result.requires_confirmation).toBe(false);
    expect(result.data!.otunit!.title).toBe("完成第一批体验客户访谈");
    expect(runtime.store.listOtUnits(workspaceId)).toHaveLength(1);
  });

  it("writes SkillRunLog entries during the terminal proof", () => {
    const proof = runtime.runTerminalProof();
    const skillRuns = runtime.store.readSkillRuns(proof.workspace_id!);

    expect(skillRuns.length).toBeGreaterThanOrEqual(2);
    expect(skillRuns.map((run) => run.skill_name)).toEqual(
      expect.arrayContaining(["evidence-extract", "review"])
    );
    expect(proof.data!.skill_runs.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps HAC governance and HLAMT usage on audit logs", () => {
    const proof = runtime.runTerminalProof();
    const audit = runtime.store.readAuditLog(proof.workspace_id!);

    expect(audit.length).toBeGreaterThan(0);
    expect(audit.every((entry) => entry.used_hac_governance)).toBe(true);
    expect(audit.every((entry) => entry.used_hlamt_context)).toBe(true);
  });

  it("enforces the OTUnit state machine", () => {
    expect(transitionOtUnitStatus("proposed", "accepted").ok).toBe(true);
    expect(transitionOtUnitStatus("accepted", "blocked").ok).toBe(false);
    expect(transitionOtUnitStatus("completed", "closed").ok).toBe(true);
  });

  it("creates a valid RuntimeResult shape", () => {
    const result = createRuntimeResult({
      command: "demo",
      workspace_id: "workspace_test",
      data: { ok: true },
      audit_ids: ["audit_test"],
      used_hac_governance: true,
      used_hlamt_context: true,
      created_at: "2026-06-30T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(result.command).toBe("demo");
    expect(result.audit_ids).toEqual(["audit_test"]);
    expect(result.used_hac_governance).toBe(true);
    expect(result.used_hlamt_context).toBe(true);
  });

  it("runs the terminal proof end to end", () => {
    const proof = runtime.runTerminalProof();
    expect(proof.ok).toBe(true);
    expect(proof.data!.workspace.workspace_id).toContain("workspace_");
    expect(proof.data!.otunit.status).toBe("closed");
    expect(proof.data!.objective.status).toBe("achieved");
    expect(proof.data!.audit.length).toBeGreaterThan(0);
  });
});
