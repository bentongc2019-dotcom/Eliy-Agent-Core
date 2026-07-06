# OTUnit Revision Chain Boundary Index

**PR: #56**

This document describes the stable boundary surface for OTUnit revision chain contracts.

The revision chain boundary covers:

1. Revision preview boundary
2. Proposed revised OTUnit boundary
3. Proposed revised OTUnit decision boundary
4. Supersession boundary
5. Revision lifecycle projection boundary

Each revision boundary contract is independently deliverable and independently
testable. The boundary index provides a single import path for consumers that
need the entire revision chain without importing individual modules.

## Chain Stage Order

The revision chain order is:

- revision intent
- → revision preview
- → proposed revised OTUnit
- → proposed revised OTUnit decision
- → supersession declaration
- → lifecycle projection

## Boundary Modules

| # | Module | PR | Status |
|---|--------|----|--------|
| 1 | Revision preview boundary (`otunit-revision-preview-boundary`) | #50 | previewed / requires_confirmation / confirmed / rejected |
| 2 | Proposed revised OTUnit boundary (`otunit-proposed-revision-boundary`) | #52 | proposed / accepted / rejected |
| 3 | Proposed revised OTUnit decision boundary (`otunit-proposed-revision-decision-boundary`) | #53 | accepted / rejected |
| 4 | Supersession boundary (`otunit-supersession-boundary`) | #54 | declared |
| 5 | Revision lifecycle projection boundary (`otunit-revision-lifecycle-projection-boundary`) | #55 | read-only projection across all 5 stages |

## Scope

This boundary index does not implement repository persistence, CLI behavior,
runtime mutation, source OTUnit replacement, provider integration, or UI.

The index is purely a re-export and registry layer. It adds no runtime behavior
of its own.

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
