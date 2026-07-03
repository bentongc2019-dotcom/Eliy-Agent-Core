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

## Persistence Boundary

This PR does not persist Objective or OTUnit objects.

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
