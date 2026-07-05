# O’PDCA Skill Pack

**Chinese brand name:** 计划经营

**English system name:** O’PDCA Management System

**Description:** An objective-driven, PDCA-based management system for planning,
budgeting, review, improvement, and management development.

**O’PDCA Skill Pack is a Skill Pack, not one large Skill.**

## Modules

O’PDCA Skill Pack defines exactly nine modules:

1. Objective Framing Skill
2. Plan Structuring Skill
3. OTUnit Draft Skill
4. Confirmation Skill
5. Follow-up Capture Skill
6. Review / Check Skill
7. Adjust Action Skill
8. Revision Intent Skill
9. O’PDCA Summary Skill

## Boundary

- The Skill Pack **must not** bypass explicit user confirmation.
- The Skill Pack **must not** directly mutate Runtime state.
- The Skill Pack **must not** create, revise, close, or replace OTUnits without
  Runtime confirmation boundaries.
- Runtime Kernel owns state, confirmation, deterministic validation, record
  boundary, repository boundary, traceable output, and stop behavior.

## Asset definition

This file is an **asset definition**. It is:

- Not a runtime command
- Not a registry or loader implementation
- Not provider integration
- Not persistence
- Not RAG
- Not workflow implementation
- Not workspace schema
- Not actual revision behavior

Registry, loader, and capability contract concerns must be Eliy-wide.
See [`skills/README.md`](../README.md) for the full asset-layer boundary.
