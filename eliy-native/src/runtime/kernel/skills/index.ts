import type { HlamtContext } from "../loaders/hlamt-loader.js";

type SkillOutputKind = "candidate" | "draft" | "proposal" | "question" | "judgment";

export type SkillRunInput = {
  skill_name: string;
  input_summary: string;
  hlamt_context: HlamtContext;
};

export type SkillRunOutput = {
  output_kind: SkillOutputKind;
  text: string;
  used_hlamt_context: boolean;
};

export function runDeterministicSkill(input: SkillRunInput): SkillRunOutput {
  const prefix = input.hlamt_context.hlamt_context_summary ? `[HLAMT] ${input.hlamt_context.hlamt_context_summary}` : "[HLAMT]";
  switch (input.skill_name) {
    case "evidence-extract":
      return {
        output_kind: "candidate",
        text: `${prefix} Evidence candidate: ${input.input_summary}`,
        used_hlamt_context: true
      };
    case "review":
      return {
        output_kind: "draft",
        text: `${prefix} Review draft: expected/actual/gap/reason/adjustment derived from evidence.`,
        used_hlamt_context: true
      };
    case "o-pdca":
      return {
        output_kind: "proposal",
        text: `${prefix} Objective task proposal derived from objective and evidence.`,
        used_hlamt_context: true
      };
    case "sfocus":
      return {
        output_kind: "judgment",
        text: `${prefix} Focus judgment stub for the current operating loop.`,
        used_hlamt_context: true
      };
    case "language-style":
    default:
      return {
        output_kind: "question",
        text: `${prefix} Style guidance stub with concise business-facing wording.`,
        used_hlamt_context: true
      };
  }
}
