import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface HacAgentGovernance {
  require_confirmation_for_writes: boolean;
  require_evidence_for_review: boolean;
  preserve_user_agency: boolean;
  explain_judgment_basis: boolean;
  audit_critical_transitions: boolean;
  prevent_unconfirmed_memory_write: boolean;
  source_path: string;
  raw_text: string;
}

export function loadHacAgentGovernance(projectRoot: string): HacAgentGovernance {
  const source_path = resolve(projectRoot, "HAC_AGENT.md");
  const raw_text = readFileSync(source_path, "utf8");
  return {
    require_confirmation_for_writes: true,
    require_evidence_for_review: true,
    preserve_user_agency: true,
    explain_judgment_basis: true,
    audit_critical_transitions: true,
    prevent_unconfirmed_memory_write: true,
    source_path,
    raw_text
  };
}
