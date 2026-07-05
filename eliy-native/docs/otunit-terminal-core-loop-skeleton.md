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

### Follow-up Record Behavior (PR #39)

After a confirmed OTUnit exists in the process-local session repository, the otunit-core-loop supports
the `follow <id>` command to add a single follow-up record text.

#### Available Commands (Updated)

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON, with `structuredContextAvailable` and `followUpRecordCount` fields
- `show <id>` — prints human-readable O 单 detail (if structured context is available) and follow-up records, followed by machine-readable JSON
- `follow <id>` — adds a follow-up record for a confirmed OTUnit (see follow flow below)
- `/exit` or `exit` — exits the loop

#### Follow-up Record Flow

The `follow <id>` command:

1. Verifies the OTUnit exists in the process-local repository via `getById`.
2. If the OTUnit is not found, returns a deterministic not-found message and does not prompt/save.
3. Prompts the user for follow-up record text.
4. If the follow-up text is blank, returns a deterministic blank-text stop message and does not save.
5. Prints a human-readable follow-up preview showing the OTUnit title, id, follow-up text, repository source, and persistence flag.
6. Asks for explicit confirmation to save.
7. If the confirmation signal is not `confirm` or `确认`, stops deterministically without saving.
8. If confirmed, saves the follow-up record to process-local session memory linked by the confirmed OTUnit id.
9. Prints machine-readable success output with the saved follow-up record details.

#### Follow-up Record Properties

- Records are process-local session memory only (`Map<string, FollowUpRecord[]>`)
- Records are linked by confirmed OTUnit id
- Records are not persisted after process exit
- Records do not change OTUnit status, confirmation state, review state, check records, adjust records, revision records, evidence records, or repository persistence
- Records do not create review/check/adjust/revision behavior
- Records do not mutate the OTUnit itself
- Record IDs are deterministic: `session-follow-up-1`, `session-follow-up-2`, etc.

#### Follow-up Record Shape

```
{
  id: string;           // deterministic: session-follow-up-1, session-follow-up-2, etc.
  otunitId: string;     // confirmed OTUnit id
  text: string;         // follow-up record text
  createdAt: string;    // ISO timestamp
}
```

#### Follow-up Preview Example

```
--- Follow-up Preview ---
OTUnit: 完成第一批体验客户访谈
OTUnit ID: session-confirmed-preview-otunit
Follow-up Text: 今天完成 2 位客户访谈，并约好第 3 位
Repository: process-local in-memory
Persistence: false

Confirm save follow-up record? (confirm to save, /exit to quit):
```

#### Follow-up Command Machine-readable Output (Success)

```
{
  "ok": true,
  "action": "follow",
  "found": true,
  "id": "session-confirmed-preview-otunit",
  "followUpSaved": true,
  "followUpRecord": {
    "id": "session-follow-up-1",
    "otunitId": "session-confirmed-preview-otunit",
    "text": "今天完成 2 位客户访谈，并约好第 3 位",
    "createdAt": "<ISO timestamp>"
  },
  "otunitMutated": false,
  "otunitStatusChanged": false,
  "repositorySource": "process_local_in_memory",
  "persistence": false,
  "durableRuntimeState": false,
  "providerRequired": false,
  "chatWrites": false
}
```

#### Follow-up Missing-id Output

```
{
  "ok": false,
  "action": "follow",
  "found": false,
  "id": "missing-id",
  "message": "OTUnit not found in this process-local session repository.",
  "followUpSaved": false,
  ...
}
```

#### Follow-up Blank-text Output

```
{
  "ok": false,
  "action": "follow",
  "found": true,
  "id": "<otunit-id>",
  "message": "Blank follow-up text. No follow-up record saved.",
  "followUpSaved": false,
  ...
}
```

#### Follow-up Ambiguous Confirmation Output

```
{
  "ok": false,
  "action": "follow",
  "found": true,
  "id": "<otunit-id>",
  "followUpPreviewPrinted": true,
  "followUpConfirmed": false,
  "followUpSaved": false,
  ...
}
```

#### list Output (Updated)

| Field | Type | Description |
|-------|------|-------------|
| ... | ... | (all existing fields) |
| `otunits[].followUpRecordCount` | number | Number of follow-up records for this OTUnit |

#### show Output (Updated)

After a follow-up record is saved, `show <id>` displays:

Human-readable:
```
--- O 单 Detail ---
...
Status: confirmed
...

--- Follow-up Records ---
1. <follow-up text>
```

Machine-readable (extended with):

| Field | Type | Description |
|-------|------|-------------|
| `followUpRecordCount` | number | Number of follow-up records for this OTUnit |
| `followUpRecords` | array | Array of follow-up record objects with id, otunitId, text, createdAt |

#### Boundary

- Follow-up records are process-local session memory only
- No database, no filesystem persistence, no network storage
- No provider integration, no AI generation
- No normal chat writes
- No durable runtime state
- No OTUnit mutation (status, confirmation, review, adjust, revision)
- Existing otunit command remains inspection-only
- No mutation subcommands under existing otunit

### Review/Check Record Behavior (PR #40)

After a confirmed OTUnit exists in the process-local session repository, the otunit-core-loop supports
the `check <id>` command to add a single review/check record for a confirmed OTUnit.

#### Available Commands (Updated)

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON, with `structuredContextAvailable`, `followUpRecordCount`, and `reviewCheckRecordCount` fields
- `show <id>` — prints human-readable O 单 detail (if structured context is available), follow-up records, and review/check records, followed by machine-readable JSON
- `follow <id>` — adds a follow-up record for a confirmed OTUnit
- `check <id>` — adds a review/check record for a confirmed OTUnit (see check flow below)
- `/exit` or `exit` — exits the loop

#### Review/Check Record Flow

The `check <id>` command:

1. Verifies the OTUnit exists in the process-local repository via `getById`.
2. If the OTUnit is not found, returns a deterministic not-found message and does not prompt/save.
3. Prompts the user for check result text.
4. If the check result text is blank, returns a deterministic blank-result stop message and does not save.
5. Prompts the user for difference / variance text.
6. If the difference / variance text is blank, returns a deterministic blank-difference stop message and does not save.
7. Prints a human-readable review/check preview showing the OTUnit title, id, check result, difference/variance, repository source, and persistence flag.
8. Asks for explicit confirmation to save.
9. If the confirmation signal is not `confirm` or `确认`, stops deterministically without saving.
10. If confirmed, saves the review/check record to process-local session memory linked by the confirmed OTUnit id.
11. Prints machine-readable success output with the saved review/check record details.

#### Review/Check Record Properties

- Records are process-local session memory only (`Map<string, ReviewCheckRecord[]>`)
- Records are linked by confirmed OTUnit id
- Records are not persisted after process exit
- Records do not change OTUnit status, confirmation state, follow-up records, structured context snapshots, adjust records, revision records, evidence records, or repository persistence
- Records do not close, revise, adjust, or mutate the OTUnit itself
- Records do not create follow-up/adjust/revision behavior
- Record IDs are deterministic: `session-check-record-1`, `session-check-record-2`, etc.

#### Review/Check Record Shape

```
{
  id: string;           // deterministic: session-check-record-1, session-check-record-2, etc.
  otunitId: string;     // confirmed OTUnit id
  resultText: string;   // check result text
  differenceText: string; // difference / variance text
  createdAt: string;    // ISO timestamp
}
```

#### Review/Check Preview Example

```
--- Review / Check Preview ---
OTUnit: 完成第一批体验客户访谈
OTUnit ID: session-confirmed-preview-otunit
Check Result: 已完成 2 位客户访谈，第 3 位已预约
Difference / Variance: 距离判断标准还差 1 位客户访谈记录
Repository: process-local in-memory
Persistence: false

Confirm save review/check record? (confirm to save, /exit to quit):
```

#### Check Command Machine-readable Output (Success)

```
{
  "ok": true,
  "action": "check",
  "found": true,
  "id": "session-confirmed-preview-otunit",
  "reviewCheckSaved": true,
  "reviewCheckRecord": {
    "id": "session-check-record-1",
    "otunitId": "session-confirmed-preview-otunit",
    "resultText": "已完成 2 位客户访谈，第 3 位已预约",
    "differenceText": "距离判断标准还差 1 位客户访谈记录",
    "createdAt": "<ISO timestamp>"
  },
  "otunitMutated": false,
  "otunitStatusChanged": false,
  "otunitClosed": false,
  "otunitRevised": false,
  "adjustmentCreated": false,
  "repositorySource": "process_local_in_memory",
  "persistence": false,
  "durableRuntimeState": false,
  "providerRequired": false,
  "chatWrites": false
}
```

#### Check Missing-id Output

```
{
  "ok": false,
  "action": "check",
  "found": false,
  "id": "missing-id",
  "message": "OTUnit not found in this process-local session repository.",
  "reviewCheckSaved": false,
  ...
}
```

#### Check Blank-result Output

```
{
  "ok": false,
  "action": "check",
  "found": true,
  "id": "<otunit-id>",
  "message": "Blank check result text. No review/check record saved.",
  "reviewCheckSaved": false,
  ...
}
```

#### Check Blank-difference Output

```
{
  "ok": false,
  "action": "check",
  "found": true,
  "id": "<otunit-id>",
  "message": "Blank difference / variance text. No review/check record saved.",
  "reviewCheckSaved": false,
  ...
}
```

#### Check Ambiguous Confirmation Output

```
{
  "ok": false,
  "action": "check",
  "found": true,
  "id": "<otunit-id>",
  "reviewCheckPreviewPrinted": true,
  "reviewCheckConfirmed": false,
  "reviewCheckSaved": false,
  ...
}
```

#### list Output (Updated)

| Field | Type | Description |
|-------|------|-------------|
| ... | ... | (all existing fields) |
| `otunits[].followUpRecordCount` | number | Number of follow-up records for this OTUnit |
| `otunits[].reviewCheckRecordCount` | number | Number of review/check records for this OTUnit |

#### show Output (Updated)

After a review/check record is saved, `show <id>` displays:

Human-readable:
```
--- O 单 Detail ---
...
Status: confirmed
...

--- Follow-up Records ---
1. <follow-up text>

--- Review / Check Records ---
1. Result: <check result text>
   Difference / Variance: <difference text>
```

Machine-readable (extended with):

| Field | Type | Description |
|-------|------|-------------|
| `followUpRecordCount` | number | Number of follow-up records for this OTUnit |
| `followUpRecords` | array | Array of follow-up record objects with id, otunitId, text, createdAt |
| `reviewCheckRecordCount` | number | Number of review/check records for this OTUnit |
| `reviewCheckRecords` | array | Array of review/check record objects with id, otunitId, resultText, differenceText, createdAt |

#### Boundary

- Review/check records are process-local session memory only
- No database, no filesystem persistence, no network storage
- No provider integration, no AI generation
- No normal chat writes
- No durable runtime state
- No OTUnit mutation (status, confirmation, follow-up, review, adjust, revision)
- No OTUnit close, revise, or adjust behavior
- Existing otunit command remains inspection-only
- No mutation subcommands under existing otunit
- Existing follow-up record behavior remains unchanged
- Existing evidence refs delimiter normalization remains unchanged
- Existing structured context snapshot behavior remains unchanged

### Adjust Record Behavior (PR #41)

After a confirmed OTUnit exists in the process-local session repository, the otunit-core-loop supports
the `adjust <id>` command to add a single adjust record for a confirmed OTUnit.

#### Available Commands (Updated)

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON, with `structuredContextAvailable`, `followUpRecordCount`, `reviewCheckRecordCount`, and `adjustRecordCount` fields
- `show <id>` — prints human-readable O 单 detail (if structured context is available), follow-up records, review/check records, and adjust records, followed by machine-readable JSON
- `follow <id>` — adds a follow-up record for a confirmed OTUnit
- `check <id>` — adds a review/check record for a confirmed OTUnit
- `adjust <id>` — adds an adjust/improvement record for a confirmed OTUnit (see adjust flow below)
- `/exit` or `exit` — exits the loop

#### Adjust Record Flow

The `adjust <id>` command:

1. Verifies the OTUnit exists in the process-local repository via `getById`.
2. If the OTUnit is not found, returns a deterministic not-found message and does not prompt/save.
3. Prompts the user for adjustment / improvement action text.
4. If the action text is blank, returns a deterministic blank-action stop message and does not save.
5. Prompts the user for reason text.
6. If the reason text is blank, returns a deterministic blank-reason stop message and does not save.
7. Prints a human-readable adjust preview showing the OTUnit title, id, adjustment/improvement action, reason, repository source, and persistence flag.
8. Asks for explicit confirmation to save.
9. If the confirmation signal is not `confirm` or `确认`, stops deterministically without saving.
10. If confirmed, saves the adjust record to process-local session memory linked by the confirmed OTUnit id.
11. Prints machine-readable success output with the saved adjust record details.

#### Adjust Record Properties

- Records are process-local session memory only (`Map<string, AdjustRecord[]>`)
- Records are linked by confirmed OTUnit id
- Records are not persisted after process exit
- Records do not change OTUnit status, confirmation state, follow-up records, review/check records, structured context snapshots, or repository persistence
- Records do not close, revise, replace, or mutate the OTUnit itself
- Records do not create follow-up/review/check/revision behavior
- Record IDs are deterministic: `session-adjust-record-1`, `session-adjust-record-2`, etc.

#### Adjust Record Shape

```
{
  id: string;           // deterministic: session-adjust-record-1, session-adjust-record-2, etc.
  otunitId: string;     // confirmed OTUnit id
  actionText: string;   // adjustment / improvement action text
  reasonText: string;   // reason why this adjustment/improvement is needed
  createdAt: string;    // ISO timestamp
}
```

#### Adjust Preview Example

```
--- Adjust Preview ---
OTUnit: 完成第一批体验客户访谈
OTUnit ID: session-confirmed-preview-otunit
Adjustment / Improvement Action: 明天补访第 3 位客户，并整理三位客户共通问题
Reason: 当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断
Repository: process-local in-memory
Persistence: false

Confirm save adjust record? (confirm to save, /exit to quit):
```

#### Adjust Command Machine-readable Output (Success)

```
{
  "ok": true,
  "action": "adjust",
  "found": true,
  "id": "session-confirmed-preview-otunit",
  "adjustSaved": true,
  "adjustRecord": {
    "id": "session-adjust-record-1",
    "otunitId": "session-confirmed-preview-otunit",
    "actionText": "明天补访第 3 位客户，并整理三位客户共通问题",
    "reasonText": "当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断",
    "createdAt": "<ISO timestamp>"
  },
  "otunitMutated": false,
  "otunitStatusChanged": false,
  "otunitClosed": false,
  "otunitRevised": false,
  "otunitReplaced": false,
  "repositorySource": "process_local_in_memory",
  "persistence": false,
  "durableRuntimeState": false,
  "providerRequired": false,
  "chatWrites": false
}
```

#### Adjust Missing-id Output

```
{
  "ok": false,
  "action": "adjust",
  "found": false,
  "id": "missing-id",
  "message": "OTUnit not found in this process-local session repository.",
  "adjustSaved": false,
  ...
}
```

#### Adjust Blank-action Output

```
{
  "ok": false,
  "action": "adjust",
  "found": true,
  "id": "<otunit-id>",
  "message": "Blank adjustment text. No adjust record saved.",
  "adjustSaved": false,
  ...
}
```

#### Adjust Blank-reason Output

```
{
  "ok": false,
  "action": "adjust",
  "found": true,
  "id": "<otunit-id>",
  "message": "Blank reason text. No adjust record saved.",
  "adjustSaved": false,
  ...
}
```

#### Adjust Ambiguous Confirmation Output

```
{
  "ok": false,
  "action": "adjust",
  "found": true,
  "id": "<otunit-id>",
  "adjustPreviewPrinted": true,
  "adjustConfirmed": false,
  "adjustSaved": false,
  ...
}
```

#### list Output (Updated)

| Field | Type | Description |
|-------|------|-------------|
| ... | ... | (all existing fields) |
| `otunits[].followUpRecordCount` | number | Number of follow-up records for this OTUnit |
| `otunits[].reviewCheckRecordCount` | number | Number of review/check records for this OTUnit |
| `otunits[].adjustRecordCount` | number | Number of adjust records for this OTUnit |

#### show Output (Updated)

After an adjust record is saved, `show <id>` displays:

Human-readable:
```
--- O 单 Detail ---
...
Status: confirmed
...

--- Follow-up Records ---
1. <follow-up text>

--- Review / Check Records ---
1. Result: <check result text>
   Difference / Variance: <difference text>

--- Adjust Records ---
1. Action: <action text>
   Reason: <reason text>
```

Machine-readable (extended with):

| Field | Type | Description |
|-------|------|-------------|
| `followUpRecordCount` | number | Number of follow-up records for this OTUnit |
| `followUpRecords` | array | Array of follow-up record objects with id, otunitId, text, createdAt |
| `reviewCheckRecordCount` | number | Number of review/check records for this OTUnit |
| `reviewCheckRecords` | array | Array of review/check record objects with id, otunitId, resultText, differenceText, createdAt |
| `adjustRecordCount` | number | Number of adjust records for this OTUnit |
| `adjustRecords` | array | Array of adjust record objects with id, otunitId, actionText, reasonText, createdAt |

#### Boundary

- Adjust records are process-local session memory only
- No database, no filesystem persistence, no network storage
- No provider integration, no AI generation
- No normal chat writes
- No durable runtime state
- No OTUnit mutation (status, confirmation, follow-up, review, check, revision)
- No OTUnit close, revise, replace, or adjust/mutate behavior
- Existing otunit command remains inspection-only
- No mutation subcommands under existing otunit
- Existing follow-up record behavior remains unchanged
- Existing review/check record behavior remains unchanged
- Existing evidence refs delimiter normalization remains unchanged
- Existing structured context snapshot behavior remains unchanged

### O'PDCA Summary Behavior (PR #42)

After a confirmed OTUnit exists in the process-local session repository, the `show <id>` command now includes
a human-readable O'PDCA Summary section derived from existing structured context and session records.

#### O'PDCA Summary Sections

The O'PDCA Summary is printed after the existing O 单 Detail, Follow-up Records, Review / Check Records,
and Adjust Records sections. It includes:

- **Objective / Plan** — derived from the existing structured context (objective, title, judgment criteria, plan/action items)
- **Do Records** — summarizes follow-up records, or shows a deterministic empty-state line
- **Check Records** — summarizes review/check records, or shows a deterministic empty-state line
- **Adjust Records** — summarizes adjust records, or shows a deterministic empty-state line
- **Current Status** — includes OTUnit status, requiresConfirmation, repository source, and persistence flag

#### Deterministic Empty-state Lines

When a record type has no records, the summary displays:

```
Do Records: No follow-up records in this process-local session.
Check Records: No review/check records in this process-local session.
Adjust Records: No adjust records in this process-local session.
```

#### Human-readable Output Shape (with records)

```
--- O'PDCA Summary ---
Objective / Plan:
Objective: Q3 收入目标
OTUnit: 完成第一批体验客户访谈
Judgment Criteria: 完成 3 位体验客户访谈并形成记录
Plan / Action Items:
1. 约访客户
2. 完成访谈
3. 记录结论

Do Records:
- 今天完成 2 位客户访谈，并约好第 3 位

Check Records:
- Result: 已完成 2 位客户访谈，第 3 位已预约
  Difference / Variance: 距离判断标准还差 1 位客户访谈记录

Adjust Records:
- Action: 明天补访第 3 位客户，并整理三位客户共通问题
  Reason: 当前距离判断标准还差 1 位客户访谈记录，需要补齐后再判断

Current Status:
Status: confirmed
Requires Confirmation: false
Repository: process-local in-memory
Persistence: false
```

#### Machine-readable Output

The `show <id>` JSON output includes:

| Field | Type | Description |
|-------|------|-------------|
| `opdcaSummaryAvailable` | boolean | `true` when structured context is available |
| `opdcaSummary.objective` | string | Objective text from structured context |
| `opdcaSummary.planItems` | string[] | Plan / action items from structured context |
| `opdcaSummary.doRecordCount` | number | Number of follow-up records |
| `opdcaSummary.checkRecordCount` | number | Number of review/check records |
| `opdcaSummary.adjustRecordCount` | number | Number of adjust records |
| `opdcaSummary.currentStatus` | object | Current status including status, requiresConfirmation, repositorySource, persistence |

#### Example Machine-readable Output

```json
{
  "opdcaSummaryAvailable": true,
  "opdcaSummary": {
    "objective": "Q3 收入目标",
    "planItems": ["1. 约访客户", "2. 完成访谈", "3. 记录结论"],
    "doRecordCount": 1,
    "checkRecordCount": 1,
    "adjustRecordCount": 1,
    "currentStatus": {
      "status": "confirmed",
      "requiresConfirmation": false,
      "repositorySource": "process_local_in_memory",
      "persistence": false
    }
  }
}
```

#### Available Commands (Updated)

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON
- `show <id>` — prints human-readable O 单 detail, follow-up records, review/check records, adjust records, and O'PDCA Summary, followed by machine-readable JSON
- `follow <id>` — adds a follow-up record for a confirmed OTUnit
- `check <id>` — adds a review/check record for a confirmed OTUnit
- `adjust <id>` — adds an adjust record for a confirmed OTUnit
- `/exit` or `exit` — exits the loop

#### show Output (Updated)

After O'PDCA Summary is added, `show <id>` displays:

Human-readable:
```
--- O 单 Detail ---
...
Status: confirmed
...

--- Follow-up Records ---
1. <follow-up text>

--- Review / Check Records ---
1. Result: <check result text>
   Difference / Variance: <difference text>

--- Adjust Records ---
1. Action: <action text>
   Reason: <reason text>

--- O'PDCA Summary ---
... (derived from structured context and records)

```

Machine-readable (extended with):

| Field | Type | Description |
|-------|------|-------------|
| `opdcaSummaryAvailable` | boolean | Whether O'PDCA summary is available (true when structured context exists) |
| `opdcaSummary` | object | O'PDCA summary with objective, planItems, doRecordCount, checkRecordCount, adjustRecordCount, currentStatus |

#### Boundary

- O'PDCA Summary is derived from existing structured context and process-local session records
- O'PDCA Summary is human-readable only inside `show <id>`
- No new session command is added
- No persistence, no provider, no database, no durable runtime state
- Existing follow/check/adjust behavior remains unchanged
- Existing evidence refs delimiter normalization remains unchanged
- Existing structured context snapshot behavior remains unchanged
- Existing otunit command remains inspection-only
- No mutation subcommands under existing otunit

### Revision Intent Record Behavior (PR #43)

After a confirmed OTUnit exists in the process-local session repository, the otunit-core-loop supports
the `revise-intent <id>` command to add a revision intent record for a confirmed OTUnit.

A revision intent record captures the intent to revise, not the revision itself.
No actual revision action is performed. No OTUnit status is changed. No new OTUnit is created.
No OTUnit is closed.

#### Available Commands (Updated)

After the summary is printed, the following commands are available:

- `list` — prints all OTUnits from the session-local in-memory repository as JSON, with `structuredContextAvailable`, `followUpRecordCount`, `reviewCheckRecordCount`, `adjustRecordCount`, and `revisionIntentRecordCount` fields
- `show <id>` — prints human-readable O 单 detail (if structured context is available), follow-up records, review/check records, adjust records, revision intent records, and O'PDCA Summary, followed by machine-readable JSON
- `follow <id>` — adds a follow-up record for a confirmed OTUnit
- `check <id>` — adds a review/check record for a confirmed OTUnit
- `adjust <id>` — adds an adjust record for a confirmed OTUnit
- `revise-intent <id>` — adds a revision intent record for a confirmed OTUnit (see revise-intent flow below)
- `/exit` or `exit` — exits the loop

#### Revision Intent Record Flow

The `revise-intent <id>` command:

1. Verifies the OTUnit exists in the process-local repository via `getById`.
2. If the OTUnit is not found, returns a deterministic not-found message and does not prompt/save.
3. Prompts the user for revision reason text.
4. If the revision reason text is blank, returns a deterministic blank-reason stop message and does not save.
5. Prompts the user for proposed revision direction text.
6. If the proposed revision direction text is blank, returns a deterministic blank-direction stop message and does not save.
7. Prints a human-readable revision intent preview showing the OTUnit id, revision reason, proposed revision direction, repository source, and persistence flag.
8. Asks for explicit confirmation to save.
9. If the confirmation signal is not `confirm` or `确认`, stops deterministically without saving.
10. If confirmed, saves the revision intent record to process-local session memory linked by the confirmed OTUnit id.
11. Prints machine-readable success output with the saved revision intent record details.

#### Revision Intent Record Properties

- Records are process-local session memory only (`Map<string, RevisionIntentRecord[]>`)
- Records are linked by confirmed OTUnit id
- Records are not persisted after process exit
- Records do not change OTUnit status, confirmation state, follow-up records, review/check records, adjust records, structured context snapshots, or repository persistence
- Records do not revise, close, replace, or mutate the OTUnit itself
- Records do not create a new OTUnit
- Records do not create follow-up/review/check/adjust behavior
- Record IDs are deterministic: `session-revision-intent-record-1`, `session-revision-intent-record-2`, etc.

#### Revision Intent Preview Example

```
--- Revision Intent Preview ---
OTUnit ID: session-confirmed-preview-otunit
Revision Reason: <reasonText>
Proposed Revision Direction: <directionText>
Repository: process-local in-memory
Persistence: false

Confirm saving this revision intent record? (confirm to save, /exit to quit):
```

#### list Output (Updated)

| Field | Type | Description |
|-------|------|-------------|
| `otunits[].revisionIntentRecordCount` | number | Number of revision intent records for this OTUnit |

#### show Output (Updated)

Human-readable section added:

```
--- Revision Intent Records ---
1. Reason: <reason text>
   Proposed Revision Direction: <direction text>
   Created At: <createdAt>
```

Machine-readable fields added:

| Field | Type | Description |
|-------|------|-------------|
| `revisionIntentRecordCount` | number | Number of revision intent records for this OTUnit |
| `revisionIntentRecords` | array | Array of revision intent record objects with id, otunitId, reasonText, directionText, createdAt |
| `revisionIntentRecords[0].id` | string | Revision intent record id |
| `revisionIntentRecords[0].otunitId` | string | Confirmed OTUnit id |
| `revisionIntentRecords[0].reasonText` | string | Revision reason text |
| `revisionIntentRecords[0].directionText` | string | Proposed revision direction text |
| `revisionIntentRecords[0].createdAt` | string | ISO timestamp |

#### O'PDCA Summary with Revision Intent

The O'PDCA Summary includes a **Revision Intent** section after Adjust Records.

Human-readable:

```
Revision Intent:
- Revision Reason: <reason text>
  Proposed Direction: <direction text>
```

Empty-state:

```
Revision Intent:
No revision intent records in this process-local session.
```

Machine-readable: `opdcaSummary.revisionIntentRecordCount`.

#### Boundary

- Revision intent records are process-local session memory only
- No actual revision action is performed
- Revision intent records do not change OTUnit status
- Revision intent records do not create a new OTUnit
- Revision intent records do not close an OTUnit
- No database, no filesystem persistence, no network storage
- No provider integration, no AI generation
- No normal chat writes
- No durable runtime state
- No OTUnit mutation (status, confirmation, follow-up, review, check, adjust)
- No OTUnit close, revise, replace, or mutate behavior
- Existing otunit command remains inspection-only
- No mutation subcommands under existing otunit
- Existing follow/check/adjust/O'PDCA behavior remains unchanged
- Existing evidence refs delimiter normalization remains unchanged
- Existing structured context snapshot behavior remains unchanged
- Unrecognized command message includes `revise-intent <id>`
