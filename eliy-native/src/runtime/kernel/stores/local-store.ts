import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  AdjustSchema,
  AuditLogSchema,
  CompanySchema,
  CurrentWorkspaceSchema,
  EvidenceCandidateSchema,
  EvidenceSchema,
  MembershipSchema,
  ObjectiveSchema,
  OTUnitSchema,
  ReviewSchema,
  RuntimePolicySchema,
  SessionEventSchema,
  SkillRunLogSchema,
  UserSchema,
  WorkspaceSchema,
  type Adjust,
  type AuditLog,
  type Company,
  type CurrentWorkspace,
  type Evidence,
  type EvidenceCandidate,
  type Membership,
  type Objective,
  type OTUnit,
  type Review,
  type RuntimePolicy,
  type SessionEvent,
  type SkillRunLog,
  type User,
  type Workspace
} from "../schemas/index.js";

type JsonSchemaLike<T> = z.ZodType<T>;

function ensureParent(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function readJson<T>(filePath: string, schema: JsonSchemaLike<T>): T | null {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf8");
  if (!raw.trim()) return null;
  return schema.parse(JSON.parse(raw));
}

function writeJson<T>(filePath: string, schema: JsonSchemaLike<T>, value: T): T {
  ensureParent(filePath);
  const parsed = schema.parse(value);
  writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
  return parsed;
}

function appendJsonl<T>(filePath: string, schema: JsonSchemaLike<T>, value: T): T {
  ensureParent(filePath);
  const parsed = schema.parse(value);
  appendFileSync(filePath, `${JSON.stringify(parsed)}\n`);
  return parsed;
}

function readJsonl<T>(filePath: string, schema: JsonSchemaLike<T>): T[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf8");
  if (!raw.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => schema.parse(JSON.parse(line)));
}

export class LocalRuntimeStore {
  constructor(public readonly projectRoot: string) {}

  private get dataRoot(): string {
    return join(this.projectRoot, "data");
  }

  currentWorkspaceFile(): string {
    return join(this.dataRoot, "current-workspace.json");
  }

  workspaceDir(workspaceId: string): string {
    return join(this.dataRoot, "workspaces", workspaceId);
  }

  workspacePath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "workspace.json");
  }

  companyPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "company.json");
  }

  policyPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "policy.json");
  }

  usersPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "users.json");
  }

  membershipsPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "memberships.json");
  }

  objectivesDir(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "objectives");
  }

  objectivePath(workspaceId: string, objectiveId: string): string {
    return join(this.objectivesDir(workspaceId), `${objectiveId}.json`);
  }

  otunitsDir(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "otunits");
  }

  otunitPath(workspaceId: string, otunitId: string): string {
    return join(this.otunitsDir(workspaceId), `${otunitId}.json`);
  }

  evidenceCandidatesDir(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "evidence", "candidates");
  }

  evidenceCandidatePath(workspaceId: string, candidateId: string): string {
    return join(this.evidenceCandidatesDir(workspaceId), `${candidateId}.json`);
  }

  evidenceConfirmedDir(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "evidence", "confirmed");
  }

  evidencePath(workspaceId: string, evidenceId: string): string {
    return join(this.evidenceConfirmedDir(workspaceId), `${evidenceId}.json`);
  }

  reviewsDir(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "reviews");
  }

  reviewPath(workspaceId: string, reviewId: string): string {
    return join(this.reviewsDir(workspaceId), `${reviewId}.json`);
  }

  adjustsDir(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "adjusts");
  }

  adjustPath(workspaceId: string, adjustId: string): string {
    return join(this.adjustsDir(workspaceId), `${adjustId}.json`);
  }

  sessionsPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "sessions", "events.jsonl");
  }

  auditPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "audit", "audit.jsonl");
  }

  skillRunsPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "skill_runs", "skill_runs.jsonl");
  }

  memoryPath(workspaceId: string): string {
    return join(this.workspaceDir(workspaceId), "memory", "operating_memory.jsonl");
  }

  ensureWorkspaceDirectories(workspaceId: string): void {
    [
      this.workspaceDir(workspaceId),
      this.objectivesDir(workspaceId),
      this.otunitsDir(workspaceId),
      this.evidenceCandidatesDir(workspaceId),
      this.evidenceConfirmedDir(workspaceId),
      this.reviewsDir(workspaceId),
      this.adjustsDir(workspaceId),
      join(this.workspaceDir(workspaceId), "sessions"),
      join(this.workspaceDir(workspaceId), "audit"),
      join(this.workspaceDir(workspaceId), "skill_runs"),
      join(this.workspaceDir(workspaceId), "memory")
    ].forEach((dir) => mkdirSync(dir, { recursive: true }));
  }

  writeCurrentWorkspace(workspace_id: string): CurrentWorkspace {
    return writeJson(this.currentWorkspaceFile(), CurrentWorkspaceSchema, {
      workspace_id,
      selected_at: new Date().toISOString()
    });
  }

  readCurrentWorkspace(): CurrentWorkspace | null {
    return readJson(this.currentWorkspaceFile(), CurrentWorkspaceSchema);
  }

  writeWorkspace(workspace: Workspace): Workspace {
    return writeJson(this.workspacePath(workspace.workspace_id), WorkspaceSchema, workspace) as Workspace;
  }

  writeCompany(company: Company): Company {
    return writeJson(this.companyPath(company.workspace_id), CompanySchema, company) as Company;
  }

  writeUsers(workspaceId: string, users: User[]): User[] {
    return writeJson(this.usersPath(workspaceId), z.array(UserSchema), users) as User[];
  }

  writeMemberships(workspaceId: string, memberships: Membership[]): Membership[] {
    return writeJson(this.membershipsPath(workspaceId), z.array(MembershipSchema), memberships) as Membership[];
  }

  writePolicy(policy: RuntimePolicy): RuntimePolicy {
    return writeJson(this.policyPath(policy.workspace_id), RuntimePolicySchema, policy) as RuntimePolicy;
  }

  writeObjective(objective: Objective): Objective {
    return writeJson(this.objectivePath(objective.workspace_id, objective.objective_id), ObjectiveSchema, objective) as Objective;
  }

  writeOtUnit(otunit: OTUnit): OTUnit {
    return writeJson(this.otunitPath(otunit.workspace_id, otunit.otunit_id), OTUnitSchema, otunit) as OTUnit;
  }

  writeEvidenceCandidate(candidate: EvidenceCandidate): EvidenceCandidate {
    return writeJson(
      this.evidenceCandidatePath(candidate.workspace_id, candidate.candidate_id),
      EvidenceCandidateSchema,
      candidate
    ) as EvidenceCandidate;
  }

  writeEvidence(evidence: Evidence): Evidence {
    return writeJson(this.evidencePath(evidence.workspace_id, evidence.evidence_id), EvidenceSchema, evidence) as Evidence;
  }

  writeReview(review: Review): Review {
    return writeJson(this.reviewPath(review.workspace_id, review.review_id), ReviewSchema, review) as Review;
  }

  writeAdjust(adjust: Adjust): Adjust {
    return writeJson(this.adjustPath(adjust.workspace_id, adjust.adjust_id), AdjustSchema, adjust) as Adjust;
  }

  appendSessionEvent(event: SessionEvent): SessionEvent {
    return appendJsonl(this.sessionsPath(event.workspace_id), SessionEventSchema, event) as SessionEvent;
  }

  appendAuditLog(audit: AuditLog): AuditLog {
    return appendJsonl(this.auditPath(audit.workspace_id), AuditLogSchema, audit) as AuditLog;
  }

  appendSkillRun(log: SkillRunLog): SkillRunLog {
    return appendJsonl(this.skillRunsPath(log.workspace_id), SkillRunLogSchema, log) as SkillRunLog;
  }

  appendMemory(workspaceId: string, value: Record<string, unknown>): Record<string, unknown> {
    ensureParent(this.memoryPath(workspaceId));
    appendFileSync(this.memoryPath(workspaceId), `${JSON.stringify(value)}\n`);
    return value;
  }

  readWorkspace(workspaceId: string): Workspace | null {
    return readJson(this.workspacePath(workspaceId), WorkspaceSchema) as Workspace | null;
  }

  readCompany(workspaceId: string): Company | null {
    return readJson(this.companyPath(workspaceId), CompanySchema) as Company | null;
  }

  readUsers(workspaceId: string): User[] {
    return (readJson(this.usersPath(workspaceId), z.array(UserSchema)) ?? []) as User[];
  }

  readMemberships(workspaceId: string): Membership[] {
    return (readJson(this.membershipsPath(workspaceId), z.array(MembershipSchema)) ?? []) as Membership[];
  }

  readPolicy(workspaceId: string): RuntimePolicy | null {
    return readJson(this.policyPath(workspaceId), RuntimePolicySchema);
  }

  readObjective(workspaceId: string, objectiveId: string): Objective | null {
    return readJson(this.objectivePath(workspaceId, objectiveId), ObjectiveSchema) as Objective | null;
  }

  listObjectives(workspaceId: string): Objective[] {
    if (!existsSync(this.objectivesDir(workspaceId))) return [];
    return readDirJson(this.objectivesDir(workspaceId), ObjectiveSchema) as Objective[];
  }

  readOtUnit(workspaceId: string, otunitId: string): OTUnit | null {
    return readJson(this.otunitPath(workspaceId, otunitId), OTUnitSchema) as OTUnit | null;
  }

  listOtUnits(workspaceId: string): OTUnit[] {
    if (!existsSync(this.otunitsDir(workspaceId))) return [];
    return readDirJson(this.otunitsDir(workspaceId), OTUnitSchema) as OTUnit[];
  }

  readEvidenceCandidate(workspaceId: string, candidateId: string): EvidenceCandidate | null {
    return readJson(this.evidenceCandidatePath(workspaceId, candidateId), EvidenceCandidateSchema) as EvidenceCandidate | null;
  }

  listEvidenceCandidates(workspaceId: string): EvidenceCandidate[] {
    if (!existsSync(this.evidenceCandidatesDir(workspaceId))) return [];
    return readDirJson(this.evidenceCandidatesDir(workspaceId), EvidenceCandidateSchema) as EvidenceCandidate[];
  }

  readEvidence(workspaceId: string, evidenceId: string): Evidence | null {
    return readJson(this.evidencePath(workspaceId, evidenceId), EvidenceSchema) as Evidence | null;
  }

  listEvidence(workspaceId: string): Evidence[] {
    if (!existsSync(this.evidenceConfirmedDir(workspaceId))) return [];
    return readDirJson(this.evidenceConfirmedDir(workspaceId), EvidenceSchema) as Evidence[];
  }

  readReview(workspaceId: string, reviewId: string): Review | null {
    return readJson(this.reviewPath(workspaceId, reviewId), ReviewSchema) as Review | null;
  }

  listReviews(workspaceId: string): Review[] {
    if (!existsSync(this.reviewsDir(workspaceId))) return [];
    return readDirJson(this.reviewsDir(workspaceId), ReviewSchema) as Review[];
  }

  readAdjust(workspaceId: string, adjustId: string): Adjust | null {
    return readJson(this.adjustPath(workspaceId, adjustId), AdjustSchema) as Adjust | null;
  }

  listAdjusts(workspaceId: string): Adjust[] {
    if (!existsSync(this.adjustsDir(workspaceId))) return [];
    return readDirJson(this.adjustsDir(workspaceId), AdjustSchema) as Adjust[];
  }

  readAuditLog(workspaceId: string): AuditLog[] {
    return readJsonl(this.auditPath(workspaceId), AuditLogSchema) as AuditLog[];
  }

  readSessionEvents(workspaceId: string): SessionEvent[] {
    return readJsonl(this.sessionsPath(workspaceId), SessionEventSchema) as SessionEvent[];
  }

  readSkillRuns(workspaceId: string): SkillRunLog[] {
    return readJsonl(this.skillRunsPath(workspaceId), SkillRunLogSchema) as SkillRunLog[];
  }
}

function readDirJson<T>(dirPath: string, schema: JsonSchemaLike<T>): T[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => readJson(join(dirPath, entry), schema))
    .filter((value): value is T => value !== null);
}
