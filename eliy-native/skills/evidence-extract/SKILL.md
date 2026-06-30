name: evidence-extract
description: Deterministic evidence candidate extraction stub.
when_to_use: When the runtime turns follow-up text into evidence candidates.
inputs: OTUnit follow-up text
outputs: candidate
required_context: hlamt_context_summary
evidence_requirement: required
confirmation_requirement: required for writes
allowed_actions:
  - produce candidate
forbidden_actions:
  - persist canonical runtime objects directly
workflow:
  - read context
  - emit deterministic candidate
  - return evidence candidate
quality_checks:
  - traceable content
test_fixtures:
  - demo follow-up
