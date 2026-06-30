name: o-pdca
description: Deterministic Objective Task Unit planning and adjustment stub.
when_to_use: When the runtime needs a minimal objective-driven planning artifact.
inputs: Objective, OTUnit, Evidence
outputs: candidate, draft, proposal
required_context: hlamt_context_summary
evidence_requirement: required
confirmation_requirement: required for writes
allowed_actions:
  - produce candidate
  - produce draft
  - produce proposal
forbidden_actions:
  - persist canonical runtime objects directly
workflow:
  - read context
  - emit deterministic stub
  - return runtime candidate
quality_checks:
  - traceable output
test_fixtures:
  - demo objective
