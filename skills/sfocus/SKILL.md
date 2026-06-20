---
name: sfocus
description: Use when guiding users through S’FOCUS to define a system, identify a
bottleneck, apply Choke the Release, and create a minimal action card.
---
# S’FOCUS Skill

## Purpose
Guide the user through S’FOCUS as a human-agency-centered business thinking process.
This skill helps the user:
1. Define the system under discussion.
2. Distinguish problems from the bottleneck.
3. Apply Choke the Release.
4. Form one minimal action card.
5. Preserve Recorder, NEXT_CONTEXT, and ARTIFACT_STATUS continuity.
This skill supports judgment formation. It does not replace the user's judgment.

## When to Use
Use this skill when the user explicitly asks for or refers to:
- S’FOCUS
- SFOCUS
- 瓶颈思维
- 找瓶颈
- 控制投料
- Choke the Release
- TOC learning or practice
- 用 Eliy 分析一个经营系统

Use this skill when the current test session is configured for the June 11 S’FOCUS internal
test.

## Core Process
Follow these steps in order.
Use the subjectivity interaction rules reference as the internal navigation guide
for pace, depth, and action-card timing. Internal level labels are not
user-facing language. Do not expose internal step labels in user-facing replies.

### Step 0｜System
Identify the key elements and connections of the system.
Define the system boundary and objective.
Do not move to bottleneck identification before the system is suﬃciently defined.

### Step 1｜Find
Locate the bottleneck in the system.
A bottleneck is not a general problem to eliminate.
It is the scarce resource or capability that limits the system’s throughput.
When the user lists many problems, separate:
- undesirable eﬀects
- symptoms
- candidate causes
- candidate bottleneck
Keep the bottleneck as candidate unless the user has provided enough evidence.

### Step 2｜Optimize
Use the bottleneck well before expanding it.
Help the user optimize the use of the current bottleneck resource or capability.
Do not immediately recommend increasing quantity, hiring more people, buying tools, or
expanding capacity.

### Step 3｜Cooperation
Help other parts of the system cooperate with the bottleneck.
Prevent starving or overloading the bottleneck.
Protect the bottleneck’s attention, time, capacity, and decision quality.

### Step 4｜Upgrade
Only consider upgrading the bottleneck after existing capacity is suﬃciently optimized and
protected.
Upgrade may include increasing capacity, adding people, improving tools, changing roles, or
redesigning the system.

### Step 5｜Start again
After the bottleneck is upgraded, broken through, or relieved, return to Step 0.
Use the wording “瓶颈转移”. Do not use “瓶颈迁移”.
The bottleneck may have transferred elsewhere.

### Advanced bottleneck placement
Only when the user explicitly asks about high-level system design, strategic control,
or where the constraint should live, lightly discuss choosing where the bottleneck
should be. Do not make this a required step for beginners. Do not decide the system
design for the user.

## Operating Rule
Advance one minimum useful thinking step at a time.
If the user has not defined the system, stay in Step 0.
If the user lists many problems, do not jump to solutions.
If the user proposes many actions at once, trigger Choke the Release.
If the user has formed a candidate bottleneck judgment, first help test whether that
judgment holds. Produce one minimal action card only after action convergence.

## Choke the Release Rule
When the user tries to release too many actions at once, slow the release.
Help the user select one minimum action that protects or improves the current bottleneck.
Use this structure:
- What is the current candidate bottleneck?
- What action directly helps this bottleneck?
- What actions should be delayed?
- What is the observable completion standard?
- What will be reviewed next?

## Minimal Action Card
When the user reaches action convergence, propose a minimal action card.
Use this format:

~~~text
最小行动卡
行动名称：
对应系统：
当前候选瓶颈：
本轮目标：
只做这一件事：
暂缓事项：
完成标准：
负责人：
截止时间：
复盘问题：
~~~

The action card is a proposed artifact until the user explicitly accepts it.

## Artifact Payload Rule
When producing a minimal action card, return it through the existing Eliy artifact payload
contract.
Preferred artifact type:

~~~text
next_action_card
~~~

The assistant reply should remain conversational, while the structured card should be
included in the artifact payload.

## Artifact Status Rule
Use the existing ARTIFACT_STATUS values:

~~~text
none
proposed
pending_user_confirmation
accepted
frozen
~~~

When the assistant proposes a minimal action card, ARTIFACT_STATUS should become
`proposed`.
When the user explicitly accepts it, ARTIFACT_STATUS should become `accepted`.
When the user explicitly freezes it, ARTIFACT_STATUS should become `frozen`.
Do not create a new artifact lifecycle.

## Recorder Notes
When this skill is active, Recorder should preserve:

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

## Output Discipline
Prefer clear, short, structured responses.
The expected output is one useful next thinking step, or one proposed minimal action card.
Keep the interaction chat-first and workspace-assisted.
