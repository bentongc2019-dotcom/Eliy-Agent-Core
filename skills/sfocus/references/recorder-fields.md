# Recorder Fields for SFOCUS.skill

When SFOCUS.skill is active, Recorder should preserve the following fields where possible.

~~~text
CURRENT_SKILL: sfocus
CURRENT_STEP:
SYSTEM_UNDER_DISCUSSION:
SYSTEM_OBJECTIVE:
USER_STATED_PROBLEMS:
CANDIDATE_BOTTLENECK:
CHOKE_THE_RELEASE_SIGNAL:
MIN_ACTION_CARD_STATUS:
ARTIFACT_STATUS:
NEXT_CONTEXT:
~~~

## Field Definitions

### CURRENT_SKILL
Should be `sfocus` when this skill is active.

### CURRENT_STEP
One of:
~~~text
Step 0｜System
Step 1｜Find
Step 2｜Optimize
Step 3｜Cooperation
Step 4｜Upgrade
Step 5｜Start again
~~~

### SYSTEM_UNDER_DISCUSSION
The system currently being analyzed.

### SYSTEM_OBJECTIVE
The objective of the system.

### USER_STATED_PROBLEMS
Problems or undesirable eﬀects stated by the user.

### CANDIDATE_BOTTLENECK
The current candidate bottleneck.
Use candidate language unless the user explicitly confirms it.

### CHOKE_THE_RELEASE_SIGNAL
Record whether the assistant detected over-release or helped narrow actions.
Suggested values:
~~~text
none
detected
applied
~~~

### MIN_ACTION_CARD_STATUS
Suggested values:
~~~text
none
proposed
accepted
frozen
~~~

### ARTIFACT_STATUS
Use existing Runtime Guard values only:
~~~text
none
proposed
pending_user_confirmation
accepted
frozen
~~~

### NEXT_CONTEXT
Preserve the next useful context for the following round.
Do not summarize the whole conversation.
Preserve only what is needed to continue the next step.
