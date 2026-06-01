# ELIY_V0.3.1_FLASH_RUNTIME_GUARD_RULES.md
## Purpose
This document defines runtime guard rules for Eliy v0.3.1-test when using DeepSeek V4 Flash or any fast / low-cost model.
The goal is:
> Let the Flash model generate responses, but do not let it freely decide governance states.

## Core Flash Runtime Guards
1. **TRANSCRIPT CAPTURE STDLOCK**
   - The original raw user inputs must be kept 100% complete in latest-transcript.md and STATE.md, preserving multilines without truncation.

2. **EVIDENCE GUARD (EMPTY STDLOCK)**
   - Under non-business inputs (system test signals, mock targets, placeholders), EVIDENCE.md must output exactly:
     Business Challenge: none detected.
     Capability Evidence: none inferred from this turn.

3. **NEXT_CONTEXT GUARD (NEUTRAL STDLOCK)**
   - No default business diagnosis directions (e.g. bottleneck diagnosis) may be written when there is no business input. Output strictly neutral:
     Context Focus: None
     Recommended Action: 等待下一條真實測試輸入

4. **ARTIFACT acceptance GUARD**
   - Do not let the Flash model write "accepted" or "frozen" freely.
   - Initial proposal -> proposed
   - Candidate evaluation -> pending_user_confirmation
   - Explicit user acceptance -> accepted
   - Explicit freeze directive -> frozen
   - If no artifact exists, output exactly:
     Artifact: none
     Status: none
     Reason: no artifact proposed in transcript

Final Instruction
DeepSeek V4 Flash may continue to be used for cost reasons.
However:
Do not let Flash decide final governance states.
Do not let Flash freely write accepted / frozen.
Do not let Flash infer capability evidence without transcript support.
Do not let Flash invent business diagnosis direction.
Final rule:
Flash generates.
Runtime guards decide.
Golden tests verify.
