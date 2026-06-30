import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadHacAgentGovernance } from "./policies/hac-agent.js";
import { loadHlamtContext, type HlamtContext } from "./loaders/hlamt-loader.js";
import { runDeterministicSkill } from "./skills/index.js";
import { LocalRuntimeStore } from "./stores/local-store.js";
import { createRuntimeError } from "./errors/index.js";
import { createRuntimeResult } from "./result/index.js";
import {
  type Adjust,
  AdjustSchema,
  type AuditLog,
  type Company,
  type ConfirmationAction,
  type CurrentWorkspace,
  type Evidence,
  EvidenceCandidateSchema,
  type EvidenceCandidate,
  type FollowUpRecord,
  type Membership,
  type Objective,
  ObjectiveSchema,
  ReviewSchema,
  type OTUnit,
  OTUnitSchema,
  type OTUnitStatus,
  type Review,
  type RuntimeError,
  type RuntimePolicy,
  RuntimePolicySchema,
  type RuntimeResult,
  type SessionEvent,
  type SkillRunLog,
  type User,
  type Workspace
} from "./schemas/index.js";
import { transitionOtUnitStatus } from "./state/otunit-state-machine.js";

type RuntimeInit = {
  projectRoot?: string;
  now?: () => string;
  idFactory?: (prefix: string) => string;
  actorId?: string;
};

type WorkspaceCreateInput = {
  name: string;
  company: string;
  owner_name?: string;
};

type ObjectiveCreateInput = {
  title: string;
  owner_id: string;
  period?: string;
  description?: string;
  workspace_id?: string;
  confirmed?: boolean;
};

type OTUnitCreateInput = {
  objective_id: string;
  title: string;
  owner_id: string;
  review_at?: string;
  due_at?: string;
  description?: string;
  plan?: string;
  next_action?: string;
  priority?: "low" | "medium" | "high" | "critical";
  workspace_id?: string;
  company_id?: string;
  collaborators?: string[];
  subject_ref?: string | null;
  org_unit_id?: string | null;
  confirmed?: boolean;
};

type FollowUpInput = {
  otunit_id: string;
  text: string;
  workspace_id?: string;
};

type ReviewDraft = {
  review: Review;
  adjust: Adjust;
};

export class EliyNativeRuntime {
  readonly store: LocalRuntimeStore;
  readonly hacGovernance: ReturnType<typeof loadHacAgentGovernance>;
  readonly hlamtContext: HlamtContext;

  constructor(
    public readonly projectRoot: string = process.cwd(),
    private readonly init: RuntimeInit = {}
  ) {
    this.store = new LocalRuntimeStore(projectRoot);
    this.hacGovernance = loadHacAgentGovernance(projectRoot);
    this.hlamtContext = loadHlamtContext(projectRoot);
  }

  private now(): string {
    return this.init.now?.() ?? new Date().toISOString();
  }

  private id(prefix: string): string {
    return this.init.idFactory?.(prefix) ?? `${prefix}_${randomUUID()}`;
  }

  private actorId(): string {
    return this.init.actorId ?? "rich";
  }

  private confirmAction(action: string, target_id?: string, label?: string): ConfirmationAction {
    return { action, target_id, label };
  }

  private result<T>(command: string, init: Partial<RuntimeResult<T>> & Pick<RuntimeResult<T>, "data" | "workspace_id">): RuntimeResult<T> {
    return createRuntimeResult<T>({
      command,
      workspace_id: init.workspace_id,
      data: init.data,
      candidates: init.candidates,
      warnings: init.warnings,
      errors: init.errors,
      requires_confirmation: init.requires_confirmation ?? false,
      confirmation_action: init.confirmation_action,
      audit_ids: init.audit_ids ?? [],
      used_hac_governance: true,
      used_hlamt_context: true,
      created_at: this.now()
    });
  }

  private audit(workspace_id: string, action: string, entity_type: string, entity_id: string, summary: string): AuditLog {
    const audit: AuditLog = {
      audit_id: this.id("audit"),
      workspace_id,
      action,
      entity_type,
      entity_id,
      summary,
      created_at: this.now(),
      used_hac_governance: true,
      used_hlamt_context: true
    };
    this.store.appendAuditLog(audit);
    return audit;
  }

  private session(workspace_id: string, event_type: string, summary: string, payload: Record<string, unknown> = {}): SessionEvent {
    const event: SessionEvent = {
      event_id: this.id("session"),
      workspace_id,
      event_type,
      summary,
      payload,
      created_at: this.now()
    };
    this.store.appendSessionEvent(event);
    return event;
  }

  private skillRun(workspace_id: string, skill_name: string, input_summary: string) {
    const output = runDeterministicSkill({
      skill_name,
      input_summary,
      hlamt_context: this.hlamtContext
    });
    const log: SkillRunLog = {
      skill_run_id: this.id("skillrun"),
      workspace_id,
      skill_name,
      input_summary,
      output_kind: output.output_kind,
      used_hlamt_context: output.used_hlamt_context,
      created_at: this.now()
    };
    this.store.appendSkillRun(log);
    return { output, log };
  }

  currentWorkspaceId(): string | null {
    return this.store.readCurrentWorkspace()?.workspace_id ?? null;
  }

  resolveWorkspaceId(explicit?: string): string {
    return explicit ?? this.currentWorkspaceId() ?? "";
  }

  requireWorkspaceId(explicit?: string): string {
    const workspaceId = this.resolveWorkspaceId(explicit);
    if (!workspaceId) {
      throw createRuntimeError("WORKSPACE_REQUIRED", "Workspace is required for this command");
    }
    return workspaceId;
  }

  loadWorkspace(workspaceId?: string): Workspace | null {
    const id = workspaceId ?? this.currentWorkspaceId();
    return id ? this.store.readWorkspace(id) : null;
  }

  createWorkspace(input: WorkspaceCreateInput): RuntimeResult<{ workspace: Workspace; company: Company; user: User; membership: Membership; policy: RuntimePolicy }> {
    const workspace_id = this.id("workspace");
    const company_id = this.id("company");
    const user_id = this.id("user");
    const membership_id = this.id("membership");
    const policy_id = this.id("policy");

    this.store.ensureWorkspaceDirectories(workspace_id);

    const workspace: Workspace = {
      workspace_id,
      name: input.name,
      status: "active",
      created_at: this.now(),
      updated_at: this.now()
    };
    const company: Company = {
      company_id,
      workspace_id,
      name: input.company,
      created_at: this.now(),
      updated_at: this.now()
    };
    const user: User = {
      user_id,
      workspace_id,
      display_name: input.owner_name ?? "Owner",
      created_at: this.now(),
      updated_at: this.now()
    };
    const membership: Membership = {
      membership_id,
      workspace_id,
      company_id,
      user_id,
      role: "owner",
      created_at: this.now(),
      updated_at: this.now()
    };
    const policy: RuntimePolicy = {
      policy_id,
      workspace_id,
      model: {
        mode: "terminal-first",
        notes: "L0/L1 local runtime baseline"
      },
      skills: {
        enabled: ["o-pdca", "sfocus", "review", "evidence-extract", "language-style"]
      },
      confirmation: {
        required_actions: [
          "create_objective",
          "update_objective",
          "create_otunit",
          "update_otunit_owner",
          "update_otunit_due_at",
          "mark_otunit_completed",
          "close_otunit",
          "create_review",
          "apply_adjust",
          "update_objective_achievement",
          "write_memory"
        ]
      },
      evidence: {
        require_confirmation: true,
        allow_candidates: true
      },
      otunit: {
        default_review_cycle: "weekly"
      },
      hlamt: {
        load_on_start: true
      },
      audit: {
        record_critical_transitions: true
      },
      created_at: this.now(),
      updated_at: this.now()
    };

    this.store.writeWorkspace(workspace);
    this.store.writeCompany(company);
    this.store.writeUsers(workspace_id, [user]);
    this.store.writeMemberships(workspace_id, [membership]);
    this.store.writePolicy(policy);
    this.store.writeCurrentWorkspace(workspace_id);
    const audit = this.audit(workspace_id, "workspace.create", "Workspace", workspace_id, `Workspace ${input.name} created`);

    return this.result("workspace create", {
      workspace_id,
      data: { workspace, company, user, membership, policy },
      audit_ids: [audit.audit_id]
    });
  }

  currentWorkspace(): RuntimeResult<{ workspace: Workspace | null; company: Company | null }> {
    const current = this.store.readCurrentWorkspace();
    if (!current) {
      return this.result("workspace current", {
        workspace_id: undefined,
        data: { workspace: null, company: null },
        errors: [createRuntimeError("NOT_FOUND", "No current workspace")],
        audit_ids: []
      });
    }
    const workspace = this.store.readWorkspace(current.workspace_id);
    const company = this.store.readCompany(current.workspace_id);
    if (!workspace) {
      return this.result("workspace current", {
        workspace_id: current.workspace_id,
        data: { workspace: null, company },
        errors: [createRuntimeError("NOT_FOUND", `Workspace ${current.workspace_id} not found`)],
        audit_ids: []
      });
    }
    return this.result("workspace current", {
      workspace_id: current.workspace_id,
      data: { workspace, company },
      audit_ids: []
    });
  }

  createObjective(input: ObjectiveCreateInput): RuntimeResult<{ objective: Objective | null; candidate?: Record<string, unknown> }> {
    const workspace_id = this.requireWorkspaceId(input.workspace_id);
    const company = this.store.readCompany(workspace_id);
    if (!company) {
      return this.result("objective create", {
        workspace_id,
        data: { objective: null as never },
        errors: [createRuntimeError("NOT_FOUND", `Company for workspace ${workspace_id} not found`)],
        audit_ids: []
      });
    }

    if (!input.confirmed) {
      const candidate = {
        candidate_id: this.id("candidate"),
        kind: "objective",
        action: "create_objective",
        workspace_id,
        company_id: company.company_id,
        title: input.title,
        description: input.description ?? null,
        owner_id: input.owner_id,
        period: input.period ?? null,
        created_at: this.now()
      };
      return this.result("objective create", {
        workspace_id,
        data: { objective: null, candidate },
        candidates: [candidate],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("create_objective", undefined, "Confirm create Objective"),
        audit_ids: []
      });
    }

    const objective_id = this.id("objective");
    const objective: Objective = ObjectiveSchema.parse({
      objective_id,
      workspace_id,
      company_id: company.company_id,
      title: input.title,
      description: input.description ?? null,
      owner_id: input.owner_id,
      period: input.period ?? null,
      status: "active",
      achievement: {
        status: "not_started",
        summary: null,
        updated_at: null
      },
      created_at: this.now(),
      updated_at: this.now()
    });
    this.store.writeObjective(objective);
    const audit = this.audit(workspace_id, "objective.create", "Objective", objective_id, `Objective ${input.title} created`);

    return this.result("objective create", {
      workspace_id,
      data: { objective },
      audit_ids: [audit.audit_id]
    });
  }

  listObjectives(workspaceId?: string): RuntimeResult<{ objectives: Objective[] }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    return this.result("objective list", {
      workspace_id,
      data: { objectives: this.store.listObjectives(workspace_id) },
      audit_ids: []
    });
  }

  showObjective(objectiveId: string, workspaceId?: string): RuntimeResult<{ objective: Objective | null }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    return this.result("objective show", {
      workspace_id,
      data: { objective: this.store.readObjective(workspace_id, objectiveId) },
      errors: this.store.readObjective(workspace_id, objectiveId) ? undefined : [createRuntimeError("NOT_FOUND", `Objective ${objectiveId} not found`)],
      audit_ids: []
    });
  }

  objectiveStatus(objectiveId: string, workspaceId?: string): RuntimeResult<{ objective: Objective | null; achievement: Objective["achievement"] | null }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const objective = this.store.readObjective(workspace_id, objectiveId);
    if (!objective) {
      return this.result("objective status", {
        workspace_id,
        data: { objective: null, achievement: null },
        errors: [createRuntimeError("NOT_FOUND", `Objective ${objectiveId} not found`)],
        audit_ids: []
      });
    }
    return this.result("objective status", {
      workspace_id,
      data: { objective, achievement: objective.achievement },
      audit_ids: []
    });
  }

  createOtUnit(input: OTUnitCreateInput): RuntimeResult<{ otunit: OTUnit | null; candidate?: Record<string, unknown> }> {
    const workspace_id = this.requireWorkspaceId(input.workspace_id);
    const company = this.store.readCompany(workspace_id);
    const objective = this.store.readObjective(workspace_id, input.objective_id);
    if (!company || !objective) {
      return this.result("otunit create", {
        workspace_id,
        data: { otunit: null as never },
        errors: [createRuntimeError("NOT_FOUND", "Workspace company or objective not found")],
        audit_ids: []
      });
    }

    if (!input.confirmed) {
      const candidate = {
        candidate_id: this.id("candidate"),
        kind: "otunit",
        action: "create_otunit",
        workspace_id,
        company_id: company.company_id,
        objective_id: input.objective_id,
        title: input.title,
        description: input.description ?? "",
        owner_id: input.owner_id,
        next_action: input.next_action ?? input.title,
        priority: input.priority ?? "medium",
        review_cycle: "weekly",
        created_at: this.now()
      };
      return this.result("otunit create", {
        workspace_id,
        data: { otunit: null, candidate },
        candidates: [candidate],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("create_otunit", input.objective_id, "Confirm create OTUnit"),
        audit_ids: []
      });
    }

    const otunit_id = this.id("otunit");
    const otunit: OTUnit = OTUnitSchema.parse({
      otunit_id,
      workspace_id,
      company_id: company.company_id,
      objective_id: input.objective_id,
      title: input.title,
      description: input.description ?? "",
      owner_id: input.owner_id,
      org_unit_id: input.org_unit_id ?? null,
      subject_ref: input.subject_ref ?? null,
      collaborators: input.collaborators ?? [],
      status: "proposed",
      priority: input.priority ?? "medium",
      plan: input.plan ?? "",
      next_action: input.next_action ?? input.title,
      review_cycle: "weekly",
      due_at: input.due_at ?? null,
      review_at: input.review_at ?? null,
      follow_up_records: [],
      check_records: [],
      adjust_records: [],
      evidence_refs: [],
      review_refs: [],
      impact_on_objective: "",
      created_by: input.owner_id,
      created_at: this.now(),
      updated_at: this.now(),
      closed_at: null,
      close_reason: null
    });
    this.store.writeOtUnit(otunit);
    const audit = this.audit(workspace_id, "otunit.create", "OTUnit", otunit_id, `OTUnit ${input.title} created`);
    return this.result("otunit create", {
      workspace_id,
      data: { otunit },
      audit_ids: [audit.audit_id]
    });
  }

  listOtUnits(objectiveId: string, workspaceId?: string): RuntimeResult<{ otunits: OTUnit[] }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const otunits = this.store.listOtUnits(workspace_id).filter((item) => item.objective_id === objectiveId);
    return this.result("otunit list", {
      workspace_id,
      data: { otunits },
      audit_ids: []
    });
  }

  showOtUnit(otunitId: string, workspaceId?: string): RuntimeResult<{ otunit: OTUnit | null }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const otunit = this.store.readOtUnit(workspace_id, otunitId);
    return this.result("otunit show", {
      workspace_id,
      data: { otunit },
      errors: otunit ? undefined : [createRuntimeError("NOT_FOUND", `OTUnit ${otunitId} not found`)],
      audit_ids: []
    });
  }

  updateOtUnitStatus(
    otunitId: string,
    to: OTUnitStatus,
    workspaceId?: string,
    confirmed = false
  ): RuntimeResult<{ otunit: OTUnit | null; proposal?: Record<string, unknown> }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const otunit = this.store.readOtUnit(workspace_id, otunitId);
    if (!otunit) {
      return this.result("otunit status", {
        workspace_id,
        data: { otunit: null as OTUnit | null },
        errors: [createRuntimeError("NOT_FOUND", `OTUnit ${otunitId} not found`)],
        audit_ids: []
      });
    }
    const transition = transitionOtUnitStatus(otunit.status, to);
    if (!transition.ok) {
      return this.result("otunit status", {
        workspace_id,
        data: { otunit },
        errors: [transition.error],
        audit_ids: []
      });
    }
    if (transition.requires_confirmation && !confirmed) {
      const proposal = {
        action: "update_otunit_status",
        otunit_id: otunitId,
        from: otunit.status,
        to: transition.status,
        requires_confirmation: true
      };
      return this.result("otunit status", {
        workspace_id,
        data: { otunit, proposal },
        candidates: [proposal],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("update_otunit_status", otunitId, "Confirm OTUnit status transition"),
        audit_ids: []
      });
    }
    const updated: OTUnit = {
      ...otunit,
      status: transition.status,
      updated_at: this.now(),
      closed_at: transition.status === "closed" ? otunit.closed_at ?? this.now() : otunit.closed_at
    };
    this.store.writeOtUnit(updated);
    const audit = this.audit(workspace_id, "otunit.status", "OTUnit", otunitId, `OTUnit status changed to ${transition.status}`);
    return this.result("otunit status", {
      workspace_id,
      data: { otunit: updated },
      audit_ids: [audit.audit_id]
    });
  }

  followUpOtUnit(input: FollowUpInput): RuntimeResult<{ candidate: EvidenceCandidate; otunit: OTUnit; session_event: SessionEvent }> {
    const workspace_id = this.requireWorkspaceId(input.workspace_id);
    const otunit = this.store.readOtUnit(workspace_id, input.otunit_id);
    if (!otunit) {
      return this.result("otunit followup", {
        workspace_id,
        data: { candidate: null as never, otunit: null as never, session_event: null as never },
        errors: [createRuntimeError("NOT_FOUND", `OTUnit ${input.otunit_id} not found`)],
        audit_ids: []
      });
    }
    const nextStatus = otunit.status === "accepted" ? "in_progress" : otunit.status;
    if (otunit.status !== "accepted" && otunit.status !== "in_progress") {
      return this.result("otunit followup", {
        workspace_id,
        data: { candidate: null as never, otunit, session_event: null as never },
        errors: [createRuntimeError("INVALID_TRANSITION", `OTUnit ${input.otunit_id} must be accepted or in_progress before follow-up`, { status: otunit.status })],
        audit_ids: []
      });
    }
    const candidate_id = this.id("candidate");
    const skill = this.skillRun(workspace_id, "evidence-extract", input.text);
    const candidate = EvidenceCandidateSchema.parse({
      candidate_id,
      workspace_id,
      company_id: otunit.company_id,
      objective_id: otunit.objective_id,
      otunit_id: otunit.otunit_id,
      source_type: "otunit_followup",
      source_ref: otunit.otunit_id,
      content: input.text,
      captured_at: this.now(),
      created_at: this.now(),
      updated_at: this.now()
    });
    this.store.writeEvidenceCandidate(candidate);
    const updated: OTUnit = {
      ...otunit,
      status: nextStatus,
      follow_up_records: [
        ...otunit.follow_up_records,
        {
          follow_up_id: this.id("followup"),
          text: input.text,
          candidate_id,
          captured_at: this.now()
        }
      ],
      updated_at: this.now()
    };
    this.store.writeOtUnit(updated);
    const session_event = this.session(workspace_id, "otunit.followup", `OTUnit follow-up recorded`, {
      otunit_id: otunit.otunit_id,
      candidate_id
    });
    const audit = this.audit(workspace_id, "evidence.candidate.create", "EvidenceCandidate", candidate_id, `Evidence candidate created from OTUnit follow-up`);
    return this.result("otunit followup", {
      workspace_id,
      data: { candidate, otunit: updated, session_event },
      candidates: [candidate, skill.output],
      audit_ids: [audit.audit_id]
    });
  }

  listEvidence(otunitId: string, workspaceId?: string): RuntimeResult<{ candidates: EvidenceCandidate[]; evidence: Evidence[] }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    return this.result("evidence list", {
      workspace_id,
      data: {
        candidates: this.store.listEvidenceCandidates(workspace_id).filter((item) => item.otunit_id === otunitId),
        evidence: this.store.listEvidence(workspace_id).filter((item) => item.otunit_id === otunitId)
      },
      audit_ids: []
    });
  }

  confirmEvidence(candidateId: string, confirmedByUser?: string, workspaceId?: string): RuntimeResult<{ evidence: Evidence; candidate: EvidenceCandidate; otunit: OTUnit }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const candidate = this.store.readEvidenceCandidate(workspace_id, candidateId);
    if (!candidate) {
      return this.result("evidence confirm", {
        workspace_id,
        data: { evidence: null as never, candidate: null as never, otunit: null as never },
        errors: [createRuntimeError("NOT_FOUND", `Evidence candidate ${candidateId} not found`)],
        audit_ids: []
      });
    }
    const otunit = this.store.readOtUnit(workspace_id, candidate.otunit_id);
    if (!otunit) {
      return this.result("evidence confirm", {
        workspace_id,
        data: { evidence: null as never, candidate, otunit: null as never },
        errors: [createRuntimeError("NOT_FOUND", `OTUnit ${candidate.otunit_id} not found`)],
        audit_ids: []
      });
    }
    const evidence_id = this.id("evidence");
    const evidence: Evidence = {
      evidence_id,
      workspace_id,
      company_id: candidate.company_id,
      objective_id: candidate.objective_id,
      otunit_id: candidate.otunit_id,
      source_type: candidate.source_type,
      source_ref: candidate.source_ref,
      captured_at: candidate.captured_at,
      content_summary: candidate.content.slice(0, 240),
      linked_objective_ids: [candidate.objective_id],
      linked_otunit_ids: [candidate.otunit_id],
      confirmed_by_user: confirmedByUser ?? this.actorId(),
      created_at: this.now(),
      updated_at: this.now()
    };
    this.store.writeEvidence(evidence);
    const updated: OTUnit = {
      ...otunit,
      evidence_refs: Array.from(new Set([...otunit.evidence_refs, evidence_id])),
      updated_at: this.now()
    };
    this.store.writeOtUnit(updated);
    const audit = this.audit(workspace_id, "evidence.confirm", "Evidence", evidence_id, `Evidence confirmed from candidate ${candidateId}`);
    return this.result("evidence confirm", {
      workspace_id,
      data: { evidence, candidate, otunit: updated },
      audit_ids: [audit.audit_id]
    });
  }

  createReview(otunitId: string, workspaceId?: string, confirmed = false): RuntimeResult<{ review: Review | null; adjust: Adjust | null; otunit: OTUnit | null; proposal?: ReviewDraft }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const otunit = this.store.readOtUnit(workspace_id, otunitId);
    if (!otunit) {
      return this.result("review create", {
        workspace_id,
        data: { review: null as never, adjust: null as never, otunit: null as never },
        errors: [createRuntimeError("NOT_FOUND", `OTUnit ${otunitId} not found`)],
        audit_ids: []
      });
    }
    const evidence = otunit.evidence_refs
      .map((evidenceId) => this.store.readEvidence(workspace_id, evidenceId))
      .find((item): item is Evidence => Boolean(item));
    if (!evidence) {
      return this.result("review create", {
        workspace_id,
        data: { review: null as never, adjust: null as never, otunit },
        errors: [createRuntimeError("NOT_FOUND", `No confirmed evidence found for OTUnit ${otunitId}`)],
        audit_ids: []
      });
    }
    const skill = this.skillRun(workspace_id, "review", `Review OTUnit ${otunitId} with evidence ${evidence.evidence_id}`);
    const review = this.buildReviewDraft(workspace_id, otunit, evidence);
    if (!confirmed) {
      return this.result("review create", {
        workspace_id,
        data: { review: null, adjust: null, otunit, proposal: review },
        candidates: [review.review, review.adjust, skill.output],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("create_review", otunitId, "Confirm create Review"),
        audit_ids: []
      });
    }
    this.store.writeReview(review.review);
    this.store.writeAdjust(review.adjust);
    const updatedOtunit: OTUnit = {
      ...otunit,
      status: "checking",
      review_refs: Array.from(new Set([...otunit.review_refs, review.review.review_id])),
      adjust_records: [
        ...otunit.adjust_records,
        {
          adjust_id: review.adjust.adjust_id,
          status: review.adjust.status,
          summary: review.adjust.proposal,
          created_at: this.now()
        }
      ],
      updated_at: this.now()
    };
    this.store.writeOtUnit(updatedOtunit);
    const reviewAudit = this.audit(workspace_id, "review.create", "Review", review.review.review_id, `Review created for OTUnit ${otunitId}`);
    const adjustAudit = this.audit(workspace_id, "adjust.propose", "Adjust", review.adjust.adjust_id, `Adjust proposal created for review ${review.review.review_id}`);
    return this.result("review create", {
      workspace_id,
      data: { review: review.review, adjust: review.adjust, otunit: updatedOtunit },
      audit_ids: [reviewAudit.audit_id, adjustAudit.audit_id]
    });
  }

  applyAdjust(adjustId: string, workspaceId?: string, isConfirmed = false): RuntimeResult<{ adjust: Adjust | null; otunit: OTUnit | null; objective: Objective | null; proposal?: Adjust }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const adjust = this.store.readAdjust(workspace_id, adjustId);
    if (!adjust) {
      return this.result("adjust apply", {
        workspace_id,
        data: { adjust: null as never, otunit: null as never, objective: null },
        errors: [createRuntimeError("NOT_FOUND", `Adjust ${adjustId} not found`)],
        audit_ids: []
      });
    }
    const otunit = this.store.readOtUnit(workspace_id, adjust.otunit_id);
    if (!otunit) {
      return this.result("adjust apply", {
        workspace_id,
        data: { adjust, otunit: null as never, objective: null },
        errors: [createRuntimeError("NOT_FOUND", `OTUnit ${adjust.otunit_id} not found`)],
        audit_ids: []
      });
    }
    const stageOne = transitionOtUnitStatus(otunit.status, "adjusting");
    if (!stageOne.ok) {
      return this.result("adjust apply", {
        workspace_id,
        data: { adjust, otunit, objective: this.store.readObjective(workspace_id, adjust.objective_id) },
        errors: [stageOne.error],
        audit_ids: []
      });
    }
    const adjustedOtunit: OTUnit = {
      ...otunit,
      status: stageOne.status,
      updated_at: this.now()
    };
    const stageTwo = transitionOtUnitStatus(adjustedOtunit.status, "completed");
    if (!stageTwo.ok) {
      return this.result("adjust apply", {
        workspace_id,
        data: { adjust, otunit: adjustedOtunit, objective: this.store.readObjective(workspace_id, adjust.objective_id) },
        errors: [stageTwo.error],
        audit_ids: []
      });
    }
    if (!isConfirmed) {
      return this.result("adjust apply", {
        workspace_id,
        data: { adjust, otunit, objective: this.store.readObjective(workspace_id, adjust.objective_id), proposal: adjust },
        candidates: [adjust],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("apply_adjust", adjustId, "Confirm apply Adjust"),
        audit_ids: []
      });
    }
    const confirmedAdjust: Adjust = {
      ...adjust,
      status: "confirmed",
      confirmed_at: this.now(),
      updated_at: this.now()
    };
    const applied: Adjust = {
      ...confirmedAdjust,
      status: "applied",
      applied_at: this.now(),
      updated_at: this.now()
    };
    const completedOtunit: OTUnit = {
      ...adjustedOtunit,
      adjust_records: otunit.adjust_records.map((record) =>
        record.adjust_id === adjustId ? { ...record, status: "applied", summary: applied.proposal } : record
      ),
      status: stageTwo.status,
      updated_at: this.now()
    };
    this.store.writeOtUnit(completedOtunit);
    this.store.writeAdjust(applied);
    const objective = this.store.readObjective(workspace_id, completedOtunit.objective_id);
    const audit = this.audit(workspace_id, "adjust.apply", "Adjust", adjustId, `Adjust applied for OTUnit ${adjust.otunit_id}`);
    return this.result("adjust apply", {
      workspace_id,
      data: { adjust: applied, otunit: completedOtunit, objective },
      audit_ids: [audit.audit_id]
    });
  }

  closeOtUnit(otunitId: string, reason: string, workspaceId?: string, confirmed = false): RuntimeResult<{ otunit: OTUnit | null; objective: Objective | null; proposal?: Record<string, unknown> }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const otunit = this.store.readOtUnit(workspace_id, otunitId);
    if (!otunit) {
      return this.result("otunit close", {
        workspace_id,
        data: { otunit: null as never, objective: null },
        errors: [createRuntimeError("NOT_FOUND", `OTUnit ${otunitId} not found`)],
        audit_ids: []
      });
    }
    if (!confirmed) {
      const proposal = {
        action: "close_otunit",
        otunit_id: otunitId,
        reason,
        from_status: otunit.status,
        to_status: "closed",
        created_at: this.now()
      };
      return this.result("otunit close", {
        workspace_id,
        data: { otunit, objective: this.store.readObjective(workspace_id, otunit.objective_id), proposal },
        candidates: [proposal],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("close_otunit", otunitId, "Confirm close OTUnit"),
        audit_ids: []
      });
    }
    const transition = transitionOtUnitStatus(otunit.status, "closed");
    if (!transition.ok) {
      return this.result("otunit close", {
        workspace_id,
        data: { otunit, objective: null },
        errors: [transition.error],
        audit_ids: []
      });
    }
    const closed: OTUnit = {
      ...otunit,
      status: "closed",
      closed_at: this.now(),
      close_reason: reason,
      updated_at: this.now()
    };
    this.store.writeOtUnit(closed);
    const objective = this.store.readObjective(workspace_id, closed.objective_id);
    const audit = this.audit(workspace_id, "otunit.close", "OTUnit", otunitId, `OTUnit closed: ${reason}`);
    return this.result("otunit close", {
      workspace_id,
      data: { otunit: closed, objective },
      audit_ids: [audit.audit_id]
    });
  }

  updateObjectiveAchievement(objectiveId: string, summary?: string, workspaceId?: string, confirmed = false): RuntimeResult<{ objective: Objective | null; proposal?: Record<string, unknown> }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    const objective = this.store.readObjective(workspace_id, objectiveId);
    if (!objective) {
      return this.result("objective achievement", {
        workspace_id,
        data: { objective: null as never },
        errors: [createRuntimeError("NOT_FOUND", `Objective ${objectiveId} not found`)],
        audit_ids: []
      });
    }
    const otunits = this.store.listOtUnits(workspace_id).filter((item) => item.objective_id === objectiveId);
    const allClosed = otunits.length > 0 && otunits.every((item) => item.status === "closed");
    if (!confirmed) {
      const proposal = {
        action: "update_objective_achievement",
        objective_id: objectiveId,
        next_status: allClosed ? "achieved" : "active",
        achievement_status: allClosed ? "achieved" : "in_progress",
        summary: summary ?? (allClosed ? "All OTUnits are closed." : "OTUnits remain in progress."),
        created_at: this.now()
      };
      return this.result("objective achievement", {
        workspace_id,
        data: { objective, proposal },
        candidates: [proposal],
        requires_confirmation: true,
        confirmation_action: this.confirmAction("update_objective_achievement", objectiveId, "Confirm update Objective Achievement"),
        audit_ids: []
      });
    }
    const updated: Objective = {
      ...objective,
      status: allClosed ? "achieved" : "active",
      achievement: {
        status: allClosed ? "achieved" : "in_progress",
        summary: summary ?? (allClosed ? "All OTUnits are closed." : "OTUnits remain in progress."),
        updated_at: this.now()
      },
      updated_at: this.now()
    };
    this.store.writeObjective(updated);
    const audit = this.audit(workspace_id, "objective.achievement.update", "Objective", objectiveId, `Objective achievement updated`);
    return this.result("objective achievement", {
      workspace_id,
      data: { objective: updated },
      audit_ids: [audit.audit_id]
    });
  }

  listAudit(workspaceId?: string): RuntimeResult<{ audit: AuditLog[] }> {
    const workspace_id = this.requireWorkspaceId(workspaceId);
    return this.result("audit list", {
      workspace_id,
      data: { audit: this.store.readAuditLog(workspace_id) },
      audit_ids: []
    });
  }

  private buildReviewDraft(workspace_id: string, otunit: OTUnit, evidence: Evidence): ReviewDraft {
    const review_id = this.id("review");
    const adjust_id = this.id("adjust");
    const review = {
      review_id,
      workspace_id,
      company_id: otunit.company_id,
      objective_id: otunit.objective_id,
      otunit_id: otunit.otunit_id,
      expected: `OTUnit ${otunit.title} should make progress toward the objective.`,
      actual: evidence.content_summary,
      gap: `Evidence shows the current state of ${otunit.title} still needs adjustment.`,
      reason: "Follow-up evidence requires a confirming adjustment.",
      adjustment: `Adjust the OTUnit plan using evidence ${evidence.evidence_id}.`,
      evidence_ids: [evidence.evidence_id],
      created_at: this.now(),
      updated_at: this.now()
    } satisfies Review;

    const adjust = {
      adjust_id,
      workspace_id,
      company_id: otunit.company_id,
      objective_id: otunit.objective_id,
      otunit_id: otunit.otunit_id,
      review_id,
      proposal: `Apply adjustment based on evidence ${evidence.evidence_id} for OTUnit ${otunit.title}.`,
      status: "proposed",
      created_at: this.now(),
      updated_at: this.now(),
      confirmed_at: null,
      applied_at: null
    } satisfies Adjust;

    return {
      review: ReviewSchema.parse(review),
      adjust: AdjustSchema.parse(adjust)
    };
  }

  runTerminalProof(): RuntimeResult<{
    workspace: Workspace;
    company: Company;
    objective: Objective;
    otunit: OTUnit;
    candidate: EvidenceCandidate;
    evidence: Evidence;
    review: Review;
    adjust: Adjust;
    audit: AuditLog[];
    skill_runs: SkillRunLog[];
  }> {
    const workspace = this.createWorkspace({ name: "Demo Workspace", company: "Demo Company", owner_name: "rich" }).data!;
    const objective = this.createObjective({
      title: "Q3 收入目标",
      owner_id: this.actorId(),
      period: "2026-07-01:2026-09-30",
      workspace_id: workspace.workspace.workspace_id,
      confirmed: true
    }).data!.objective!;
    const otunitCreate = this.createOtUnit({
      objective_id: objective.objective_id,
      title: "完成第一批体验客户访谈",
      owner_id: this.actorId(),
      review_at: "2026-07-15",
      workspace_id: workspace.workspace.workspace_id,
      company_id: workspace.company.company_id,
      confirmed: true
    }).data!.otunit!;
    const accepted = this.updateOtUnitStatus(
      otunitCreate.otunit_id,
      "accepted",
      workspace.workspace.workspace_id,
      true
    ).data!.otunit!;
    const followup = this.followUpOtUnit({
      otunit_id: accepted.otunit_id,
      text: "今天完成 3 位客户访谈",
      workspace_id: workspace.workspace.workspace_id
    }).data!;
    const evidence = this.confirmEvidence(followup.candidate.candidate_id, this.actorId(), workspace.workspace.workspace_id).data!.evidence;
    const review = this.createReview(accepted.otunit_id, workspace.workspace.workspace_id, true).data!.review!;
    const adjust = this.applyAdjust(this.store.listAdjusts(workspace.workspace.workspace_id)[0].adjust_id, workspace.workspace.workspace_id, true).data!.adjust!;
    const completed = this.closeOtUnit(accepted.otunit_id, "已完成并形成下一步建议", workspace.workspace.workspace_id, true).data!.otunit!;
    const achievedObjective = this.updateObjectiveAchievement(objective.objective_id, "Demo Workspace first loop completed", workspace.workspace.workspace_id, true).data!.objective!;
    const audit = this.store.readAuditLog(workspace.workspace.workspace_id);
    const skill_runs = this.store.readSkillRuns(workspace.workspace.workspace_id);

    return this.result("proof terminal", {
      workspace_id: workspace.workspace.workspace_id,
      data: {
        workspace: workspace.workspace,
        company: workspace.company,
        objective: achievedObjective,
        otunit: completed,
        candidate: followup.candidate,
        evidence,
        review,
        adjust,
        audit,
        skill_runs
      },
      audit_ids: audit.map((item) => item.audit_id)
    });
  }
}
