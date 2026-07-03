# OTUnit Domain Kernel Skeleton

This document describes the minimal deterministic domain kernel for Objective and OTUnit.

## OTUnit Domain Contract Summary

The OTUnit domain contract currently exposes deterministic, domain-local helpers for the following areas:

### Domain Skeleton

- Objective validation
- OTUnit validation
- stable Objective and OTUnit status values
- pure domain validation without persistence or runtime side effects

### State Transitions

- deterministic allowed transition table
- invalid transitions return deterministic validation errors
- transition validation does not persist state

### User Confirmation

- proposed OTUnits that require confirmation can be confirmed
- confirmed OTUnits that no longer require confirmation remain stable
- invalid confirmation attempts return deterministic validation errors
- confirmation remains user-bound and does not run automatically

### AI-to-Draft Boundary

- draft input can produce a proposed OTUnit
- draft output requires user confirmation
- draft input cannot create confirmed, in-progress, blocked, or closed OTUnits
- draft input cannot bypass confirmation

### Evidence Reference Boundary

- evidenceRefs are ids/references only
- evidenceRefs must be non-empty string ids
- whitespace-only refs, non-string refs, and duplicate refs are invalid
- evidence content is not stored inside evidenceRefs

### Review / Revision Boundary

- review input records review intent only
- revision input produces a revised OTUnit copy
- revision preserves OTUnit identity
- revision preserves evidenceRefs validation
- revision preserves user confirmation
- revision does not automatically confirm an OTUnit

### Repository Boundary

- OTUnit in-memory repository since PR #30
- `OTUnitRepository` type provides `save`, `getById`, `listByObjectiveId`, `clear`
- `createInMemoryOTUnitRepository` returns a deterministic process-local in-memory implementation
- stored OTUnits are validated before storage
- stored OTUnits preserve status and requiresConfirmation exactly as provided
- duplicate id upserts/replaces the existing OTUnit (deterministic, no duplicates)
- returned OTUnits are cloned copies; external mutation does not affect stored state
- missing OTUnits return `undefined` from getById
- invalid OTUnits are rejected with deterministic validation errors
- repository does not auto-confirm OTUnits
- repository does not bypass existing validation, transition, preview, creation, or confirmation contracts

This contract summary does not add persistence, evidence content storage, AI generation, real provider integration, chat integration, automatic confirmation, Runtime Kernel integration, deployment behavior, or any new OTUnit capability.

## Objective

Fields:

- id
- title
- status
- createdAt

## OTUnit

Fields:

- id
- objectiveId
- title
- owner
- dueDate
- status
- evidenceRefs
- requiresConfirmation
- createdAt

## Status Values

Objective status values:

- draft
- active
- completed
- archived

OTUnit status values:

- proposed
- confirmed
- in_progress
- blocked
- closed

## OTUnit State Contract

Allowed OTUnit transitions:

- proposed -> confirmed
- confirmed -> in_progress
- in_progress -> blocked
- blocked -> in_progress
- in_progress -> closed
- confirmed -> closed

Invalid transitions return a deterministic invalid transition result.

This state contract does not add persistence, AI generation, chat integration, provider integration, Runtime Kernel integration, or deployment behavior.

## OTUnit User Confirmation Boundary

OTUnit confirmation is deterministic and domain-local.

Confirmation rules:

- an OTUnit that requires user confirmation starts as `proposed`
- a valid confirmation moves `proposed -> confirmed`
- confirmed OTUnit sets `requiresConfirmation: false`
- an already confirmed OTUnit with `requiresConfirmation: false` stays stable
- invalid confirmation attempts return a deterministic invalid result

This confirmation boundary does not add persistence, AI generation, chat integration, provider integration, Runtime Kernel integration, or deployment behavior.

## Validation Boundary

Validation checks required fields, non-empty string ids, allowed statuses, evidence references as ids only, and user confirmation requirement through `requiresConfirmation`.

## OTUnit Evidence Reference Boundary

OTUnit evidence references are deterministic ids/references only.

Evidence reference rules:

- `evidenceRefs` stores ids/references only
- each evidence ref must be a non-empty string id
- empty strings are invalid
- whitespace-only strings are invalid
- non-string refs are invalid
- duplicate refs are invalid
- evidence content is not stored inside OTUnit evidenceRefs

This evidence reference boundary does not add evidence persistence, AI generation, real provider integration, chat integration, automatic confirmation, Runtime Kernel integration, or deployment behavior.

## OTUnit Review / Revision Boundary

OTUnit review and revision are deterministic and domain-local.

Review rules:

- review input records review intent only
- review input does not persist data
- review input does not store evidence content
- invalid review input returns deterministic validation errors

Revision rules:

- revision produces a revised OTUnit copy
- revision keeps OTUnit identity stable
- revision preserves the evidenceRefs boundary
- revision preserves the user confirmation boundary
- revised OTUnit remains `proposed`
- revised OTUnit requires user confirmation
- revision cannot automatically confirm an OTUnit
- invalid revision input returns deterministic validation errors

This review / revision boundary does not add persistence, evidence content storage, AI generation, real provider integration, chat integration, automatic confirmation, Runtime Kernel integration, or deployment behavior.

## OTUnit Runtime Command Skeleton

The OTUnit runtime command skeleton provides deterministic inspection of the OTUnit domain contract surface.

The PR #22 OTUnit command is inspection-only.

It does not expose OTUnit create, draft-create, list, show, status, close, or other mutation-oriented subcommands.

The root command `corepack pnpm otunit` prints deterministic domain contract inspection JSON only.

Command:

- `corepack pnpm otunit`
- direct CLI path: `corepack pnpm exec tsx src/cli/eliy.ts otunit`

Output contract:

- deterministic JSON
- `ok: true`
- command name
- mode
- OTUnit domain contract availability
- OTUnit status values
- allowed transition count
- confirmation boundary availability
- draft boundary availability
- evidence ref boundary availability
- review / revision boundary availability

Boundary:

- does not require provider config
- does not wait for stdin
- does not persist data
- does not store evidence content
- does not call AI or provider integrations
- does not automatically confirm OTUnits
- does not change existing proof, smoke, or chat behavior

## Session-to-OTUnit Draft Boundary

The session-to-OTUnit draft boundary converts a session transcript input into an `OTUnitDraftInput`.

This boundary is deterministic and domain-local.

Input includes:

- `sessionId`
- `objectiveId`
- `userText`
- `assistantText`
- `owner`
- `dueDate`
- `evidenceRefs`

Output behavior:

- valid input returns an OTUnit draft input
- invalid input returns deterministic validation errors
- the helper does not create an OTUnit directly
- the draft may be passed to `createProposedOTUnitFromDraft`

Confirmation boundary:

- session transcript input cannot create confirmed, in_progress, blocked, or closed OTUnits
- session transcript input cannot bypass user confirmation
- proposed OTUnits created from the draft still have `status: "proposed"`
- proposed OTUnits created from the draft still have `requiresConfirmation: true`

Boundary:

- no real provider integration
- no automatic confirmation
- no persistence
- no evidence content storage
- no AI generation
- no mutation-oriented OTUnit CLI command
- no chat behavior change
- no Runtime Kernel behavior change beyond the deterministic domain boundary

## Persistence Boundary

PR #22 did not persist Objective or OTUnit objects.
PR #30 adds a deterministic process-local in-memory repository boundary that does not use a database, filesystem persistence, network storage, provider integration, AI generation, or chat behavior change.

## Runtime Boundary

This PR does not add AI generation, chat integration, provider integration, Runtime Kernel integration, long-term memory, or domain object runtime.

## AI-to-OTUnit Draft Boundary

AI/provider draft data can only be converted into a proposed OTUnit through a deterministic domain boundary.

Draft input fields:

- id
- objectiveId
- title
- owner
- dueDate
- evidenceRefs

Draft-to-OTUnit rules:

- created OTUnit always has `status: "proposed"`
- created OTUnit always has `requiresConfirmation: true`
- draft input cannot create confirmed, in_progress, blocked, or closed OTUnits
- draft input cannot set `requiresConfirmation: false`
- invalid draft input returns deterministic validation errors
- valid draft output still requires user confirmation before it can become confirmed

This draft boundary does not add persistence, AI generation, real provider integration, chat integration, automatic confirmation, Runtime Kernel integration, or deployment behavior.

## Chat-to-OTUnit Draft Intent Boundary

The chat-to-OTUnit draft intent boundary detects whether chat or session text expresses intent to create an OTUnit draft.

This boundary is deterministic and domain-local.

Input includes:

- `sessionId`
- `userText`
- `assistantText`

Output behavior:

- positive intent returns intent metadata only
- negative intent returns a deterministic no-intent result
- invalid input returns deterministic validation errors
- the helper does not create an OTUnit
- the helper does not create an `OTUnitDraftInput`
- the helper does not call `createOTUnitDraftFromSession`
- the helper does not call `createProposedOTUnitFromDraft`

Confirmation boundary:

- positive intent does not create, confirm, persist, or mutate an OTUnit
- positive intent only indicates that user confirmation would be required before later draft or OTUnit creation work
- no automatic confirmation is performed

Boundary:

- no OTUnit creation
- no OTUnitDraftInput creation
- no automatic confirmation
- no persistence
- no evidence content storage
- no real provider integration
- no AI generation
- no mutation-oriented OTUnit CLI command
- no chat behavior change
- no Runtime Kernel behavior change beyond the deterministic intent boundary

## Chat-to-OTUnit Draft Preview Boundary

The chat-to-OTUnit draft preview boundary uses the deterministic chat-to-OTUnit draft intent boundary to prepare preview metadata.

This boundary is deterministic and domain-local.

Input includes:

- `sessionId`
- `userText`
- `assistantText`

Output behavior:

- positive intent returns preview metadata only
- preview may include a proposed preview shape
- no-intent input returns a deterministic no-preview result
- invalid input returns deterministic validation errors

Confirmation boundary:

- preview does not create an OTUnit
- preview does not create a confirmed OTUnit
- preview does not create an `OTUnitDraftInput`
- preview does not call `createOTUnitDraftFromSession`
- preview does not call `createProposedOTUnitFromDraft`
- preview does not call `confirmOTUnit`
- preview requires user confirmation before any later draft or OTUnit creation work

Boundary:

- no OTUnit creation
- no confirmed OTUnit creation
- no automatic confirmation
- no persistence
- no evidence content storage
- no real provider integration
- no AI generation
- no mutation-oriented OTUnit CLI command
- no chat behavior change
- no Runtime Kernel behavior change beyond deterministic preview boundary

## User-confirmed OTUnit Draft Creation Boundary

The user-confirmed OTUnit draft creation boundary creates a proposed OTUnit only after explicit user confirmation of a plan-aware draft preview.

This boundary is deterministic and domain-local.

Input includes:

- `draftPreview` (plan-aware OTUnitDraftPreview)
- `userConfirmationSignal` (explicit confirmation text)
- `objectiveId`
- `owner`
- `dueDate`
- `createdAt`

Creation behavior:

- only creates a proposed OTUnit
- created OTUnit keeps `status: "proposed"`
- created OTUnit keeps `requiresConfirmation: true`
- preview confirmation is authorization to create a proposed OTUnit only
- preview confirmation does not confirm the OTUnit
- preview confirmation does not set status to confirmed / in_progress / blocked / closed

Rejection behavior:

- no-intent or no-preview input does not create an OTUnit
- ambiguous confirmation signals do not create an OTUnit
- missing required fields return deterministic errors
- non-preview draftPreview does not create an OTUnit

Confirmation boundary:

- explicit preview confirmation only authorizes proposed OTUnit creation
- it must not confirm the OTUnit
- `confirmOTUnit` is not called by this boundary

Boundary:

- no confirmed OTUnit creation
- no automatic confirmation
- no persistence
- no evidence content storage
- no real provider integration
- no AI generation
- no mutation-oriented OTUnit CLI command
- no chat behavior change
- no Runtime Kernel behavior change beyond the deterministic confirmed preview boundary

## Proposed OTUnit Confirmation Boundary

The proposed OTUnit confirmation boundary confirms a proposed OTUnit only after explicit user confirmation.

This boundary is deterministic and domain-local.

Input includes:

- `otunit` (a proposed OTUnit)
- `userConfirmationSignal` (explicit confirmation text)
- `confirmedAt` (timestamp string)

Confirmation behavior:

- confirms only a proposed OTUnit with status `"proposed"`
- confirmed OTUnit has status `"confirmed"`
- confirmed OTUnit has `requiresConfirmation: false`
- explicit confirmation uses the existing `confirmOTUnit` domain boundary

Rejection behavior:

- ambiguous confirmation signals are rejected
- non-proposed OTUnits are rejected
- missing required fields return deterministic errors
- non-object input returns deterministic errors

Confirmation boundary:

- no automatic confirmation
- no persistence
- no evidence content storage
- no real provider integration
- no AI generation
- no mutation-oriented OTUnit CLI command
- no chat behavior change
- no Runtime Kernel behavior change beyond the deterministic confirmation boundary
## OTUnit Repository Boundary

The OTUnit repository boundary provides a deterministic process-local in-memory store for OTUnits.

This boundary is deterministic and domain-local.

### Repository Type

The `OTUnitRepository` type exposes the following methods:

- `save(otunit)` — validates and stores an OTUnit. Invalid OTUnits are rejected with deterministic errors. Duplicate id upserts/replaces.
- `getById(id)` — returns a cloned OTUnit or `undefined`.
- `listByObjectiveId(objectiveId)` — returns cloned OTUnits sorted by id.
- `clear()` — removes all stored OTUnits.

### In-Memory Implementation

`createInMemoryOTUnitRepository()` returns a repository instance backed by a plain `Map<string, OTUnit>`.

### Storage Contract

- stored OTUnits are validated via `validateOTUnit` before storage
- stored OTUnits remain valid OTUnits
- stored OTUnits preserve `status` and `requiresConfirmation` exactly as provided
- duplicate id upserts/replaces — never creates duplicates
- returned objects are deep clones (`structuredClone`); external mutation does not affect stored state
- `clear()` resets all state for test isolation

### Error Contract

- invalid OTUnit input to `save` returns deterministic validation errors from `validateOTUnit`
- missing ids from `getById` return `undefined`
- non-matching objectiveIds from `listByObjectiveId` return an empty array

### Confirmation Contract

- repository does not auto-confirm proposed OTUnits
- repository does not bypass existing validation, transition, preview, creation, or confirmation contracts
- repository does not call `confirmOTUnit`, `createProposedOTUnitFromDraft`, `createOTUnitDraftFromSession`, `previewOTUnitDraftFromChat`, `detectOTUnitDraftIntent`, `confirmProposedOTUnit`, `createProposedOTUnitFromConfirmedPreview`, `reviseOTUnit`, or `createOTUnitReviewIntent`

### Boundary

- no database
- no filesystem persistence
- no network storage
- no provider integration
- no AI generation
- no chat behavior change
- no mutation-oriented OTUnit CLI command
- no deployment behavior
