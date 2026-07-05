# Eliy Capability Contract

This directory defines Eliy-wide capability contracts.
Capabilities describe skills, tools, agents, and connectors before runtime invocation.
Capability manifests are lightweight descriptors for discovery and listing.
Capability loading is represented as a contract in this PR.
Capability invocation is reserved for future runtime confirmation and invocation boundaries.

---

## What This Directory Contains

| File | Purpose |
|------|---------|
| README.md | This file — scope and contract orientation |
| capability-contract.ts | Shared TypeScript types and interfaces for all capability contracts |

---

## What This PR Defines

This PR establishes the **contract skeleton** for:

1. **Capability types** — type aliases for kind, composition, decompositionStatus, visibility, invocationMode, and status
2. **CapabilityManifest interface** — a lightweight descriptor for a single capability
3. **CapabilityRegistryListingContract** — a contract interface for listing and retrieving manifests
4. **CapabilityLoaderContract** — a contract interface for loading a capability by identifier

---

## What This PR Does NOT Do

- This PR does **not** implement runtime invocation.
- This PR does **not** add a production registry implementation.
- This PR does **not** add a production loader implementation.
- This PR does **not** add provider integration.
- This PR does **not** add persistence.
- This PR does **not** add workflow, RAG, workspace schema, or actual runtime behavior.

Runtime invocation, production registry, production loader, and provider integration are **reserved for future work**.

---

## Contract Boundaries

This PR defines contracts only.
This PR does not implement runtime invocation.
This PR does not add production registry or loader behavior.
This PR does not add provider integration or persistence.

| Concern | Status in this PR |
|---------|-------------------|
| Capability manifest types | Defined |
| Registry listing contract | Defined (interface only) |
| Loader contract | Defined (interface only) |
| Registry implementation | Not included |
| Loader implementation | Not included |
| Runtime invocation | Not included |
| Provider integration | Not included |
| Persistence | Not included |

---

## Capability Invocation Boundary

Capability invocation boundary contracts are defined in capability-invocation-boundary.ts.

The boundary separates capability requests, previews, confirmations, and invocation records.

Capability previews do not mutate Runtime state.

This section is a **contract scaffold only**:

- No runtime invocation implemented
- No persistence implemented
- No provider integration added
- No UI added
