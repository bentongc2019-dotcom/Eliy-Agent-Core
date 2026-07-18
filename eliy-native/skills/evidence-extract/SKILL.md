name: evidence-extract
description: Produce a bounded evidence candidate while preserving epistemic clarity and user authority.
when_to_use: When a runtime input mixes reports, interpretations, conclusions, or proposed action.
inputs: Unstructured runtime input supplied as the invocation payload.
outputs: candidate only
required_context: bounded HLAMT context summary when the invocation condition requests it
evidence_requirement: Identify missing support; do not invent evidence.
confirmation_requirement: Required before any canonical write. This Skill never performs that write.
allowed_actions:
  - produce a candidate containing Reported Fact, Inference, Unsupported Conclusion, Recommendation, and Evidence Needed
forbidden_actions:
  - persist or mutate canonical runtime objects
  - convert an inference or unsupported conclusion into an established fact
  - treat a recommendation as an authorized decision
  - expand the response into a complete product diagnosis
workflow:
  - classify only claims present in the input
  - preserve uncertainty and attribution
  - identify evidence needed to test material conclusions
  - return a candidate for user review
quality_checks:
  - Reported Fact preserves who reported what
  - Inference remains explicitly inferential
  - Unsupported Conclusion is not presented as verified
  - Recommendation is not presented as authorized
  - Evidence Needed is specific enough to guide later validation
  - output remains candidate-only with no canonical mutation
test_fixtures:
  - 客户说产品不好用，所以产品定位失败，应该马上重做整个产品。
