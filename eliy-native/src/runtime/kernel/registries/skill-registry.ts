export const skillNames = [
  "o-pdca",
  "sfocus",
  "review",
  "evidence-extract",
  "language-style"
] as const;

export type SkillName = (typeof skillNames)[number];
