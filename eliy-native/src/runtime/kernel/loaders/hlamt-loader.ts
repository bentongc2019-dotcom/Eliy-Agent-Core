import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface HlamtContext {
  source_path: string;
  raw_text: string;
  hlamt_context_summary: string;
  used_hlamt_context: boolean;
}

export function loadHlamtContext(projectRoot: string): HlamtContext {
  const source_path = resolve(projectRoot, "HLAMT.md");
  const raw_text = readFileSync(source_path, "utf8");
  const lines = raw_text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));
  const hlamt_context_summary = lines.slice(0, 4).join(" ").slice(0, 280);

  return {
    source_path,
    raw_text,
    hlamt_context_summary,
    used_hlamt_context: true
  };
}
