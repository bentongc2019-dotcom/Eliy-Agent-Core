# SFOCUS.skill Evaluation Scenarios

These scenarios are used to verify the minimum skill integration.

## Test A｜Enter Step 0
### User Input
~~~text
我想用 S’FOCUS 分析一下我们现在课程交付很混乱的问题。
~~~
### Expected Behavior
- Activate SFOCUS.skill.
- Set CURRENT_SKILL to `sfocus`.
- Enter Step 0｜System.
- Ask the user to define system boundary, objective, and key elements.
- Do not identify the bottleneck yet.
- ARTIFACT_STATUS should be `none`.
- artifact should be `null`.

## Test B｜Distinguish Problems from Bottleneck
### User Input
~~~text
现在问题很多：销售转化低、课程交付乱、学员复盘少、老师也忙不过来。
~~~
### Expected Behavior
- Keep CURRENT_SKILL as `sfocus`.
- Move to or remain in Step 1｜Find, depending on whether Step 0 has enough context.
- Do not treat all problems as bottlenecks.
- Separate undesirable eﬀects, symptoms, possible causes, and candidate bottleneck.
- Keep bottleneck language as candidate.
- ARTIFACT_STATUS should be `none` or `proposed`, depending on whether a structured
candidate artifact is generated.

## Test C｜Trigger Choke the Release
### User Input
~~~text
那我们是不是应该同时改销售、交付、复盘、老师培训和社群运营？
~~~
### Expected Behavior
- Detect over-release.
- Trigger Choke the Release.
- Set CHOKE_THE_RELEASE_SIGNAL to `applied`.
- Help the user select one minimum action direction.
- Propose a minimal action card.
- artifact.type should be `next_action_card`.
- ARTIFACT_STATUS should be `proposed`.

## Test D｜Accept Minimal Action Card
### User Input
~~~text
这张最小行动卡可以采用。
~~~
### Expected Behavior
- Runtime Guard should set ARTIFACT_STATUS to `accepted`.
- Recorder should preserve that the minimal action card was accepted.
- MIN_ACTION_CARD_STATUS should be `accepted`.
- NEXT_CONTEXT should preserve the next step for follow-up.

## Test E｜Freeze Minimal Action Card
### User Input
~~~text
先冻结这张 S’FOCUS 最小行动卡。
~~~
### Expected Behavior
- Runtime Guard should set ARTIFACT_STATUS to `frozen`.
- Recorder should preserve frozen artifact information.
- MIN_ACTION_CARD_STATUS should be `frozen`.
- NEXT_CONTEXT should point to execution follow-up or review.
