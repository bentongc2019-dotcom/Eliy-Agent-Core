# OTUnit Terminal Core Loop Skeleton

This document describes the deterministic terminal-only OTUnit core loop skeleton
with structured field capture added in PR #36.

## Command

```bash
corepack pnpm otunit:loop
```

Direct CLI path:

```bash
corepack pnpm exec tsx src/cli/eliy.ts otunit-core-loop
```

## Behavior

The OTUnit core loop skeleton is a deterministic terminal-only command that guides a finite OTUnit core flow.

### Flow Steps

| Step | Description | Existing Boundary Used |
|------|-------------|----------------------|
| 1 | Prompt for business text input | Readline input |
| 2 | Prompt for structured fields (objective, owner, due date, judgment criteria, plan/action items, optional evidence refs) | Readline input |
| 3 | Validate required structured fields | Deterministic check |
| 4 | Validate evidence refs (if non-empty) through existing boundary | `validateEvidenceRefs` |
| 5 | Detect draft intent from business text wrapper | `detectOTUnitDraftIntent` |
| 6 | Produce plan-aware draft preview with captured fields overlaid | `previewOTUnitDraftFromChat` |
| 7 | Print improved draft preview displaying captured fields instead of all-missing checklist | Console output |
| 8 | Print human-readable O 单 summary | Console output |
| 9 | Require first confirmation: approve preview for proposed OTUnit creation | Readline input |
| 10 | Create proposed OTUnit using captured owner and dueDate | `createProposedOTUnitFromConfirmedPreview` |
| 11 | Require second confirmation: confirm proposed OTUnit into confirmed status | Readline input |
| 12 | Create confirmed OTUnit using captured owner and dueDate | `confirmProposedOTUnit` |
| 13 | Save confirmed OTUnit to in-memory repository | `createInMemoryOTUnitRepository.save` |
| 14 | Verify getById returns the confirmed OTUnit | `repository.getById` |
| 15 | Verify listByObjectiveId includes the confirmed OTUnit | `repository.listByObjectiveId` |
| 16 | Print deterministic final summary | JSON output |

### Commands

- `eliy otunit-core-loop` — the terminal-only skeleton command
- Does not accept mutation subcommands (no `create`, `save`, `show`, `confirm`, `list`)
- Supports `/exit` at any prompt to exit cleanly
- Missing business text returns deterministic message

### Summary Output

The final summary is a JSON object with additional structured field capture fields:

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | Whether all steps completed successfully |
| `command` | string | `"otunit-core-loop"` |
| `mode` | string | `"terminal_skeleton"` |
| `stepReached` | string | Highest step reached |
| `draftIntentCreated` | boolean | Draft intent detected in business text |
| `draftPreviewCreated` | boolean | Plan-aware draft preview created |
| `businessTextCaptured` | boolean | Business text was captured |
| `structuredFieldsCaptured` | boolean | All required structured fields captured |
| `objectiveCaptured` | boolean | Objective field captured |
| `ownerCaptured` | boolean | Owner field captured |
| `dueDateCaptured` | boolean | Due date field captured |
| `judgmentCriteriaCaptured` | boolean | Judgment criteria field captured |
| `planOrActionItemsCaptured` | boolean | Plan or action items field captured |
| `evidenceRefsCaptured` | boolean | Evidence refs were provided |
| `evidenceRefsValid` | boolean | Evidence refs passed validation boundary |
| `humanReadableSummaryPrinted` | boolean | O 单 summary was printed |
| `previewConfirmed` | boolean | Preview confirmation was explicit |
| `proposedOTUnitCreated` | boolean | Proposed OTUnit was created |
| `proposedOTUnitConfirmed` | boolean | Proposed OTUnit was confirmed |
| `confirmedOTUnitCreated` | boolean | Confirmed OTUnit was created |
| `repositorySaved` | boolean | Confirmed OTUnit saved to in-memory repository |
| `repositoryGetByIdVerified` | boolean | Repository getById verified |
| `repositoryListByObjectiveIdVerified` | boolean | Repository listByObjectiveId verified |
| `chatWrites` | false | No chat writes |
| `persistence` | false | No filesystem/database/network persistence |
| `durableRuntimeState` | false | No durable runtime state |
| `providerRequired` | false | No provider configuration needed |

### Stop Conditions

| Condition | Stops Before | Behavior |
|-----------|-------------|----------|
| Empty business text | Structured field capture | Returns `ok: false`, `stepReached: "none"` |
| `/exit` at business text prompt | Draft intent detection | Prints "core loop exited" message |
| Missing required structured field | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "structured_fields_read"` with `missingFields` array |
| Invalid evidence refs (duplicate after delimiter normalization) | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "structured_fields_read"` with `evidenceRefsValid: false` |
| Ambiguous preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| Unrecognized preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| Empty preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| `/exit` at preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| Ambiguous proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |
| Unrecognized proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |
| Empty proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |
| `/exit` at proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |

### Evidence Refs Delimiter Normalization

Evidence refs input accepts the following delimiters (all normalized deterministically
before validation):

| Delimiter | Unicode | Example |
|-----------|---------|--------|
| English comma | `,` | `ref1,ref2` |
| Chinese full-width comma | `xEFxBCx8C` (U+FF0C) | `ref1，ref2` |
| Chinese enumeration comma | `xE3x80x81` (U+3001) | `ref1、ref2` |

Normalization behavior:

- All delimiters are normalized to English comma `,` before splitting.
- Whitespace around each ref is trimmed.
- Empty evidence refs input (raw empty string) is accepted and becomes `[]`.
- Duplicate refs after delimiter normalization are invalid.

Examples:

| Input | Parsed Refs | Valid |
|-------|-------------|-------|
| (empty) | `[]` | yes |
| `ref1,ref2` | `["ref1", "ref2"]` | yes |
| `ref1，ref2` | `["ref1", "ref2"]` | yes |
| `ref1、ref2` | `["ref1", "ref2"]` | yes |
| `ref1, ref2，ref3、ref4` | `["ref1", "ref2", "ref3", "ref4"]` | yes |
| `ref1,ref1` | `["ref1", "ref1"]` | no (duplicate) |
| `ref1，ref1` | `["ref1", "ref1"]` | no (duplicate) |
| `ref1、ref1` | `["ref1", "ref1"]` | no (duplicate) |


### Boundary

- No database
- No filesystem persistence
- No network storage
- No provider integration
- No AI generation
- No normal chat writes
- No durable runtime state
- No deployment action
+ No mutation-oriented CLI subcommands
- No mutation-oriented OTUnit CLI command (the existing `eliy otunit` command remains inspection-only)
- Structured field capture is terminal-only and deterministic
- Captured structured fields must not persist across process exit
- Evidence refs use existing `validateEvidenceRefs` boundary
- Preview displays captured fields instead of all-missing checklist
- Confirmed OTUnit uses captured owner and dueDate
- List/show reflect captured owner and dueDate

### List/Show Behavior

After a successful confirmed OTUnit save, the terminal skeleton exposes deterministic
session-local list/show output. The list/show loop reads only from the process-local
in-memory repository. It does not persist after process exit.

#### Available Commands

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON
- `show <id>` — prints one OTUnit detail by id as JSON
- `/exit` — exits the loop

`list` output includes:

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` |
| `action` | string | `"list"` |
| `repositorySource` | string | `"process_local_in_memory"` |
| `count` | number | Number of OTUnits listed |
| `persistence` | boolean | `false` |
| `durableRuntimeState` | boolean | `false` |
| `readOnly` | boolean | `true` |
| `otunits` | array | List of OTUnit summaries with id, title, objectiveId, owner, dueDate, status, requiresConfirmation |

`show <id>` output (found) includes:

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` |
| `action` | string | `"show"` |
| `found` | boolean | `true` |
| `id` | string | The requested OTUnit id |
| `repositorySource` | string | `"process_local_in_memory"` |
| `persistence` | boolean | `false` |
| `durableRuntimeState` | boolean | `false` |
| `readOnly` | boolean | `true` |
| `otunit` | object | Full OTUnit detail including id, title, objectiveId, owner, dueDate, status, requiresConfirmation, evidenceRefs, createdAt |

`show <missing-id>` output (not found) includes:

| Field | Value |
|-------|-------|
| `ok` | `false` |
| `found` | `false` |
| `id` | The requested id |
| `message` | `"OTUnit not found in this process-local session repository."` |
| `persistence` | `false` |
| `durableRuntimeState` | `false` |
| `readOnly` | `true` |

### Boundary Additions

- List/show read only from the process-local in-memory repository
- List/show reflect captured owner and dueDate
- List/show do not persist after process exit
- List/show do not create, confirm, mutate, or delete OTUnits

### Structured Context Snapshot

After confirmed OTUnit creation, the terminal skeleton retains a process-local structured
context snapshot linked by the confirmed OTUnit id. This snapshot is read-only and exists
only in process-local session memory. It does not persist after process exit.

The snapshot includes:

- objective text
- title / business text
- owner
- due date or check time
- judgment criteria
- plan / action items
- evidence refs

#### Available Commands (Updated)

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON, with `structuredContextAvailable` field
- `show <id>` — prints human-readable O 单 detail (if structured context is available) followed by machine-readable JSON
- `/exit` or `exit` — exits the loop

`list` output (updated):

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` |
| `action` | string | `"list"` |
| `repositorySource` | string | `"process_local_in_memory"` |
| `count` | number | Number of OTUnits listed |
| `persistence` | boolean | `false` |
| `durableRuntimeState` | boolean | `false` |
| `readOnly` | boolean | `true` |
| `otunits` | array | List of OTUnit summaries with id, title, objectiveId, owner, dueDate, status, requiresConfirmation, structuredContextAvailable |

`show <id>` output (found, with structured context):

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` |
| `action` | string | `"show"` |
| `found` | boolean | `true` |
| `id` | string | The requested OTUnit id |
| `repositorySource` | string | `"process_local_in_memory"` |
| `persistence` | boolean | `false` |
| `durableRuntimeState` | boolean | `false` |
| `readOnly` | boolean | `true` |
| `otunit` | object | Full OTUnit detail (existing fields) |
| `structuredContextAvailable` | boolean | Whether structured context snapshot is available for this OTUnit |
| `structuredContext` | object | Structured context snapshot (objective, title, owner, dueDate, judgmentCriteria, planOrActionItems, evidenceRefs) |

`show <id>` output (found, without structured context):

| Field | Value |
|-------|-------|
| `structuredContextAvailable` | `false` |
| (human-readable) | `"Structured context snapshot not available for this OTUnit in the current process-local session."` |

`show <missing-id>` output (not found):

| Field | Value |
|-------|-------|
| `ok` | `false` |
| `found` | `false` |
| `id` | The requested id |
| `message` | `"OTUnit not found in this process-local session repository."` |
| `persistence` | `false` |
| `durableRuntimeState` | `false` |
| `readOnly` | `true` |

#### Unrecognized Command Behavior

An unrecognized command in the otunit> command loop returns a deterministic message:

```
Unrecognized command: <command>. You are inside the OTUnit session command loop. Use list, show <id>, /exit, or exit.
```

#### Human-readable show detail example

```
--- O 单 Detail ---
Objective: Q3 收入目标
OTUnit: 完成第一批体验客户访谈
Owner: rich
Due / Check Time: 2026-12-31
Judgment Criteria: 完成 3 位体验客户访谈并形成记录
Plan / Action Items:
1. 约访客户
2. 完成访谈
3. 记录结论
Evidence Refs: ref1, ref2, ref3, ref4
Status: confirmed
Repository: process-local in-memory
Persistence: false
```

### Boundary Additions (Structured Context)

- Structured context snapshot is process-local session memory only
- Snapshot is linked by confirmed OTUnit id
- Snapshot does not persist after process exit
- list shows structuredContextAvailable for each OTUnit
- show <id> displays human-readable O 单 detail when structured context is available
- Missing structured context returns deterministic message without crashing
- exit is an alias for /exit in the otunit> command loop
- Unrecognized command message clearly indicates OTUnit session context
- No database / no filesystem persistence / no provider integration / no follow-up record behavior
- Existing otunit command remains inspection-only
