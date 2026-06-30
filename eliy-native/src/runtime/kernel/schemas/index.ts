import { z } from "zod";

const idSchema = z.string().min(1);
const timestampSchema = z.string().min(1);

export const OTUnitStatusSchema = z.enum([
  "proposed",
  "accepted",
  "in_progress",
  "checking",
  "adjusting",
  "completed",
  "closed",
  "blocked",
  "cancelled",
  "deferred"
]);
export type OTUnitStatus = z.infer<typeof OTUnitStatusSchema>;

export const ObjectiveStatusSchema = z.enum([
  "proposed",
  "active",
  "achieved",
  "closed",
  "blocked",
  "cancelled",
  "deferred"
]);

export const AdjustStatusSchema = z.enum([
  "proposed",
  "confirmed",
  "applied"
]);

export const RuntimeErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional()
});

export type RuntimeError = z.infer<typeof RuntimeErrorSchema>;

export const ConfirmationActionSchema = z.object({
  action: z.string().min(1),
  target_id: z.string().min(1).optional(),
  label: z.string().min(1).optional()
});

export type ConfirmationAction = z.infer<typeof ConfirmationActionSchema>;

export const WorkspaceSchema = z.object({
  workspace_id: idSchema,
  name: z.string().min(1),
  status: z.enum(["active", "archived"]).default("active"),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CompanySchema = z.object({
  company_id: idSchema,
  workspace_id: idSchema,
  name: z.string().min(1),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type Company = z.infer<typeof CompanySchema>;

export const UserSchema = z.object({
  user_id: idSchema,
  workspace_id: idSchema,
  display_name: z.string().min(1),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type User = z.infer<typeof UserSchema>;

export const MembershipSchema = z.object({
  membership_id: idSchema,
  workspace_id: idSchema,
  company_id: idSchema,
  user_id: idSchema,
  role: z.enum(["owner", "member", "viewer"]).default("owner"),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type Membership = z.infer<typeof MembershipSchema>;

export const RuntimePolicySchema = z.object({
  policy_id: idSchema,
  workspace_id: idSchema,
  model: z.object({
    mode: z.string().min(1),
    provider: z.string().min(1).optional(),
    notes: z.string().optional()
  }),
  skills: z.object({
    enabled: z.array(z.string().min(1))
  }),
  confirmation: z.object({
    required_actions: z.array(z.string().min(1))
  }),
  evidence: z.object({
    require_confirmation: z.boolean(),
    allow_candidates: z.boolean()
  }),
  otunit: z.object({
    default_review_cycle: z.enum(["weekly", "biweekly", "custom"])
  }),
  hlamt: z.object({
    load_on_start: z.boolean()
  }),
  audit: z.object({
    record_critical_transitions: z.boolean()
  }),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type RuntimePolicy = z.infer<typeof RuntimePolicySchema>;

export const ObjectiveAchievementSchema = z.object({
  status: z.enum(["not_started", "in_progress", "achieved", "blocked", "deferred"]).default("not_started"),
  summary: z.string().optional().nullable(),
  updated_at: timestampSchema.optional().nullable()
});

export const ObjectiveSchema = z.object({
  objective_id: idSchema,
  workspace_id: idSchema,
  company_id: idSchema,
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  owner_id: idSchema,
  period: z.string().optional().nullable(),
  status: ObjectiveStatusSchema.default("active"),
  achievement: ObjectiveAchievementSchema.default({
    status: "not_started",
    summary: null,
    updated_at: null
  }),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const FollowUpRecordSchema = z.object({
  follow_up_id: idSchema,
  text: z.string().min(1),
  candidate_id: idSchema.optional().nullable(),
  captured_at: timestampSchema
});
export type FollowUpRecord = z.infer<typeof FollowUpRecordSchema>;

export const AdjustRecordSchema = z.object({
  adjust_id: idSchema,
  status: AdjustStatusSchema,
  summary: z.string().min(1),
  created_at: timestampSchema
});
export type AdjustRecord = z.infer<typeof AdjustRecordSchema>;

export const OTUnitSchema = z.object({
  otunit_id: idSchema,
  otunit_code: z.string().optional(),
  workspace_id: idSchema,
  company_id: idSchema,
  objective_id: idSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  owner_id: idSchema,
  org_unit_id: z.string().nullable().optional(),
  subject_ref: z.string().nullable().optional(),
  collaborators: z.array(idSchema),
  status: OTUnitStatusSchema,
  priority: z.enum(["low", "medium", "high", "critical"]),
  plan: z.string().optional(),
  next_action: z.string().min(1),
  review_cycle: z.enum(["weekly", "biweekly", "custom"]),
  due_at: z.string().nullable().optional(),
  review_at: z.string().nullable().optional(),
  follow_up_records: z.array(FollowUpRecordSchema),
  check_records: z.array(z.string()),
  adjust_records: z.array(AdjustRecordSchema),
  evidence_refs: z.array(idSchema),
  review_refs: z.array(idSchema),
  impact_on_objective: z.string().optional(),
  created_by: idSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  closed_at: z.string().nullable().optional(),
  close_reason: z.string().nullable().optional()
});
export type OTUnit = z.infer<typeof OTUnitSchema>;

export const EvidenceCandidateSchema = z.object({
  candidate_id: idSchema,
  workspace_id: idSchema,
  company_id: idSchema,
  objective_id: idSchema,
  otunit_id: idSchema,
  source_type: z.string().min(1),
  source_ref: z.string().min(1),
  content: z.string().min(1),
  captured_at: timestampSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type EvidenceCandidate = z.infer<typeof EvidenceCandidateSchema>;

export const EvidenceSchema = z.object({
  evidence_id: idSchema,
  workspace_id: idSchema,
  company_id: idSchema,
  objective_id: idSchema,
  otunit_id: idSchema,
  source_type: z.string().min(1),
  source_ref: z.string().min(1),
  captured_at: timestampSchema,
  content_summary: z.string().min(1),
  linked_objective_ids: z.array(idSchema),
  linked_otunit_ids: z.array(idSchema),
  confirmed_by_user: idSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const ReviewSchema = z.object({
  review_id: idSchema,
  workspace_id: idSchema,
  company_id: idSchema,
  objective_id: idSchema,
  otunit_id: idSchema,
  expected: z.string().min(1),
  actual: z.string().min(1),
  gap: z.string().min(1),
  reason: z.string().min(1),
  adjustment: z.string().min(1),
  evidence_ids: z.array(idSchema),
  created_at: timestampSchema,
  updated_at: timestampSchema
});
export type Review = z.infer<typeof ReviewSchema>;

export const AdjustSchema = z.object({
  adjust_id: idSchema,
  workspace_id: idSchema,
  company_id: idSchema,
  objective_id: idSchema,
  otunit_id: idSchema,
  review_id: idSchema,
  proposal: z.string().min(1),
  status: AdjustStatusSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  confirmed_at: timestampSchema.optional().nullable(),
  applied_at: timestampSchema.optional().nullable()
});
export type Adjust = z.infer<typeof AdjustSchema>;

export const SessionEventSchema = z.object({
  event_id: idSchema,
  workspace_id: idSchema,
  event_type: z.string().min(1),
  summary: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  created_at: timestampSchema
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const AuditLogSchema = z.object({
  audit_id: idSchema,
  workspace_id: idSchema,
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: idSchema,
  summary: z.string().min(1),
  detail: z.string().optional(),
  created_at: timestampSchema,
  used_hac_governance: z.boolean(),
  used_hlamt_context: z.boolean()
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const SkillRunLogSchema = z.object({
  skill_run_id: idSchema,
  workspace_id: idSchema,
  skill_name: z.string().min(1),
  input_summary: z.string().min(1),
  output_kind: z.enum(["candidate", "draft", "proposal", "question", "judgment"]),
  used_hlamt_context: z.boolean(),
  created_at: timestampSchema
});
export type SkillRunLog = z.infer<typeof SkillRunLogSchema>;

export const RuntimeErrorCodeSchema = z.enum([
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "INVALID_TRANSITION",
  "STORE_ERROR",
  "CONFIRMATION_REQUIRED",
  "WORKSPACE_REQUIRED",
  "POLICY_ERROR",
  "INTERNAL_ERROR"
]);

export const RuntimeResultSchema = z.object({
  ok: z.boolean(),
  command: z.string().min(1),
  workspace_id: z.string().optional(),
  data: z.unknown().optional(),
  candidates: z.array(z.unknown()).optional(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(RuntimeErrorSchema).optional(),
  requires_confirmation: z.boolean(),
  confirmation_action: ConfirmationActionSchema.optional(),
  audit_ids: z.array(z.string()),
  used_hac_governance: z.boolean(),
  used_hlamt_context: z.boolean(),
  created_at: timestampSchema
});
export type RuntimeResult<T = unknown> = {
  ok: boolean;
  command: string;
  workspace_id?: string;
  data?: T;
  candidates?: unknown[];
  warnings?: string[];
  errors?: RuntimeError[];
  requires_confirmation: boolean;
  confirmation_action?: ConfirmationAction;
  audit_ids: string[];
  used_hac_governance: boolean;
  used_hlamt_context: boolean;
  created_at: string;
};

export const CurrentWorkspaceSchema = z.object({
  workspace_id: idSchema,
  selected_at: timestampSchema
});
export type CurrentWorkspace = z.infer<typeof CurrentWorkspaceSchema>;

export const WorkspaceBundleSchemas = {
  workspace: WorkspaceSchema,
  company: CompanySchema,
  users: z.array(UserSchema),
  memberships: z.array(MembershipSchema),
  policy: RuntimePolicySchema,
  objective: ObjectiveSchema,
  otunit: OTUnitSchema,
  evidenceCandidate: EvidenceCandidateSchema,
  evidence: EvidenceSchema,
  review: ReviewSchema,
  adjust: AdjustSchema,
  sessionEvent: SessionEventSchema,
  auditLog: AuditLogSchema,
  skillRunLog: SkillRunLogSchema
} as const;

export type WorkspaceBundleSchemas = typeof WorkspaceBundleSchemas;
