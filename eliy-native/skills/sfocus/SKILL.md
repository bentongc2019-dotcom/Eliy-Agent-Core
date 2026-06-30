name: sfocus
description: Deterministic SFOCUS-style refinement stub.
when_to_use: When the runtime needs a minimal focus and bottleneck candidate.
inputs: Objective, OTUnit, Evidence
outputs: candidate, question, judgment
required_context: hlamt_context_summary
evidence_requirement: required
confirmation_requirement: required for writes
allowed_actions:
  - produce candidate
  - produce question
  - produce judgment
forbidden_actions:
  - persist canonical runtime objects directly
workflow:
  - read context
  - emit deterministic stub
  - return runtime candidate
quality_checks:
  - traceable output
test_fixtures:
  - demo focus input
