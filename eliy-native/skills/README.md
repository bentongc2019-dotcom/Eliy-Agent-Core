# Eliy Skill Packs — Asset Layer

`skills/` is the asset layer for Eliy Skill Packs.

**Skill Packs are assets, not runtime commands.** A Skill Pack defines a collection of
capability modules — their intent, boundaries, and constraints — without implementing
how those capabilities are loaded, invoked, or managed at runtime.

Skill Packs will be loaded through future generic capability registry / loader contracts.
**Skill Registry / Loader / Capability Contract must be Eliy-wide, not O’PDCA-specific.**
Any registry, loader, or capability contract must be designed once for the entire Eliy
system and shared across all Skill Packs.

## Not in scope

This PR does **not** implement:

- Registry or loader
- Runtime invocation
- Provider integration
- Workflow or orchestration
- RAG or retrieval
- Workspace schema
- Persistence or state management
- Actual revision behavior

These concerns will be addressed in future PRs against system-wide contracts.
