name: review
description: Deterministic evidence-backed review stub.
when_to_use: When the runtime needs a minimal review artifact.
inputs: Objective, OTUnit, Evidence
outputs: draft, proposal, judgment
required_context: hlamt_context_summary
evidence_requirement: required
confirmation_requirement: required for writes
allowed_actions:
  - produce draft
  - produce proposal
  - produce judgment
forbidden_actions:
  - persist canonical runtime objects directly
workflow:
  - read context
  - emit deterministic stub
  - return review artifact
quality_checks:
  - evidence referenced
test_fixtures:
  - demo review input
