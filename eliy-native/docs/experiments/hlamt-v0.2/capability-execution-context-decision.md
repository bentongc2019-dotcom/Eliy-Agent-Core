# Capability Execution Context Decision

## Status

Experimental architecture decision for HLAMT V0.2.

No production implementation is authorized by this document alone.

## Confirmed Current State

The current capability chain contains:

1. Capability Manifest and static Registry;
2. Minimal Capability Loader for in-memory manifests;
3. Mock Capability Invocation;
4. Real LLM Invocation Boundary;
5. LLM Provider Router;
6. DeepSeek Capability LLM Adapter.

The current LLM adapter input contains only:

- capabilityId;
- capabilityName;
- capabilityVersion;
- capabilityKind;
- payload.

The current real invocation does not include:

- SKILL.md content;
- references;
- HLAMT context;
- output schema;
- confirmation or effect boundary.

## Existing Boundary Decisions

The Minimal Capability Loader must remain limited to manifest loading and registry creation.

It must not:

- access the filesystem;
- read Skill assets;
- invoke providers;
- depend on Runtime Kernel or Workspace.

The Provider Router must remain provider-selection and forwarding infrastructure.

Provider adapters must not discover or resolve Skill assets.

## Missing Layers

### Capability Asset Resolver

Responsibility:

- resolve the manifest assetPath;
- read the primary Skill asset;
- optionally resolve explicitly permitted references;
- return traceable asset content and source metadata.

It must not:

- call an LLM;
- perform business judgment;
- mutate Runtime state;
- confirm or persist canonical objects.

### Capability Execution Context Assembler

Responsibility:

- combine capability metadata;
- Skill instructions;
- HLAMT context;
- invocation payload;
- output and confirmation boundaries;
- source and version metadata.

It produces a provider-neutral execution context.

It must not:

- select a provider;
- call a provider;
- mutate Runtime state;
- create canonical business objects.

## Target Flow

    Capability Manifest
            ↓
    Capability Asset Resolver
            ↓
    Capability Execution Context Assembler
            ↓
    LlmCapabilityAdapterInput
            ↓
    Provider Router
            ↓
    Provider Adapter

## HLAMT Placement

HLAMT remains an upper-level Runtime Asset.

For a Skill invocation, the Execution Context Assembler carries the relevant
HLAMT principles into the provider-neutral execution context.

Loading HLAMT is not proof of application.

Application must be demonstrated through observable Skill output or
deterministic boundary enforcement.

## Evidence-Extract Implication

Epistemic Clarity belongs in:

1. HLAMT.md as an upper-level principle;
2. evidence-extract/SKILL.md as an operational procedure;
3. structured output and validation contracts as an observable boundary.

It must not be hard-coded as Chinese semantic parsing inside
runDeterministicSkill().

## Test Implication

The existing failing experimental test demonstrates that the current
deterministic Skill stub only prefixes HLAMT context.

The future contract test should verify:

1. the Asset Resolver returns the evidence-extract Skill instructions;
2. the Execution Context Assembler includes those instructions;
3. the Adapter receives the assembled context;
4. the output remains a candidate;
5. no canonical Evidence object is written without confirmation.

## Deferred

This decision does not yet authorize:

- production filesystem loading;
- reference retrieval;
- prompt templating;
- output schema implementation;
- Provider Adapter modification;
- Runtime integration;
- canonical object persistence.
