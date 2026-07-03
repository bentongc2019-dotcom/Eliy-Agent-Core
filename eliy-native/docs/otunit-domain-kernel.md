# OTUnit Domain Kernel Skeleton

This document describes the minimal deterministic domain kernel for Objective and OTUnit.

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
