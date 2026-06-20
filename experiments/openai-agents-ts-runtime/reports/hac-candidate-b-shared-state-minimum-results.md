# Candidate B Shared State Minimum Results

- B-GT-01｜Single Source of Operational Truth: Passed — Agent snapshot and workspace projection both derive from OperationalState; mutating projection did not mutate source.
- B-GT-02｜Optimistic Version Check: Passed — Correct expectedVersion incremented version by one; stale expectedVersion was rejected without mutation.
- B-GT-03｜Fact Correction: Passed — Human correction updated the identified fact, recorded transition metadata, and next snapshot used corrected value.
- B-GT-04｜Assumption Separation: Passed — Agent-added content remained in assumptions through save, load, and snapshot generation.
- B-GT-05｜Evidence-linked Transition: Passed — Tool-result transition without evidence was rejected; evidence-linked Action Receipt applied and remained traceable.
- B-GT-06｜Resume Fidelity: Passed — Saved and reloaded Operational State preserved loopId, version, facts, assumptions, receipts, and snapshot version.
- B-GT-07｜No Parallel UI Truth: Passed — Workspace projection has no save path; projection mutation did not alter source and re-projection restored authoritative status/version.
- B-GT-08｜Idempotent Receipt Application: Passed — Duplicate receipt returned no-op, did not append, and did not increment version.
