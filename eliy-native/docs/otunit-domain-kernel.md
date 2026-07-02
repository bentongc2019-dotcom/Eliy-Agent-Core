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

## Persistence Boundary

This PR does not persist Objective or OTUnit objects.

## Runtime Boundary

This PR does not add AI generation, chat integration, provider integration, Runtime Kernel integration, long-term memory, or domain object runtime.
