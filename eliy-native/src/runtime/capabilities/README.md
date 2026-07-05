# Eliy Capability Contract

This directory defines Eliy-wide **capability contracts**.

---

## What is a Capability?

A **capability** describes a skill, tool, agent, or connector **before** runtime invocation. Capability manifests are lightweight descriptors used for discovery and listing. They establish what exists, what it is called, what kind of thing it is, and how it can be used — without executing it.

---

## What This Directory Contains

| File | Purpose |
|------|---------|
| `README.md` | This file — scope and contract orientation |
| `capability-contract.ts` | Shared TypeScript types and interfaces for all capability contracts |

---

## What This PR Defines

This PR establishes the **contract skeleton** for:

1. **Capability types** — type aliases for `kind`, `composition`, `decompositionStatus`, `visibility`, `invocationMode`, and `status`
2. **`CapabilityManifest` interface** — a lightweight descriptor for a single capability
3. **`CapabilityRegistryListingContract`** — a contract interface for listing and retrieving manifests
4. **`CapabilityLoaderContract`** — a contract interface for loading a capability by identifier

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

| Concern | Status in this PR |
|---------|-------------------|
| Capability manifest types | Defined |
| Registry listing contract | Defined (interface only) |
| Loader contract | Defined (interface only) |
| Registry implementation | **Not included** |
| Loader implementation | **Not included** |
| Runtime invocation | **Not included** |
| Provider integration | **Not included** |
| Persistence | **Not included** |

---

## Future Work (out of scope)

- Implement a production `CapabilityRegistry`
- Implement a production `CapabilityLoader`
- Provider-specific capability adapters
- Capability discovery from filesystem or configuration
- Lazy loading and caching
- Runtime invocation scheduling and dispatch
- Capability lifecycle management at runtime
