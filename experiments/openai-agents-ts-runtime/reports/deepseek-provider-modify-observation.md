# DeepSeek Provider Modify Observation

Pending tool arguments are readable through RunToolApprovalItem.arguments.

Public in-place mutation of pending tool arguments: Not identified.

Thin correct path remains:

1. Reject the original Tool Call using RunState.reject().
2. Have HAC Harness form a new structured Proposal.
3. Let Runtime/model produce a new Tool Call with a new decision identity.

Patch / Fork / private API required: No for the reject-and-new-proposal path; yes would be required to mutate SDK serialized interruption internals, which this spike does not do.
