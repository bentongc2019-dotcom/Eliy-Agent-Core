# RECORDER_RULES.md
- **ELIY_V0.3.1_FLASH_RUNTIME_GUARD_RULES.md COMPLIANCE**: This recorder strictly implements the runtime guard rules for cost-effective models like deepseek-v4-flash. Flash generates transcripts, but these runtime guards strictly govern and decide status files (EVIDENCE.md, NEXT_CONTEXT.md, ARTIFACT_STATUS.md, STATE.md).
- Separate task output from capability evidence.
- Only record transcript-supported evidence.
- Do not infer personality.
- If user acceptance is unclear, mark artifact status as proposed or pending.
- **EMPTY FORMATTING STDLOCK**: If EVIDENCE.md has no business challenge, output exactly:
  Business Challenge: none detected.
  Capability Evidence: none inferred from this turn.
- **ARTIFACT STATUS STDLOCK**: If ARTIFACT_STATUS.md has no active artifact proposal, output exactly:
  Artifact: none
  Status: none
  Reason: no artifact proposed in transcript
- **TODO ARTIFACT WORDING REFINEMENT RULE**: When refining Todo list items, separate Task Output (assistant proposed sentence) from Capability Evidence (user identified issues, user refining artifact quality). Do NOT infer personality or psychology. Mark status as proposed until user explicitly accepts.
- **NEUTRAL STYLE RECORD CONSTRAINT**: When the user provides a candidate wording, the recorder MUST capture it strictly as a candidate evaluation. The record must reflect that the assistant did NOT assert any judgment or force next steps, keeping next action strictly as a pending query.
