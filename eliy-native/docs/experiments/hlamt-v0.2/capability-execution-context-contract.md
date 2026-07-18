# Capability Execution Context Contract Design

## Status

Experimental contract design only.

No production implementation is authorized.

## Purpose

Define a provider-neutral execution context between capability asset
resolution and LLM provider routing.

The contract must carry enough information to execute a Capability without
making the Provider Router or Provider Adapter responsible for discovering
Skill assets.

## Resolved Capability Asset

A resolved asset represents the primary operational instructions associated
with one Capability Manifest.

Proposed fields:

- capabilityId
- capabilityVersion
- assetPath
- instructions
- referenceSources
- assetFingerprint

Requirements:

- instructions preserve the resolved primary asset content;
- referenceSources contain only explicitly selected references;
- assetFingerprint identifies the resolved asset version;
- resolution performs no provider call;
- resolution performs no Runtime mutation.

## HLAMT Invocation Snapshot

H-LAM/T must cross the boundary as an immutable invocation snapshot rather
than as the Kernel loader object.

Proposed fields:

- sourcePath
- summary
- contentVersion or fingerprint
- injected

Requirements:

- raw HLAMT text is not included by default;
- summary carries the relevant upper-level principles;
- source and version information support traceability;
- injected proves context injection only;
- injected does not prove behavioral application.

## Capability Execution Context

Proposed fields:

- capability
- asset
- hlamt
- payload
- outputBoundary
- invocationMetadata

### capability

Contains:

- id
- name
- version
- kind

### asset

Contains the Resolved Capability Asset.

### hlamt

Contains the HLAMT Invocation Snapshot.

### payload

Contains the invocation-specific user or Runtime input.

### outputBoundary

Contains:

- allowedOutputKinds
- requiresConfirmation
- canonicalMutationAllowed

For the evidence-extract experiment:

- allowedOutputKinds: candidate
- requiresConfirmation: true
- canonicalMutationAllowed: false

### invocationMetadata

Contains:

- invocationId
- createdAt
- actor
- invocationMode

## Provider Boundary

The Provider Router receives the assembled provider-neutral context.

The Provider Router must not:

- read SKILL.md;
- resolve references;
- load HLAMT;
- alter output boundaries;
- perform Runtime persistence.

A Provider Adapter may serialize the assembled context into provider-specific
system and user messages.

It must not discover assets independently.

## Trace Boundary

The full Execution Context is used during invocation.

Audit and trace records should normally retain:

- invocationId;
- capability id and version;
- asset path and fingerprint;
- HLAMT source and fingerprint;
- output boundary;
- payload reference or bounded snapshot;
- provider and handler;
- completion status.

Audit records should not automatically retain:

- full Skill instructions;
- full references;
- full HLAMT raw text;
- unbounded sensitive payloads.

## Evidence-Extract Experiment

The evidence-extract Skill Contract operationalizes Epistemic Clarity.

The assembled context must allow the provider to distinguish:

- reported facts;
- source-backed evidence;
- inference;
- hypothesis;
- unsupported conclusion;
- judgment;
- recommendation;
- evidence needed.

The output remains a candidate.

No canonical Evidence object may be written without confirmation.

## Non-Goals

This contract does not yet define:

- filesystem implementation;
- reference retrieval policy;
- fingerprint algorithm;
- prompt template;
- output parser;
- output schema validator;
- persistence;
- Runtime integration.

## Adapter Input Compatibility Decision

For V0.2, `LlmCapabilityAdapterInput` should be extended rather than replaced.

Proposed transitional shape:

    interface LlmCapabilityAdapterInput
      extends LlmCapabilityMetadataForAdapter {
      payload: Record<string, unknown>;
      executionContext?: CapabilityExecutionContext;
    }

### Compatibility Rules

- existing capability metadata fields remain available;
- the existing top-level payload remains available;
- executionContext is optional during migration;
- invocations without executionContext retain current behavior;
- invocations with executionContext use the assembled provider-neutral context;
- executionContext.capability must match the top-level capability metadata;
- executionContext.payload must match the top-level payload;
- mismatches must be rejected before provider invocation.

### Migration Boundary

The duplicated metadata and payload are transitional compatibility fields.

They must not become two independent sources of truth.

During V0.2:

- the Execution Context Assembler creates both representations;
- contract tests verify their consistency;
- Provider Router forwards them without resolving assets;
- Provider Adapters serialize the supplied context without discovering assets.

A future version may replace the flat adapter input with a required
CapabilityExecutionContext after all callers have migrated.

That replacement is not authorized in V0.2.

## First Contract-Test Scope

The first contract test should verify only:

1. an execution context can be represented independently of provider code;
2. capability metadata is internally consistent;
3. top-level payload and executionContext.payload are equal;
4. HLAMT is represented as a snapshot rather than a Kernel loader object;
5. output boundaries are represented explicitly;
6. no provider, filesystem, persistence, or Runtime mutation logic exists.

The first contract test must not yet:

- read SKILL.md;
- call a provider;
- parse model output;
- write canonical objects;
- modify the existing Provider Router;
- modify the DeepSeek adapter.
