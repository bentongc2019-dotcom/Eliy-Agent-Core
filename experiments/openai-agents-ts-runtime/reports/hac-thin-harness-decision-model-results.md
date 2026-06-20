# HAC Thin Harness Decision Model Results

Task: CP-HAC-THIN-HARNESS-DECISION-MODEL-SPIKE-01
Generated: 2026-06-15T23:20:15.399Z

## Golden Tests

| Test | Expected Mode | Actual Mode | Result | Runtime Behavior | Receipt | Evidence |
|---|---|---|---|---|---|---|
| Test A \| AUTONOMOUS | AUTONOMOUS | AUTONOMOUS | Passed | Executed one local no-side-effect mock action without human approval. | not_required/succeeded | 无需人工授权，summarize_complaint 已成功执行。整理完成：投诉事实包含交付延误、退款诉求和订单上下文。 |
| Test B \| PROPOSE | PROPOSE | PROPOSE | Passed | Presented structured human input requirement and stopped before execution. | pending/not_executed | Choose, revise, or reject the proposed option before any execution step. 该行动需要用户判断，当前仅提出候选方案，尚未执行。 |
| Test C \| AUTHORIZE | AUTHORIZE | AUTHORIZE | Passed | Approval required before execution; reject kept count 0; approve executed prepare_refund exactly once. | approved/succeeded | beforeApproval=0; afterReject=0; afterApprove=1; 用户已批准，prepare_refund 已成功执行。Mock refund prepared for 12.34: delayed delivery |
| Test D \| BLOCK | BLOCK | BLOCK | Passed | Blocked action without execution and without creating a normal approval request. | blocked/not_executed | 该行动已被阻止，未进入普通审批路径，也未执行。 Safe alternative: remove private customer data and reformulate. |

## Metamorphic Tests

| Test | Result | Evidence |
|---|---|---|
| Same actionType changes from no side effect to side effect | Passed | AUTONOMOUS -> AUTHORIZE |
| Different actionType with same facts returns same mode | Passed | alpha_action_name=PROPOSE; beta_action_name=PROPOSE |
| prohibited has precedence over all other flags | Passed | prohibited=true with all other flags true -> BLOCK |
