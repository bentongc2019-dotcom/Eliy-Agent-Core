AGENTS.md｜Eliy Native Engineering Rules

1. Project Purpose

Eliy Native is the clean engineering baseline for Eliy’s HAC-Agent Native Runtime.

The current phase is Runtime Kernel L0 / L1.

The first milestone is a repeatable Terminal Runtime Proof for this operating loop:

Workspace
  → Objective
  → OTUnit
  → Evidence
  → Review / Adjust
  → Close
  → Objective Achievement

This project follows:

Runtime-first
Terminal-first
UI-later

⸻

2. Repository Boundary

This repository is the clean Eliy Native runtime baseline.

All Runtime Kernel L0 / L1 implementation work belongs inside this repository.

Existing Eliy Beta 1.0 / Beta 2.0 codebases serve as reference materials only when explicitly provided.

This repository is not a migration layer or compatibility layer.

The current milestone is to prove the Eliy Native Runtime Kernel through terminal-first implementation and CLI-based runtime proof.

⸻

3. Core Terms

Use these terms consistently.

Term	Meaning
HAC-Agent	Human-Agency-Centered Agent / 主体型智能体范式
Eliy	Commercial product implementation of HAC-Agent in business operating contexts
Eliy Native	HAC-Agent Native Runtime engineering baseline for Eliy
Workspace	Runtime boundary
Company	Operating subject
Objective	First operating object; an operating hypothesis rather than an arbitrary goal
OTUnit	Objective Task Unit; the minimal operating task unit under an Objective
Evidence	Traceable fact layer
Review	Evidence-backed operating review
Adjust	Confirmed operating adjustment
Audit	Trace log for critical state changes
RuntimeResult	Standard output contract for runtime commands
HLAMT.md	Runtime Asset hypothesis for human intelligence augmentation context

Standard naming:

Chinese user-facing name: O 单
Formal English name: Objective Task Unit
Engineering abbreviation: OTUnit

Use the unhyphenated formal name:

Objective Task Unit

Use these engineering names:

OTUnit
otunit_id
otunit_code
OTUnitStatus
otunits/

⸻

4. Architecture Principles

4.1 Runtime before UI

Implement runtime objects, state transitions, stores, audit, CLI, and tests before front-end UI.

4.2 Terminal before product polish

The first proof runs through terminal and CLI commands.

4.3 Schema before screen

Define typed schemas and validation before presentation or interaction layers.

4.4 Confirmation before write

Critical writes follow this flow:

Candidate / Draft / Proposal
  → User Confirmation
  → Canonical Object
  → Persist
  → Audit

4.5 Evidence before memory

Evidence is the traceable fact layer.

Memory is a later-stage experience abstraction.

Treat Evidence and Memory as separate runtime layers.

4.6 Skill output before Skill autonomy

Skills propose candidates, drafts, questions, judgments, and updates.

Runtime validates Skill output, applies required confirmation, persists canonical objects, and records audit logs.

4.7 Audit before automation

Critical state changes are auditable before automation is expanded.

4.8 RuntimeResult as output contract

CLI, future Gateway, and future UI consume the same RuntimeResult shape.

⸻

5. Current Build Scope

Current scope is Runtime Kernel L0 / L1.

Implement:

schemas
local file store
runtime result
audit log
state machine
CLI commands
tests
HAC-Agent governance loader
HLAMT loader
skill stubs
terminal runtime proof

The current milestone runs through terminal and CLI.

⸻

6. Later Phase Scope

The following belong to later phases:

front-end UI
login page
production auth
complex multi-tenant admin
full Gateway
full MCP integration
external CRM / Slack / Feishu / calendar integrations
full LLM agent loop
Company Brain
automatic memory write
production deployment

Use lightweight placeholders only where needed for L0 / L1.

⸻

7. Required Tech Stack

Use:

TypeScript
Node.js
pnpm
tsx
vitest
zod
commander

Use local storage first:

JSON / JSONL local file store

Database infrastructure belongs to a later phase.

⸻

8. Directory Rules

Create or preserve this structure:

eliy-native/
  README.md
  AGENTS.md
  HAC_AGENT.md
  HLAMT.md
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    runtime/
      kernel/
        commands/
        schemas/
        state/
        stores/
        loaders/
        registries/
        policies/
        audit/
        result/
        errors/
        skills/
        tests/
    cli/
      eliy.ts
      commands/
  skills/
    o-pdca/
      SKILL.md
      references/
    sfocus/
      SKILL.md
      references/
    review/
      SKILL.md
      references/
    evidence-extract/
      SKILL.md
      references/
    language-style/
      SKILL.md
      references/
  data/
    workspaces/
  docs/
    runtime-kernel.md
    terminal-proof.md

Directory meaning:

Directory	Purpose
src/runtime/kernel/skills/	Skill loader, skill runner, and SkillRun logging code
skills/	Skill assets using SKILL.md + references/
data/workspaces/	Workspace-scoped runtime data
docs/	Engineering docs and terminal proof instructions

⸻

9. Core Objects

Implement these objects with TypeScript interfaces and Zod schemas:

Workspace
Company
User
Membership
RuntimePolicy
Objective
OTUnit
Evidence
EvidenceCandidate
Review
Adjust
SessionEvent
AuditLog
RuntimeResult
RuntimeError

Every object includes:

stable ID
workspace_id where applicable
created_at
updated_at where applicable
schema validation

⸻

10. Object Rules

10.1 Workspace

Workspace is the runtime boundary.

All operating objects belong to a Workspace.

10.2 Company

Company is the operating subject.

Company provides business context.

10.3 Objective

Objective is the first operating object.

An Objective is an operating hypothesis. It should be:

based on internal and external intelligence
testable through Evidence
reviewable through Review
adjustable through Adjust
used to guide OTUnit execution

10.4 OTUnit

OTUnit means:

Objective Task Unit

OTUnit is the minimal operating task unit under an Objective.

A canonical OTUnit includes:

objective_id

Inputs without objective_id are represented as candidates, notes, raw inputs, or ordinary tasks.

10.5 Evidence

Evidence is the traceable fact layer.

Confirmed Evidence includes source, time, summary, linked objects, and confirmation state.

10.6 Review

Review references Evidence.

Review follows:

Expected
Actual
Gap
Reason
Adjustment
Evidence

10.7 Adjust

Adjust follows:

Proposed
  → Confirmed
  → Applied

10.8 Audit

Critical writes and state transitions create AuditLog entries.

⸻

11. Operating Rhythm

The default operating rhythm is weekly.

Use:

review_cycle: "weekly" | "biweekly" | "custom";
review_at: string;

Default:

review_cycle: "weekly";

Guideline:

weekly = default operating rhythm
biweekly = configurable for higher-complexity or cross-functional OTUnits
custom = special-case configuration

⸻

12. Confirmation Policy

The following actions require confirmation:

create_objective
update_objective
create_otunit
update_otunit_owner
update_otunit_due_at
mark_otunit_completed
close_otunit
create_review
apply_adjust
update_objective_achievement
write_memory

Standard rule:

AI proposes.
User confirms.
Runtime persists.
Audit records.

⸻

13. HAC-Agent Governance

Create:

HAC_AGENT.md
src/runtime/kernel/policies/hac-agent.ts

Minimum governance rules:

hac_agent:
  require_confirmation_for_writes: true
  require_evidence_for_review: true
  preserve_user_agency: true
  explain_judgment_basis: true
  audit_critical_transitions: true
  prevent_unconfirmed_memory_write: true

RuntimeResult and AuditLog include:

used_hac_governance: boolean;

For L0 / L1, default to:

used_hac_governance: true;

⸻

14. HLAMT.md Runtime Asset

Create:

HLAMT.md
src/runtime/kernel/loaders/hlamt-loader.ts

Minimum implementation:

1. Load HLAMT.md at runtime start.
2. Generate hlamt_context_summary.
3. Record used_hlamt_context in RuntimeResult.
4. Record used_hlamt_context in AuditLog.
5. Allow skill stubs to read hlamt_context_summary.

L0 / L1 implements only the minimal loader and traceable usage record.

⸻

15. Skill Rules

Use this structure:

skills/
  <skill-name>/
    SKILL.md
    references/

Initial skill assets:

o-pdca
sfocus
review
evidence-extract
language-style

Each SKILL.md includes:

name
description
when_to_use
inputs
outputs
required_context
evidence_requirement
confirmation_requirement
allowed_actions
forbidden_actions
workflow
quality_checks
test_fixtures

Skills may output:

candidate
draft
proposal
question
judgment

Skills may write to:

RuntimeResult
SkillRunLog
candidate / draft / proposal structures

Canonical object writes are handled by Runtime after validation and required confirmation.

⸻

16. RuntimeResult Contract

All runtime commands return a standard RuntimeResult.

Minimum shape:

interface RuntimeResult<T = unknown> {
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
}

CLI, future Gateway, and future UI consume the same RuntimeResult contract.

⸻

17. Local Store Rules

Use this local store structure:

data/
  workspaces/
    <workspace_id>/
      workspace.json
      company.json
      policy.json
      users.json
      memberships.json
      objectives/
        <objective_id>.json
      otunits/
        <otunit_id>.json
      evidence/
        candidates/
          <candidate_id>.json
        confirmed/
          <evidence_id>.json
      reviews/
        <review_id>.json
      adjusts/
        <adjust_id>.json
      sessions/
        events.jsonl
      audit/
        audit.jsonl
      skill_runs/
        skill_runs.jsonl
      memory/
        operating_memory.jsonl

Rules:

1. Each Workspace has an isolated directory.
2. JSON objects validate against schemas before write.
3. JSONL append operations are safe.
4. Store write failures return structured RuntimeError.
5. Store errors are visible in RuntimeResult.

⸻

18. Testing Rules

Use vitest.

Required command:

pnpm test

Tests pass before reporting completion.

Minimum coverage:

Workspace Isolation
Runtime Policy Load
HAC-Agent Governance Load
HLAMT.md Load
Objective Creation
OTUnit Creation
OTUnit State Machine
Evidence Candidate Creation
Evidence Confirmation
Review Creation
Adjust Apply
OTUnit Close
Objective Achievement Update
Audit Log Write
RuntimeResult Shape

⸻

19. Coding Rules

Follow these coding rules:

1. Use TypeScript strict mode.
2. Validate input and persisted objects with Zod.
3. Keep runtime logic separate from CLI formatting.
4. Keep schemas separate from stores.
5. Keep stores separate from commands.
6. Keep commands small and testable.
7. Use deterministic IDs or injectable ID generators in tests.
8. Return structured errors.
9. Avoid hidden global state.
10. Keep external integrations for later phases.

⸻

20. Terminal Runtime Proof

The proof demonstrates this full loop through CLI:

Create Workspace
  → Create Objective
  → Create OTUnit
  → Follow up OTUnit
  → Generate Evidence Candidate
  → Confirm Evidence
  → Create Review
  → Apply Adjust
  → Close OTUnit
  → Update Objective Achievement
  → Print Audit Log
  → Print RuntimeResult Summary

Pass criteria:

all objects have IDs
all objects belong to Workspace
OTUnit belongs to Objective
Evidence is traceable
Review references Evidence
Adjust updates target object
Close writes Audit
RuntimeResult is consistent
proof runs entirely through CLI

⸻

21. Completion Report

After completing a task, report:

1. Files created or changed
2. Objects implemented
3. CLI commands implemented
4. Tests added
5. Test results
6. Terminal Runtime Proof result
7. RuntimeResult sample
8. AuditLog sample
9. Blocked decisions, if any
10. Current git status

Report completion after tests have been run.

⸻

22. Current Phase Completion Criteria

L0 / L1 is complete when:

1. Runtime runs through CLI
2. CLI can run the first operating loop
3. OTUnit belongs to Objective
4. Evidence is traceable
5. Review references Evidence
6. Adjust requires confirmation and updates target object
7. OTUnit can close
8. Objective Achievement can update
9. Critical writes produce AuditLog
10. RuntimeResult shape is consistent
11. HAC-Agent Governance is loaded
12. HLAMT.md is loaded
13. Tests pass with pnpm test
14. README explains how to reproduce the proof
