# OTUnit Revision Chain Boundary Index

**PR: #56**

Stable boundary surface that unifies the five OTUnit revision chain boundary
contracts (PR #50, #52, #53, #54, #55) into a single exported index.

## Purpose

Each revision boundary contract is independently deliverable and independently
testable. The boundary index provides a single import path for consumers that
need the entire revision chain without importing individual modules.

The index does **not** add runtime behavior, persistence, CLI, repository
access, or UI. It is purely a re-export and registry layer.

## Boundary Modules

| # | Module | PR | Status |
|---|--------|----|--------|
| 1 | `otunit-revision-preview-boundary` | #50 | previewed / requires_confirmation / confirmed / rejected |
| 2 | `otunit-proposed-revision-boundary` | #52 | proposed / accepted / rejected |
| 3 | `otunit-proposed-revision-decision-boundary` | #53 | accepted / rejected |
| 4 | `otunit-supersession-boundary` | #54 | declared |
| 5 | `otunit-revision-lifecycle-projection-boundary` | #55 | read-only projection across all 5 stages |

## Chain Stage Order

The revision chain progresses through these stages in order:

```
revision_intent_recorded
→ revision_previewed
→ proposed_revised_otunit_created
→ proposed_revised_otunit_decided
→ supersession_declared
```

## Exported Symbols

### Constants

| Symbol | Source |
|--------|--------|
| `OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES` | This index |
| `OTUNIT_REVISION_CHAIN_STAGE_ORDER` | This index |
| `OTUNIT_REVISION_PREVIEW_STATUS_VALUES` | otunit-revision-preview-boundary |
| `PROPOSED_REVISED_OTUNIT_STATUS_VALUES` | otunit-proposed-revision-boundary |
| `PROPOSED_REVISED_OTUNIT_DECISION_STATUS_VALUES` | otunit-proposed-revision-decision-boundary |
| `OTUNIT_SUPERSESSION_STATUS_VALUES` | otunit-supersession-boundary |
| `OTUNIT_SUPERSESSION_RELATION_VALUES` | otunit-supersession-boundary |
| `OTUNIT_REVISION_LIFECYCLE_STAGE_VALUES` | otunit-revision-lifecycle-projection-boundary |

### Functions

| Symbol | Source |
|--------|--------|
| `createProposedRevisedOTUnitFromConfirmedPreview` | otunit-proposed-revision-boundary |
| `decideProposedRevisedOTUnit` | otunit-proposed-revision-decision-boundary |
| `declareOTUnitSupersessionFromAcceptedDecision` | otunit-supersession-boundary |
| `projectOTUnitRevisionLifecycle` | otunit-revision-lifecycle-projection-boundary |

### Types

All types from the five boundary modules are re-exported without modification.

## Contract Invariants

1. Each module name in `OTUNIT_REVISION_CHAIN_BOUNDARY_MODULES` corresponds to a
   real `.ts` file in `src/runtime/kernel/`.
2. Each stage in `OTUNIT_REVISION_CHAIN_STAGE_ORDER` matches a boundary in the
   module list.
3. All re-exported symbols resolve to their original module without type drift.
4. The index does not introduce any new runtime logic, validation, or
   transformation.

## File Locations

```
eliy-native/src/runtime/kernel/
  otunit-revision-chain-boundary.ts       # This index
  otunit-revision-chain-boundary.md       # This README
  otunit-revision-preview-boundary.ts     # PR #50
  otunit-proposed-revision-boundary.ts    # PR #52
  otunit-proposed-revision-decision-boundary.ts  # PR #53
  otunit-supersession-boundary.ts         # PR #54
  otunit-revision-lifecycle-projection-boundary.ts  # PR #55

eliy-native/src/runtime/kernel/tests/
  otunit-revision-chain-boundary-index-contract.test.ts  # This PR
```
