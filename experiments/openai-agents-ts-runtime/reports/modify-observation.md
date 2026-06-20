# Modify Observation

Modify is observation-only in this spike and is not required as a native pass/fail capability.

Observed public extension shape:

1. The SDK exposes native approve/reject for a pending RunToolApprovalItem.
2. No public API was identified for mutating an existing pending tool call's arguments in place.
3. The thinnest correct implementation for HAC Modify should not patch SDK internals.

Candidate approaches:

- Reject the original tool call with a structured rejection message, then let the same run produce a new tool call with modified arguments.
- Have the HAC Harness create a new structured proposal outside the SDK pending item, then submit that proposal through a normal future user turn or controlled agent instruction.
- Keep original pending item immutable for auditability; treat the modified version as a new proposal with a distinct decision identity.

Do not:

- Edit serialized RunState internals to replace tool arguments.
- Patch the SDK.
- Claim native Modify support without a public API.
