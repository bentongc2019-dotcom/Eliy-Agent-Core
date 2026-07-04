# OTUnit Terminal Core Loop Skeleton

This document describes the deterministic terminal-only OTUnit core loop skeleton added in PR #34.

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
| 2 | Detect draft intent from business text wrapper | `detectOTUnitDraftIntent` |
| 3 | Produce plan-aware draft preview | `previewOTUnitDraftFromChat` |
| 4 | Require explicit preview confirmation | Readline input via `safeQuestion` |
| 5 | Create proposed OTUnit only after explicit preview confirmation | `createProposedOTUnitFromConfirmedPreview` |
| 6 | Require explicit proposed OTUnit confirmation | Readline input via `safeQuestion` |
| 7 | Create confirmed OTUnit only after explicit proposed confirmation | `confirmProposedOTUnit` |
| 8 | Save confirmed OTUnit to in-memory repository | `createInMemoryOTUnitRepository.save` |
| 9 | Verify getById returns the confirmed OTUnit | `repository.getById` |
| 10 | Verify listByObjectiveId includes the confirmed OTUnit | `repository.listByObjectiveId` |
| 11 | Print deterministic final summary | JSON output |

### Commands

- `eliy otunit-core-loop` — the terminal-only skeleton command
- Does not accept mutation subcommands (no `create`, `save`, `show`, `confirm`, `list`)
- Supports `/exit` at any prompt to exit cleanly
- Missing business text returns deterministic message

### Summary Output

The final summary is a JSON object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | Whether all steps completed successfully |
| `command` | string | `"otunit-core-loop"` |
| `mode` | string | `"terminal_skeleton"` |
| `stepReached` | string | Highest step reached |
| `draftIntentCreated` | boolean | Draft intent detected in business text |
| `draftPreviewCreated` | boolean | Plan-aware draft preview created |
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
| Empty business text | Draft intent detection | Returns `ok: false`, `stepReached: "none"` |
| `/exit` at business text prompt | Draft intent detection | Prints "core loop exited" message |
| Ambiguous preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| Unrecognized preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| Empty preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| `/exit` at preview confirmation | Proposed OTUnit creation | Returns `ok: false`, `stepReached: "draft_preview_created"` |
| Ambiguous proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |
| Unrecognized proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |
| Empty proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |
| `/exit` at proposed confirmation | Confirmed OTUnit creation | Returns `ok: false`, `stepReached: "proposed_otunit_created"` |

### Boundary

- No database
- No filesystem persistence
- No network storage
- No provider integration
- No AI generation
- No normal chat writes
- No durable runtime state
- No deployment action
- No mutation-oriented OTUnit CLI command (the existing `eliy otunit` command remains inspection-only)
