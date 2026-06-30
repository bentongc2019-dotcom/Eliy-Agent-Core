name: language-style
description: Deterministic style guidance stub for business-facing wording.
when_to_use: When the runtime needs a minimal style candidate or wording suggestion.
inputs: text
outputs: draft, question, judgment
required_context: hlamt_context_summary
evidence_requirement: required
confirmation_requirement: required for writes
allowed_actions:
  - produce draft
  - produce question
  - produce judgment
forbidden_actions:
  - persist canonical runtime objects directly
workflow:
  - read context
  - emit deterministic stub
  - return style guidance
quality_checks:
  - concise output
test_fixtures:
  - demo wording input
